import { HumanMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";

import { getModelRegistry } from "@/lib/ai/model-registry";
import { SmokeResultSchema, type SmokeResult } from "@/lib/ai/smoke-result";

export async function runGatewaySmoke(): Promise<SmokeResult> {
  const registry = getModelRegistry();
  const model = new ChatOpenAI({
    apiKey: registry.gatewayCredential,
    model: registry.planning,
    temperature: 0,
    configuration: {
      baseURL: registry.gatewayBaseUrl,
    },
  }).withStructuredOutput(SmokeResultSchema, {
    name: "monster_scout_bootstrap_smoke",
    strict: true,
  });

  const result = await model.invoke(
    [
      new HumanMessage(
        "Return a concise bootstrap smoke result for MONSTER SCOUT. The missionTitle should be exactly 'Next Monster deal' and status must be 'ready'.",
      ),
    ],
    {
      runName: "monster-scout-bootstrap-smoke",
      tags: ["monster-scout", "bootstrap", "smoke"],
      metadata: {
        product: "monster-scout-sales-hunter",
        milestone: "act-0",
        purpose: "ai-gateway-connectivity",
      },
    },
  );

  return SmokeResultSchema.parse(result);
}
