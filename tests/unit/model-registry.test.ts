import { describe, expect, test } from "vitest";

import { ConfigurationError, getModelRegistry } from "@/lib/ai/model-registry";

const validEnvironment = {
  AI_GATEWAY_API_KEY: "test-gateway-key",
  PLANNING_MODEL: "openai/gpt-5.4",
  EXTRACTION_MODEL: "openai/gpt-5.4-mini",
  INTERPRETATION_MODEL: "openai/gpt-5.4",
  VERIFICATION_MODEL: "openai/gpt-5.4-mini",
};

describe("model registry", () => {
  test("loads all approved roles from environment-backed configuration", () => {
    const registry = getModelRegistry(validEnvironment);

    expect(registry.planning).toBe("openai/gpt-5.4");
    expect(registry.verification).toBe("openai/gpt-5.4-mini");
    expect(registry.gatewayCredential).toBe("test-gateway-key");
  });

  test("rejects missing gateway credentials and model roles", () => {
    expect(() => getModelRegistry({})).toThrow(ConfigurationError);
    expect(() => getModelRegistry({ AI_GATEWAY_API_KEY: "test-key" })).toThrow(
      /PLANNING_MODEL/,
    );
  });

  test("accepts a Vercel OIDC token when an API key is not present", () => {
    const registry = getModelRegistry({
      ...validEnvironment,
      AI_GATEWAY_API_KEY: undefined,
      VERCEL_OIDC_TOKEN: "test-oidc-token",
    });

    expect(registry.gatewayCredential).toBe("test-oidc-token");
  });
});
