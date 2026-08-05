import { randomUUID } from "node:crypto";
import { getPrismaClient } from "@/lib/db/client";
import { Prisma } from "@/prisma/generated/client";

export type AiUsageRecord = {
  idempotencyKey: string;
  missionId?: string;
  missionRunId?: string;
  accountId?: string;
  operation: string;
  modelRole: string;
  modelId: string;
  status: "SUCCEEDED" | "FAILED";
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  estimatedCostUsd?: number;
  costSource: "GATEWAY_REPORTED" | "TOKEN_ESTIMATE" | "CALL_ESTIMATE" | "UNKNOWN";
  latencyMs: number;
  errorCode?: string;
  metadata?: Record<string, unknown>;
  startedAt: Date;
  completedAt: Date;
};

function tokenUsage(result: unknown) {
  if (!result || typeof result !== "object") return {};
  const record = result as Record<string, unknown>;
  const responseMetadata = typeof record.response_metadata === "object" && record.response_metadata !== null ? record.response_metadata as Record<string, unknown> : undefined;
  const usage = record.usage_metadata ?? responseMetadata?.token_usage;
  if (!usage || typeof usage !== "object") return {};
  const values = usage as Record<string, unknown>;
  const inputTokens = typeof values.input_tokens === "number" ? values.input_tokens : typeof values.prompt_tokens === "number" ? values.prompt_tokens : undefined;
  const outputTokens = typeof values.output_tokens === "number" ? values.output_tokens : typeof values.completion_tokens === "number" ? values.completion_tokens : undefined;
  const totalTokens = typeof values.total_tokens === "number" ? values.total_tokens : inputTokens !== undefined && outputTokens !== undefined ? inputTokens + outputTokens : undefined;
  return { inputTokens, outputTokens, totalTokens };
}

export function extractTokenUsage(result: unknown) {
  return tokenUsage(result);
}

export async function recordAiUsage(record: AiUsageRecord): Promise<void> {
  try {
    const db = getPrismaClient();
    await db.aiUsageEvent.upsert({
      where: { idempotencyKey: record.idempotencyKey },
      create: {
        id: randomUUID(), idempotencyKey: record.idempotencyKey, missionId: record.missionId, missionRunId: record.missionRunId, accountId: record.accountId,
        operation: record.operation, modelRole: record.modelRole, modelId: record.modelId, status: record.status, inputTokens: record.inputTokens, outputTokens: record.outputTokens, totalTokens: record.totalTokens,
        estimatedCostUsd: record.estimatedCostUsd, costSource: record.costSource, latencyMs: record.latencyMs, errorCode: record.errorCode, metadata: record.metadata ? JSON.parse(JSON.stringify(record.metadata)) as Prisma.InputJsonValue : undefined, startedAt: record.startedAt, completedAt: record.completedAt,
      },
      update: { status: record.status, inputTokens: record.inputTokens, outputTokens: record.outputTokens, totalTokens: record.totalTokens, latencyMs: record.latencyMs, errorCode: record.errorCode, completedAt: record.completedAt },
    });
  } catch {
    // Usage observability must not make a successful research call fail.
  }
}

export async function invokeWithUsage<T>(input: {
  invoke: () => Promise<T>;
  idempotencyKey: string;
  missionRunId?: string;
  accountId?: string;
  operation: string;
  modelRole: string;
  modelId: string;
}): Promise<T> {
  const startedAt = new Date();
  try {
    const result = await input.invoke();
    const completedAt = new Date();
    const usage = extractTokenUsage(result);
    await recordAiUsage({ ...input, status: "SUCCEEDED", ...usage, costSource: usage.totalTokens === undefined ? "UNKNOWN" : "TOKEN_ESTIMATE", latencyMs: completedAt.getTime() - startedAt.getTime(), startedAt, completedAt });
    return result;
  } catch (error) {
    const completedAt = new Date();
    await recordAiUsage({ ...input, status: "FAILED", costSource: "UNKNOWN", latencyMs: completedAt.getTime() - startedAt.getTime(), errorCode: error instanceof Error ? error.name : "MODEL_CALL_FAILED", startedAt, completedAt });
    throw error;
  }
}
