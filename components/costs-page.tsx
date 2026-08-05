"use client";

import { useEffect, useState } from "react";

type GatewayRow = Record<string, unknown>;
type Usage = {
  gateway: { available: boolean; balanceUsd: number | null; lifetimeSpendUsd: number | null; results: GatewayRow[]; error?: string };
  summary: { calls: number; successfulCalls: number; tokens: number; reportedCostUsd: number; estimatedCostUsd: number; unknownCostCalls: number };
  events: Array<{ id: string; missionRunId: string | null; operation: string; modelRole: string; modelId: string; status: string; inputTokens: number | null; outputTokens: number | null; latencyMs: number | null; costSource: string; createdAt: string }>;
};

function metric(row: GatewayRow, key: string): number {
  const value = row[key];
  return typeof value === "number" ? value : Number(value ?? 0);
}

export function CostsPage() {
  const [usage, setUsage] = useState<Usage | null>(null);
  const [range, setRange] = useState("30");
  const [error, setError] = useState("");
  useEffect(() => {
    const from = new Date(Date.now() - Number(range) * 86_400_000).toISOString();
    void fetch("/api/usage?from=" + encodeURIComponent(from), { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json() as Usage & { error?: { message?: string } };
        if (!response.ok) throw new Error(payload.error?.message ?? "Usage could not be loaded.");
        return payload;
      })
      .then(setUsage)
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Usage could not be loaded."));
  }, [range]);
  if (error) return <section><h1 className="text-4xl font-black">Costs & Usage</h1><p className="mt-3 text-[#ffb0b0]" role="alert">{error}</p></section>;
  if (!usage) return <section><h1 className="text-4xl font-black">Costs & Usage</h1><p className="mt-3 text-white/50">Loading Vercel AI Gateway usage…</p></section>;
  const gatewayRows = usage.gateway.results;
  const gatewaySpend = gatewayRows.reduce((sum, row) => sum + metric(row, "total_cost"), 0);
  const cards: Array<[string, string | number]> = [
    ["Gateway spend", "$" + gatewaySpend.toFixed(4)],
    ["Gateway balance", usage.gateway.balanceUsd === null ? "Unavailable" : "$" + usage.gateway.balanceUsd.toFixed(2)],
    ["Local model calls", usage.summary.calls],
    ["Local tokens", usage.summary.tokens],
    ["Unknown local costs", usage.summary.unknownCostCalls],
  ];
  return <section>
    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#f5c542]">Governance</p>
    <h1 className="mt-2 text-4xl font-black">Costs & Usage</h1>
    <p className="mt-3 max-w-3xl text-sm leading-6 text-white/50">Charged spend comes from Vercel AI Gateway. The local ledger remains useful for mission/run attribution and call diagnostics.</p>
    <div className="mt-6 flex gap-2" role="group" aria-label="Usage range">{["1", "7", "30"].map((days) => <button key={days} onClick={() => setRange(days)} className={"rounded-full px-4 py-2 text-sm " + (range === days ? "bg-[#f5c542] text-black" : "border border-white/15 text-white/60")}>{days === "1" ? "Today" : days + " days"}</button>)}</div>
    <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{cards.map(([label, value]) => <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><p className="text-xs uppercase tracking-[0.14em] text-white/40">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></div>)}</div>
    <p className="mt-6 text-sm text-white/50">Gateway lifetime spend: ${usage.gateway.lifetimeSpendUsd === null ? "unavailable" : "$" + usage.gateway.lifetimeSpendUsd.toFixed(4)}. Local reported: {"$"}{usage.summary.reportedCostUsd.toFixed(4)} · local estimated: {"$"}{usage.summary.estimatedCostUsd.toFixed(4)}.</p>
    {!usage.gateway.available ? <p className="mt-3 rounded-xl border border-[#f5c542]/25 bg-[#f5c542]/10 p-3 text-sm text-[#ffe39a]">Gateway reporting unavailable: ${usage.gateway.error ?? "check credentials, plan access, or reporting delay."}</p> : null}
    <div className="mt-8 overflow-x-auto rounded-2xl border border-white/10"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-white/[0.04] text-xs uppercase tracking-[0.12em] text-white/45"><tr><th className="p-4">Gateway bucket</th><th className="p-4">Requests</th><th className="p-4">Cost</th><th className="p-4">Tokens</th></tr></thead><tbody>{gatewayRows.map((row, index) => <tr key={String(row.day ?? row.model ?? row.provider ?? index)} className="border-t border-white/10"><td className="p-4">{String(row.day ?? row.model ?? row.provider ?? "Total")}</td><td className="p-4">{metric(row, "request_count")}</td><td className="p-4">{"$"}{metric(row, "total_cost").toFixed(4)}</td><td className="p-4">{metric(row, "input_tokens")} / {metric(row, "output_tokens")}</td></tr>)}</tbody></table>{gatewayRows.length === 0 ? <p className="p-8 text-white/45">No Vercel Gateway report rows for this period. Reporting can take a few minutes to ingest a request.</p> : null}</div>
    <div className="mt-8 overflow-x-auto rounded-2xl border border-white/10"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-white/[0.04] text-xs uppercase tracking-[0.12em] text-white/45"><tr><th className="p-4">Time</th><th className="p-4">Operation</th><th className="p-4">Role / model</th><th className="p-4">Status</th><th className="p-4">Tokens</th><th className="p-4">Cost source</th><th className="p-4">Latency</th></tr></thead><tbody>{usage.events.map((event) => <tr key={event.id} className="border-t border-white/10"><td className="p-4 text-white/50">{new Date(event.createdAt).toLocaleString()}</td><td className="p-4">{event.operation}</td><td className="p-4 text-white/65">{event.modelRole}<br /><span className="font-mono text-xs text-white/40">{event.modelId}</span></td><td className="p-4">{event.status}</td><td className="p-4">{event.inputTokens ?? "?"} / {event.outputTokens ?? "?"}</td><td className="p-4 text-white/60">{event.costSource}</td><td className="p-4">{event.latencyMs ?? "?"}ms</td></tr>)}</tbody></table>{usage.events.length === 0 ? <p className="p-8 text-white/45">No local model usage recorded for this period.</p> : null}</div>
  </section>;
}
