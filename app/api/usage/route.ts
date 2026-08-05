import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/db/client";
import { getGatewayUsage } from "@/lib/ai/gateway-usage";

export const runtime = "nodejs";

function dateFrom(value: string | null, fallback: Date) { const date = value ? new Date(value) : fallback; return Number.isNaN(date.getTime()) ? fallback : date; }

export async function GET(request: Request) {
  const url = new URL(request.url); const now = new Date(); const from = dateFrom(url.searchParams.get("from"), new Date(now.getTime() - 30 * 86_400_000)); const db = getPrismaClient();
  const [events, gateway] = await Promise.all([
    db.aiUsageEvent.findMany({ where: { createdAt: { gte: from, lte: now } }, orderBy: { createdAt: "desc" }, take: 500, select: { id: true, missionRunId: true, operation: true, modelRole: true, modelId: true, status: true, inputTokens: true, outputTokens: true, totalTokens: true, reportedCostUsd: true, estimatedCostUsd: true, costSource: true, latencyMs: true, traceId: true, createdAt: true } }),
    getGatewayUsage(from, now),
  ]);
  const total = (field: "reportedCostUsd" | "estimatedCostUsd") => events.reduce((sum, event) => sum + Number(event[field] ?? 0), 0);
  return NextResponse.json({ from: from.toISOString(), to: now.toISOString(), gateway, summary: { calls: events.length, successfulCalls: events.filter((event) => event.status === "SUCCEEDED").length, tokens: events.reduce((sum, event) => sum + (event.totalTokens ?? 0), 0), reportedCostUsd: total("reportedCostUsd"), estimatedCostUsd: total("estimatedCostUsd"), unknownCostCalls: events.filter((event) => event.costSource === "UNKNOWN").length }, events: events.map((event) => ({ ...event, reportedCostUsd: event.reportedCostUsd?.toString() ?? null, estimatedCostUsd: event.estimatedCostUsd?.toString() ?? null, createdAt: event.createdAt.toISOString() })), });
}
