import { z } from "zod";

const requiredModel = z.string().trim().min(1);

const modelRegistrySchema = z
  .object({
    gatewayBaseUrl: z.url(),
    apiKey: z.string().trim().min(1).optional(),
    oidcToken: z.string().trim().min(1).optional(),
    planning: requiredModel,
    extraction: requiredModel,
    interpretation: requiredModel,
    verification: requiredModel,
  })
  .superRefine((config, context) => {
    if (!config.apiKey && !config.oidcToken) {
      context.addIssue({
        code: "custom",
        path: ["AI_GATEWAY_API_KEY"],
        message: "Set AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN.",
      });
    }
  });

export type ModelRegistry = z.infer<typeof modelRegistrySchema> & {
  gatewayCredential: string;
};

export class ConfigurationError extends Error {
  readonly code = "CONFIGURATION_ERROR";

  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

export function getModelRegistry(env: Record<string, string | undefined> = process.env): ModelRegistry {
  const parsed = modelRegistrySchema.safeParse({
    gatewayBaseUrl: env.AI_GATEWAY_BASE_URL ?? "https://ai-gateway.vercel.sh/v1",
    apiKey: env.AI_GATEWAY_API_KEY,
    oidcToken: env.VERCEL_OIDC_TOKEN,
    planning: env.PLANNING_MODEL,
    extraction: env.EXTRACTION_MODEL,
    interpretation: env.INTERPRETATION_MODEL,
    verification: env.VERIFICATION_MODEL,
  });

  if (!parsed.success) {
    const environmentNames: Record<string, string> = {
      planning: "PLANNING_MODEL",
      extraction: "EXTRACTION_MODEL",
      interpretation: "INTERPRETATION_MODEL",
      verification: "VERIFICATION_MODEL",
      gatewayBaseUrl: "AI_GATEWAY_BASE_URL",
    };
    const fields = parsed.error.issues
      .map((issue) => {
        const field = issue.path.join(".") || "configuration";
        return environmentNames[field] ?? field;
      })
      .filter((field, index, all) => all.indexOf(field) === index)
      .join(", ");
    throw new ConfigurationError(`AI configuration is incomplete. Check: ${fields}.`);
  }

  return {
    ...parsed.data,
    gatewayCredential: parsed.data.apiKey ?? parsed.data.oidcToken!,
  };
}

export const ModelRegistrySchema = modelRegistrySchema;
