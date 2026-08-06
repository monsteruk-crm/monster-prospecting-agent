"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Run = { id: string; status: string; discoveryStage: string; startedAt: string; mission: { name: string; owner: string }; review: { status: string } | null };
type Account = { companyName: string; country: string | null; relevanceHypothesis: string; score: { total: number } | null };
type ActiveDossier = { status: string; discoveryStage: string; auditEvents?: Array<{ payload: unknown; occurredAt: string }> };

const runStageOrder = ["TARGET_PROFILE", "SEARCH_STRATEGY", "SEARCH_PROVIDER", "OFFICIAL_SOURCE_FETCH", "ACCOUNT_EXTRACTION", "BUYING_SIGNAL_VERIFICATION", "CONTACT", "SCORE_RECALCULATION", "READY_FOR_REVIEW"];

function progressFor(dossier: ActiveDossier | null): number {
  if (!dossier) return 8;
  if (dossier.status !== "RUNNING") return 100;
  const index = runStageOrder.findIndex((stage) => dossier.discoveryStage.includes(stage));
  return Math.min(96, Math.max(8, Math.round(((index < 0 ? 0 : index + 1) / runStageOrder.length) * 100)));
}

export function ScoutHome() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeDossier, setActiveDossier] = useState<ActiveDossier | null>(null);
  useEffect(() => {
    let stopped = false;
    const load = async () => {
      try {
        const response = await fetch("/api/runs?limit=5", { cache: "no-store" });
        const data = await response.json() as { runs?: Run[] };
        const next = data.runs ?? [];
        if (stopped) return;
        setRuns(next);
        const dossiers = await Promise.all(next.slice(0, 3).map((run) => fetch(`/api/runs/${encodeURIComponent(run.id)}`, { cache: "no-store" }).then((r) => r.ok ? r.json() as Promise<{ accounts?: Account[] }> : null).catch(() => null)));
        if (!stopped) setAccounts(dossiers.flatMap((dossier) => dossier?.accounts ?? []).slice(0, 4));
        const activeRun = next.find((run) => run.status === "RUNNING");
        if (activeRun) {
          const response = await fetch(`/api/runs/${encodeURIComponent(activeRun.id)}`, { cache: "no-store" });
          if (!stopped && response.ok) setActiveDossier(await response.json() as ActiveDossier);
        } else if (!stopped) setActiveDossier(null);
      } catch { /* The empty state remains useful when persistence is unavailable. */ }
    };
    void load();
    const interval = window.setInterval(() => void load(), 2000);
    return () => { stopped = true; window.clearInterval(interval); };
  }, []);
  const active = runs.find((run) => run.status === "RUNNING");
  const progress = progressFor(activeDossier);
  const latestEvent = activeDossier?.auditEvents?.at(-1)?.payload as { message?: string } | undefined;
  return <div className="mx-auto max-w-6xl">
    <header className="flex flex-col gap-5 border-b border-white/10 pb-8 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">Scout desk</p><h1 className="mt-3 text-4xl font-black tracking-[-0.06em] sm:text-6xl">Where should Scout hunt next?</h1><p className="mt-4 max-w-xl text-base leading-7 text-white/55">Find credible organisations, understand why they matter, and prepare the first move.</p></div><Link href="/missions/new" className="primary-button">New mission</Link></header>
    {active ? <section className="major-surface mt-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow text-[#36d399]">Research in progress</p><h2 className="mt-2 text-2xl font-bold">{active.mission.name}</h2><p className="mt-2 text-sm text-white/55">{activeDossier?.discoveryStage ?? active.discoveryStage} · {active.mission.owner}</p></div><Link href={`/runs/${active.id}`} className="secondary-button">Open mission</Link></div><div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#36d399] transition-[width] duration-500" style={{ width: `${progress}%` }} /></div><p className="mt-3 text-sm text-white/55">{latestEvent?.message ?? "Scout is finding accounts and checking public evidence."} · {progress}%</p></section> : <section className="major-surface mt-8"><p className="eyebrow">Start a hunt</p><h2 className="mt-3 text-2xl font-bold">Build a focused shortlist.</h2><div className="mt-6 flex flex-wrap gap-2 text-sm"><span className="tag">Territory-led</span><span className="tag">Evidence-backed</span><span className="tag">Human reviewed</span></div><Link href="/missions/new" className="primary-button mt-7">Configure a mission</Link></section>}
    <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]"><section><div className="flex items-center justify-between"><h2 className="section-title">Recent prospects</h2><Link href="/runs" className="text-sm text-[#f5c542]">View runs</Link></div>{accounts.length ? <div className="mt-4 space-y-3">{accounts.map((account, index) => <div key={`${account.companyName}-${index}`} className="soft-row"><div><p className="font-bold">{account.companyName}</p><p className="mt-1 line-clamp-1 text-sm text-white/50">{account.relevanceHypothesis}</p><p className="mt-2 text-xs text-white/40">{account.country ?? "Location unknown"} · {account.score?.total ?? "—"} score</p></div><span className="status status-green">Found</span></div>)}</div> : <div className="empty-state mt-4"><p>No missions yet.</p><p className="mt-1 text-sm text-white/50">Define a market and Scout will start building your first shortlist.</p></div>}</section><section><div className="flex items-center justify-between"><h2 className="section-title">Recent missions</h2><Link href="/runs" className="text-sm text-[#f5c542]">View all</Link></div>{runs.length ? <div className="mt-4 space-y-3">{runs.map((run) => <Link key={run.id} href={`/runs/${run.id}`} className="soft-row block"><div><p className="font-bold">{run.mission.name}</p><p className="mt-1 text-sm text-white/45">{new Date(run.startedAt).toLocaleDateString()} · {run.discoveryStage}</p></div><span className="status">{run.review?.status ?? run.status}</span></Link>)}</div> : <div className="empty-state mt-4">Your completed hunts will appear here.</div>}</section></div>
  </div>;
}
