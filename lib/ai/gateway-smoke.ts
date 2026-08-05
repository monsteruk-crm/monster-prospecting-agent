import { HumanMessage } from "@langchain/core/messages";
import { getModelRegistry } from "@/lib/ai/model-registry";
import { createConfiguredChatModel } from "@/lib/ai/model-factory";
import { invokeWithUsage } from "@/lib/ai/usage-ledger";
import { SmokeResultSchema, type SmokeResult } from "@/lib/ai/smoke-result";

export async function runGatewaySmoke(): Promise<SmokeResult> {
  const registry = getModelRegistry();
  const model = createConfiguredChatModel({ role: "planning", modelId: registry.planning, temperature: 0 }).withStructuredOutput(SmokeResultSchema, {
    name: "monster_scout_bootstrap_smoke",
    strict: true,
  });

  const result = await invokeWithUsage({
    invoke: () => model.invoke([
      new HumanMessage(
        "Return a concise bootstrap smoke result for MONSTER SCOUT. The missionTitle should be exactly 'Next Monster deal' and status must be 'ready'.",
      ),
    ], {
      runName: "monster-scout-bootstrap-smoke",
      tags: ["monster-scout", "bootstrap", "smoke"],
      metadata: {
        product: "monster-scout-sales-hunter",
        milestone: "act-0",
        purpose: "ai-gateway-connectivity",
      },
    }),
    idempotencyKey: `smoke:${Date.now()}`,
    operation: "GATEWAY_SMOKE",
    modelRole: "planning",
    modelId: registry.planning,
  });

  return SmokeResultSchema.parse(result);
}
