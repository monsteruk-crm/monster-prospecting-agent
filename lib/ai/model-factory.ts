import { ChatOpenAI } from "@langchain/openai";
import { getModelRegistry } from "@/lib/ai/model-registry";

export type ModelRole = "planning" | "extraction" | "interpretation" | "verification";

export function createConfiguredChatModel(input: { role: ModelRole; modelId?: string; temperature?: number }) {
  const registry = getModelRegistry();
  const modelId = input.modelId ?? registry[input.role];
  return new ChatOpenAI({
    apiKey: registry.gatewayCredential,
    model: modelId,
    temperature: input.temperature ?? 0,
    configuration: {
      baseURL: registry.gatewayBaseUrl,
      defaultHeaders: { "ai-reporting-tags": "app:monster-scout,feature:prospecting" },
    },
  });
}
