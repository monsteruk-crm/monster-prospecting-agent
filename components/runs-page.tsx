"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Run = {
  id: string;
  status: string;
  discoveryStage: string;
  startedAt: Date;
  completedAt: Date | null;
  mission: { name: string; owner: string };
  review: { status: string } | null;
};

export function RunsPage({ runs: initialRuns }: { runs: Run[] }) {
  const [runs, setRuns] = useState(initialRuns);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const allSelected = runs.length > 0 && selected.size === runs.length;
  const selectedIds = useMemo(() => [...selected], [selected]);

  const toggle = (id: string) => setSelected((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(runs.map((run) => run.id)));

  const deleteSelected = async () => {
    if (selectedIds.length === 0 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/runs", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ ids: selectedIds }) });
      const payload = await response.json() as { deletedIds?: string[]; error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? "The selected runs could not be deleted.");
      const deleted = new Set(payload.deletedIds ?? selectedIds);
      setRuns((current) => current.filter((run) => !deleted.has(run.id)));
      setSelected(new Set());
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "The selected runs could not be deleted.");
    } finally {
      setBusy(false);
    }
  };

  return <section className="mx-auto max-w-6xl">
    <header className="page-heading"><div><p className="eyebrow">Mission history</p><h1>Your hunts.</h1><p>Reopen a mission to inspect evidence, review prospects, or continue research.</p></div><Link href="/missions/new" className="primary-button">New mission</Link></header>
    {runs.length > 0 ? <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3"><label className="flex items-center gap-3 text-sm text-white/70"><input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all runs" />Select all</label><div className="flex items-center gap-3"><span className="text-sm text-white/45">{selected.size} selected</span><button type="button" onClick={deleteSelected} disabled={selected.size === 0 || busy} className="rounded-full border border-[#ff8f8f]/40 px-4 py-2 text-sm font-semibold text-[#ffb0b0] disabled:cursor-not-allowed disabled:opacity-40">{busy ? "Deleting…" : "Delete selected"}</button></div></div> : null}
    {error ? <p className="mt-3 text-sm text-[#ffb0b0]" role="alert">{error}</p> : null}
    <div className="mt-3 space-y-3">{runs.map((run) => <div key={run.id} className="major-surface flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><input type="checkbox" checked={selected.has(run.id)} onChange={() => toggle(run.id)} aria-label={`Select ${run.mission.name}`} className="mt-1" /><div><p className="text-xl font-bold">{run.mission.name}</p><p className="mt-1 text-sm text-white/45">{run.mission.owner} · {new Date(run.startedAt).toLocaleDateString()} · {run.discoveryStage}</p></div></div><div className="flex items-center gap-3"><span className="status">{run.review?.status ?? run.status}</span><Link href={`/runs/${run.id}`} className="text-sm text-[#f5c542]">Open →</Link></div></div>)}{runs.length === 0 ? <div className="empty-state"><p>No missions yet.</p><p className="mt-1 text-sm text-white/50">Define a market and Scout will start building your first shortlist.</p></div> : null}</div>
  </section>;
}
