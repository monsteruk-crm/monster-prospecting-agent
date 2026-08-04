import { describe, expect, test } from "vitest";

import { ConfigurationError, getModelRegistry } from "@/lib/ai/model-registry";

describe("missing configuration behaviour", () => {
  test("returns a typed, actionable configuration error", () => {
    try {
      getModelRegistry({});
      throw new Error("expected configuration validation to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigurationError);
      expect((error as ConfigurationError).message).toContain("AI configuration is incomplete");
      expect((error as ConfigurationError).message).not.toContain("undefined");
    }
  });
});
