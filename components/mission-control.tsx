"use client";

import { useState, type FormEvent } from "react";

type SmokeResponse = { missionTitle?: string; status?: "ready"; error?: { code: string; message: string } };
type DossierAccount = {
  id: string;
  companyName: string;
  officialDomain: string | null;
  website: string | null;
  country: string | null;
  city: string | null;
  categories: string[];
  relevanceHypothesis: string;
  possibleBuyerRoles: string[];
  unresolvedQuestions: string[];
  contactRoutes: Array<{ targetRole: string; routeType: string; contactPageUrl?: string }>;
  firstMoveDraft: { subject: string; opening: string; whyNow: string; ask: string; recommendedChannel: string } | null;
  score: { total: number; scoreState: string; caps: string[] } | null;
  evidence: Array<{ id: string; finalUrl: string; title: string | null; readableExcerpt: string }>;
  buyingSignals: Array<{ id: string; signalType: string; summary: string; verified: boolean; freshness: string; evidenceExcerpt: string }>;
};
type DossierResponse = { id: string; status: string; discoveryStage: string; mission: { name: string; owner: string; productFocus: string }; accounts: DossierAccount[]; review: { id: string; status: string; decision: { action?: string; note?: string } | null } | null };

const stages = ["Brief", "ICP", "Discovery", "Signals", "Scoring", "Review"];

