import { getModelRegistry } from "@/lib/ai/model-registry";

type JsonRecord = Record<string, unknown>;

export type GatewayUsage = {
  available: boolean;
  source: "VERCEL_AI_GATEWAY" | "UNAVAILABLE";
  balanceUsd: number | null;
  lifetimeSpendUsd: number | null;
  results: Array<JsonRecord>;
  error?: string;
};

function numberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function dateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

async function gatewayGet(path: string, credential: string, baseUrl: string): Promise<JsonRecord> {
  const response = await fetch(baseUrl.replace(/\/$/, "") + path, {
    headers: { Authorization: "Bearer " + credential, "content-type": "application/json" },
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  const body = await response.json() as unknown;
  if (!response.ok) throw new Error("AI Gateway returned HTTP " + response.status + ".");
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("AI Gateway returned an invalid usage response.");
  return body as JsonRecord;
}

export async function getGatewayUsage(from: Date, to: Date, groupBy = "day"): Promise<GatewayUsage> {
  try {
    const registry = getModelRegistry();
    const baseUrl = registry.gatewayBaseUrl.replace(/\/v1\/?$/, "");
    const reportPath = "/v1/report?start_date=" + encodeURIComponent(dateOnly(from)) + "&end_date=" + encodeURIComponent(dateOnly(to)) + "&group_by=" + encodeURIComponent(groupBy) + "&tags=" + encodeURIComponent("app:monster-scout");
    const [creditsResult, reportResult] = await Promise.allSettled([
      gatewayGet("/v1/credits", registry.gatewayCredential, baseUrl),
      gatewayGet(reportPath, registry.gatewayCredential, baseUrl),
    ]);
    const credits = creditsResult.status === "fulfilled" ? creditsResult.value : {};
    const report = reportResult.status === "fulfilled" ? reportResult.value : {};
    const rawResults = Array.isArray(report.results) ? report.results : [];
    const errors = [creditsResult, reportResult]
      .filter((result): result is PromiseRejectedResult => result.status === "rejected")
      .map((result) => result.reason instanceof Error ? result.reason.message : "Gateway usage request failed.");
    return {
      available: creditsResult.status === "fulfilled" || reportResult.status === "fulfilled",
      source: creditsResult.status === "fulfilled" || reportResult.status === "fulfilled" ? "VERCEL_AI_GATEWAY" : "UNAVAILABLE",
      balanceUsd: numberValue(credits.balance),
      lifetimeSpendUsd: numberValue(credits.total_used),
      results: rawResults.filter((row): row is JsonRecord => Boolean(row) && typeof row === "object" && !Array.isArray(row)),
      error: errors.length > 0 ? errors.join(" ") : undefined,
    };
  } catch (error) {
    return {
      available: false,
      source: "UNAVAILABLE",
      balanceUsd: null,
      lifetimeSpendUsd: null,
      results: [],
      error: error instanceof Error ? error.message : "AI Gateway usage is unavailable.",
    };
  }
}