export function MissionControl() {
  const [smoke, setSmoke] = useState<SmokeResponse | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runId, setRunId] = useState("");
  const [dossier, setDossier] = useState<DossierResponse | null>(null);
  const [dossierError, setDossierError] = useState("");
  const [isLoadingDossier, setIsLoadingDossier] = useState(false);
  const [isDeciding, setIsDeciding] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);

  async function runSmokeTest() {
    setIsRunning(true); setSmoke(null);
    try { const response = await fetch("/api/smoke", { method: "POST" }); setSmoke(await response.json() as SmokeResponse); }
    catch { setSmoke({ error: { code: "NETWORK_ERROR", message: "The smoke route could not be reached." } }); }
    finally { setIsRunning(false); }
  }

  async function loadDossier(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setIsLoadingDossier(true); setDossierError("");
    try {
      const response = await fetch(`/api/runs/${encodeURIComponent(runId.trim())}`);
      const payload = await response.json() as DossierResponse & { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? "The dossier could not be loaded.");
      setDossier(payload);
    } catch (error) { setDossier(null); setDossierError(error instanceof Error ? error.message : "The dossier could not be loaded."); }
    finally { setIsLoadingDossier(false); }
  }

  async function decideReview(action: "APPROVE" | "REJECT" | "EDIT") {
    if (!dossier) return;
    setIsDeciding(true); setDossierError("");
    try {
      const response = await fetch(`/api/runs/${encodeURIComponent(dossier.id)}/review`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, reviewer: "Nick" }) });
      const payload = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? "The review decision could not be saved.");
      await loadDossier();
    } catch (error) { setDossierError(error instanceof Error ? error.message : "The review decision could not be saved."); }
    finally { setIsDeciding(false); }
  }

  async function draftFirstMove(accountId: string) {
    setIsDrafting(true); setDossierError("");
    try {
      const response = await fetch(`/api/prospects/${encodeURIComponent(accountId)}/first-move`, { method: "POST" });
      const payload = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? "The first-move draft could not be generated.");
      await loadDossier();
    } catch (error) { setDossierError(error instanceof Error ? error.message : "The first-move draft could not be generated."); }
    finally { setIsDrafting(false); }
  }

  return <main className="scout-grid min-h-screen overflow-hidden bg-[#0a0d12] px-5 py-6 text-[#f5f7fa] sm:px-8 lg:px-12"><div className="mx-auto max-w-7xl">
    <header className="flex flex-col gap-5 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between"><div><div className="mb-4 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.24em] text-[#f5c542]"><span className="h-2 w-2 rounded-full bg-[#f5c542] shadow-[0_0_16px_#f5c542]" />Monster Scout</div><h1 className="max-w-3xl text-4xl font-black tracking-[-0.04em] sm:text-6xl">The AI hunting machine for the next Monster deal.</h1></div><div className="flex shrink-0 items-center gap-2 self-start rounded-full border border-[#f5c542]/30 bg-[#f5c542]/10 px-3 py-2 text-xs font-semibold text-[#f5c542] sm:self-end"><span className="h-2 w-2 rounded-full bg-[#f5c542]" />Standalone MVP · Act 1</div></header>
    <section className="grid gap-5 py-8 lg:grid-cols-[1.35fr_0.65fr]"><div className="rounded-3xl border border-white/10 bg-[#11161e]/90 p-6 shadow-2xl sm:p-8"><div className="mb-10 flex items-start justify-between gap-4"><div><p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-white/45">Sales Mission Control</p><h2 className="text-2xl font-bold">Find the next credible conversation.</h2><p className="mt-3 max-w-xl leading-7 text-white/55">Load a persisted mission run, inspect its evidence-backed dossier and record Nick&apos;s review decision.</p></div><div className="hidden rounded-2xl border border-[#36d399]/25 bg-[#36d399]/10 px-3 py-2 text-right sm:block"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#36d399]">System state</p><p className="mt-1 text-sm font-semibold text-white">Discovery ready</p></div></div>
      <div className="mb-8 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-white/[0.045] p-4"><p className="text-xs uppercase tracking-[0.16em] text-white/40">Mission</p><p className="mt-2 font-semibold">Evidence-backed buyers</p></div><div className="rounded-2xl bg-white/[0.045] p-4"><p className="text-xs uppercase tracking-[0.16em] text-white/40">Storage</p><p className="mt-2 font-semibold">Postgres + checkpoints</p></div><div className="rounded-2xl bg-white/[0.045] p-4"><p className="text-xs uppercase tracking-[0.16em] text-white/40">Output</p><p className="mt-2 font-semibold">Review-ready dossiers</p></div></div>
      <div className="mb-8"><div className="mb-3 flex items-center justify-between text-xs font-bold uppercase tracking-[0.16em] text-white/40"><span>Mission stages</span><span>6 / 6 connected</span></div><ol className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">{stages.map((stage, index) => <li key={stage} className="rounded-xl border border-white/10 bg-white/[0.025] px-3 py-3 text-sm text-white/60"><span className="mr-2 font-mono text-xs text-[#f5c542]/70">0{index + 1}</span>{stage}</li>)}</ol></div>
      <button type="button" onClick={runSmokeTest} disabled={isRunning} className="rounded-full bg-[#f5c542] px-5 py-3 text-sm font-bold text-[#0a0d12] transition hover:bg-[#ffd761] disabled:cursor-wait disabled:opacity-60">{isRunning ? "Checking gateway…" : "Run AI Gateway smoke test"}</button>{smoke ? <div className={`mt-5 rounded-2xl border p-4 text-sm ${smoke.error ? "border-[#ff7d7d]/30 bg-[#ff7d7d]/10 text-[#ffb0b0]" : "border-[#36d399]/30 bg-[#36d399]/10 text-[#b7f5dd]"}`} role="status">{smoke.error ? <><p className="font-bold">{smoke.error.code}</p><p className="mt-1">{smoke.error.message}</p></> : <><p className="font-bold">Gateway smoke test passed.</p><p className="mt-1">Mission title: {smoke.missionTitle}</p></>}</div> : null}
      <div className="mt-10 border-t border-white/10 pt-8"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#f5c542]">Persisted prospect dossier</p><p className="mt-2 text-sm leading-6 text-white/50">Paste a mission run ID from <code className="text-white/75">POST /api/missions/discover</code>.</p><form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={loadDossier}><label className="sr-only" htmlFor="run-id">Mission run ID</label><input id="run-id" value={runId} onChange={(event) => setRunId(event.target.value)} placeholder="missionRunId" className="min-w-0 flex-1 rounded-full border border-white/15 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#f5c542]/70" required /><button type="submit" disabled={isLoadingDossier} className="rounded-full border border-[#f5c542]/40 px-5 py-3 text-sm font-bold text-[#f5c542] transition hover:bg-[#f5c542]/10 disabled:opacity-50">{isLoadingDossier ? "Loading…" : "Open dossier"}</button></form>{dossierError ? <p className="mt-3 rounded-xl border border-[#ff7d7d]/30 bg-[#ff7d7d]/10 p-3 text-sm text-[#ffb0b0]" role="alert">{dossierError}</p> : null}</div>
      {dossier ? <DossierView dossier={dossier} isDeciding={isDeciding} isDrafting={isDrafting} onDecision={decideReview} onDraft={draftFirstMove} /> : null}</div>
      <aside className="rounded-3xl border border-white/10 bg-[#0f141b]/90 p-6 sm:p-8"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#f5c542]">What this proves</p><ul className="mt-6 space-y-5">{[["01", "Durable state", "A mission survives the request and can resume from Postgres."], ["02", "Evidence first", "Scores expose their caps and source excerpts."], ["03", "Human review", "Models prepare recommendations; Nick decides."]].map(([number, title, detail]) => <li key={number} className="flex gap-4"><span className="font-mono text-xs text-white/30">{number}</span><div><p className="font-semibold">{title}</p><p className="mt-1 text-sm leading-6 text-white/45">{detail}</p></div></li>)}</ul><div className="mt-10 border-t border-white/10 pt-5 text-sm leading-6 text-white/45">Public contact mapping, CRM export and first-move drafting remain governed follow-on stages.</div></aside></section>
    <footer className="flex flex-col gap-2 border-t border-white/10 py-5 text-xs text-white/35 sm:flex-row sm:justify-between"><span>MONSTER SCOUT / Sales Mission Control</span><span>Prepared for evidence-backed commercial research.</span></footer>
  </div></main>;
}

function DossierView({ dossier, isDeciding, isDrafting, onDecision, onDraft }: { dossier: DossierResponse; isDeciding: boolean; isDrafting: boolean; onDecision: (action: "APPROVE" | "REJECT" | "EDIT") => void; onDraft: (accountId: string) => void }) {
  return <section className="mt-8 space-y-5" aria-label="Prospect dossier"><div className="rounded-2xl border border-[#36d399]/25 bg-[#36d399]/10 p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#36d399]">{dossier.mission.name}</p><h3 className="mt-2 text-2xl font-bold">{dossier.accounts.length} prospect account{dossier.accounts.length === 1 ? "" : "s"}</h3><p className="mt-1 text-sm text-white/55">Run {dossier.id} · {dossier.discoveryStage}</p></div><span className="rounded-full border border-[#f5c542]/30 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[#f5c542]">Review: {dossier.review?.status ?? "UNKNOWN"}</span></div></div>{dossier.accounts.map((account) => <AccountDossier key={account.id} account={account} isDrafting={isDrafting} canDraft={dossier.review?.status === "APPROVED"} onDraft={onDraft} />)}{dossier.review?.status === "PENDING" ? <div className="flex flex-wrap gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-5"><p className="mr-auto self-center text-sm text-white/60">Nick review is required before export or outreach.</p><button type="button" disabled={isDeciding} onClick={() => onDecision("EDIT")} className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white/70">Request changes</button><button type="button" disabled={isDeciding} onClick={() => onDecision("REJECT")} className="rounded-full border border-[#ff7d7d]/40 px-4 py-2 text-sm font-semibold text-[#ffb0b0]">Reject</button><button type="button" disabled={isDeciding} onClick={() => onDecision("APPROVE")} className="rounded-full bg-[#f5c542] px-4 py-2 text-sm font-bold text-[#0a0d12]">Approve</button></div> : null}</section>;
}

function AccountDossier({ account, isDrafting, canDraft, onDraft }: { account: DossierAccount; isDrafting: boolean; canDraft: boolean; onDraft: (accountId: string) => void }) {
  const score = account.score;
  return <article className="rounded-2xl border border-white/10 bg-[#0f141b] p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-white/40">Prospect account</p><h4 className="mt-1 text-xl font-bold">{account.companyName}</h4><p className="mt-1 text-sm text-white/50">{[account.city, account.country].filter(Boolean).join(", ") || "Location unknown"}</p></div><div className="text-right"><p className="text-3xl font-black text-[#f5c542]">{score?.total ?? "—"}</p><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">{score?.scoreState ?? "UNSCORED"}</p></div></div><p className="mt-5 leading-7 text-white/70">{account.relevanceHypothesis}</p><div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-white/[0.045] p-4"><p className="text-xs uppercase tracking-[0.14em] text-white/35">Buyer route</p><p className="mt-2 text-sm text-white/75">{account.contactRoutes.map((route) => route.contactPageUrl ? <a key={route.targetRole} href={route.contactPageUrl} target="_blank" rel="noreferrer" className="mr-2 text-[#f5c542] hover:underline">{route.targetRole}</a> : <span key={route.targetRole} className="mr-2">{route.targetRole}</span>)}</p></div><div className="rounded-xl bg-white/[0.045] p-4"><p className="text-xs uppercase tracking-[0.14em] text-white/35">Score cap</p><p className="mt-2 text-sm text-white/75">{score?.caps.join(", ") || "None"}</p></div></div><div className="mt-5 space-y-3"><p className="text-xs font-bold uppercase tracking-[0.16em] text-white/40">Evidence and signals</p>{account.evidence.map((evidence) => <div key={evidence.id} className="rounded-xl border border-white/10 p-4"><a href={evidence.finalUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-[#f5c542] hover:underline">{evidence.title || evidence.finalUrl}</a><p className="mt-2 text-sm leading-6 text-white/55">{evidence.readableExcerpt}</p>{account.buyingSignals.filter((signal) => signal.evidenceExcerpt).map((signal) => <p key={signal.id} className="mt-3 border-l-2 border-[#36d399] pl-3 text-sm text-white/70">{signal.signalType}: {signal.summary} <span className="text-white/35">· {signal.verified ? "verified" : "unverified"} · {signal.freshness}</span></p>)}</div>)}</div>{account.firstMoveDraft ? <div className="mt-5 rounded-xl border border-[#f5c542]/30 bg-[#f5c542]/10 p-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f5c542]">First-move draft · {account.firstMoveDraft.recommendedChannel}</p><h5 className="mt-2 font-bold">{account.firstMoveDraft.subject}</h5><p className="mt-2 text-sm leading-6 text-white/70">{account.firstMoveDraft.opening}</p><p className="mt-3 text-sm text-white/60"><strong className="text-white/80">Ask:</strong> {account.firstMoveDraft.ask}</p></div> : canDraft && account.firstMoveDraft === null ? <button type="button" disabled={isDrafting} onClick={() => onDraft(account.id)} className="mt-5 rounded-full border border-[#f5c542]/40 px-4 py-2 text-sm font-bold text-[#f5c542] disabled:opacity-50">{isDrafting ? "Drafting…" : "Draft first move"}</button> : null}{account.unresolvedQuestions.length > 0 ? <p className="mt-5 text-sm text-[#f5c542]/80">Open questions: {account.unresolvedQuestions.join(" · ")}</p> : null}</article>;
}
