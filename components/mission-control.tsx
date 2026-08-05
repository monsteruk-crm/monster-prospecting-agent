"use client";

import { useEffect, useState, type FormEvent } from "react";

type SmokeResponse = { missionTitle?: string; status?: "ready"; error?: { code: string; message: string } };
type ContactRoute = { targetRole: string; routeType: string; contactPageUrl?: string; professionalProfileUrl?: string; contactName?: string; email?: string };
type MissionBrief = {
  name: string;
  owner: string;
  geographies: string[];
  accountCategories: string[];
  productFocus: string;
  contactRequirement: string;
  requiredSignals: string[];
  preferredSignals: string[];
  buyerRoles: string[];
  freshnessWindowDays: number;
  exclusions: string[];
  instructions: string;
  limits: { maxCandidateAccounts: number; maxSearches: number; maxPages: number; maxModelCalls: number; maxCostUsd: number };
};
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
  contactRoutes: ContactRoute[];
  firstMoveDraft: { subject: string; opening: string; whyNow: string; ask: string; recommendedChannel: string } | null;
  score: { total: number; scoreState: string; caps: string[]; reachability?: number } | null;
  evidence: Array<{ id: string; finalUrl: string; title: string | null; readableExcerpt: string }>;
  buyingSignals: Array<{ id: string; signalType: string; summary: string; verified: boolean; freshness: string; evidenceExcerpt: string }>;
};
type DossierResponse = {
  id: string;
  status: string;
  discoveryStage: string;
  warnings?: Array<{ code: string; message: string }>;
  errors?: Array<{ code: string; message: string }>;
  mission: { name: string; owner: string; productFocus: string; brief: MissionBrief };
  accounts: DossierAccount[];
  review: { id: string; status: string; decision: { action?: string; note?: string } | null } | null;
  auditEvents?: Array<{ eventType: string; payload: unknown; occurredAt: string }>;
};
type LaunchResponse = { missionRunId?: string; error?: { message?: string } };
type ProgressRecord = { stage: string; status: string; message: string; detail?: string; counts?: Record<string, number>; sequence?: number; occurredAt?: string };
type RunHistoryItem = { id: string; status: string; discoveryStage: string; startedAt: string; completedAt: string | null; mission: { id: string; name: string; owner: string; productFocus: string }; review: { status: string } | null };
type LiveOutput = { kind: "stage" | "search"; message: string; detail?: string; occurredAt?: string; counts?: Record<string, number> };

const stages = ["Brief", "ICP", "Discovery", "Signals", "Scoring", "Review"];

function commaList(value: string): string[] {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

async function readNdjson(response: Response, onMessage: (message: Record<string, unknown>) => void) {
  if (!response.body) throw new Error("The progress stream did not provide a readable body.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const chunk = await reader.read();
    buffer += decoder.decode(chunk.value ?? new Uint8Array(), { stream: !chunk.done });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (line.trim()) onMessage(JSON.parse(line) as Record<string, unknown>);
    }
    if (chunk.done) break;
  }
  if (buffer.trim()) onMessage(JSON.parse(buffer) as Record<string, unknown>);
}

export function MissionControl() {
  const [smoke, setSmoke] = useState<SmokeResponse | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runId, setRunId] = useState("");
  const [dossier, setDossier] = useState<DossierResponse | null>(null);
  const [dossierError, setDossierError] = useState("");
  const [liveOutput, setLiveOutput] = useState<LiveOutput[]>([]);
  const [runHistory, setRunHistory] = useState<RunHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoadingDossier, setIsLoadingDossier] = useState(false);
  const [isDeciding, setIsDeciding] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [missionName, setMissionName] = useState("MVP sales hunt");
  const [owner, setOwner] = useState("Nick");
  const [geography, setGeography] = useState("United Kingdom");
  const [accountCategory, setAccountCategory] = useState("TICKETED_EVENT_PROMOTER");
  const [productFocus, setProductFocus] = useState("THE_MONSTER");
  const [contactRequirement, setContactRequirement] = useState("ANY_ROUTE");
  const [buyerRole, setBuyerRole] = useState("Managing Director");
  const [requiredSignals, setRequiredSignals] = useState("");
  const [preferredSignals, setPreferredSignals] = useState("new programme, expansion, partnership");
  const [freshnessWindowDays, setFreshnessWindowDays] = useState("365");
  const [exclusions, setExclusions] = useState("");
  const [instructions, setInstructions] = useState("");
  const [launchStatus, setLaunchStatus] = useState("");
  const [isLaunching, setIsLaunching] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);
  const [researchGap, setResearchGap] = useState("");
  const [isRecordingGap, setIsRecordingGap] = useState(false);

  useEffect(() => { void loadRunHistory(); }, []);

  async function runSmokeTest() {
    setIsRunning(true); setSmoke(null);
    try { const response = await fetch("/api/smoke", { method: "POST" }); setSmoke(await response.json() as SmokeResponse); }
    catch { setSmoke({ error: { code: "NETWORK_ERROR", message: "The smoke route could not be reached." } }); }
    finally { setIsRunning(false); }
  }

  async function loadDossierById(id: string) {
    const response = await fetch(`/api/runs/${encodeURIComponent(id)}`);
    const payload = await response.json() as DossierResponse & { error?: { message?: string } };
    if (!response.ok) throw new Error(payload.error?.message ?? "The dossier could not be loaded.");
    setDossier(payload);
    setLiveOutput((payload.auditEvents ?? []).map((event) => {
      const value = event.payload as Partial<ProgressRecord> & { query?: string; resultCount?: number; status?: string; detail?: string };
      return event.eventType === "MISSION_SEARCH_PROGRESS"
        ? { kind: "search" as const, message: `Search ${value.status?.toLowerCase() ?? "updated"}: ${value.resultCount ?? 0} new result(s).`, detail: value.query, occurredAt: event.occurredAt }
        : { kind: "stage" as const, message: value.message ?? event.eventType, detail: value.detail, occurredAt: value.occurredAt ?? event.occurredAt, counts: value.counts };
    }));
    return payload;
  }

  async function loadRunHistory() {
    setIsLoadingHistory(true);
    try {
      const response = await fetch("/api/runs?limit=20", { cache: "no-store" });
      const payload = await response.json() as { runs?: RunHistoryItem[] };
      if (response.ok) setRunHistory(payload.runs ?? []);
    } finally {
      setIsLoadingHistory(false);
    }
  }

  async function loadDossier(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setIsLoadingDossier(true); setDossierError("");
    try { await loadDossierById(runId.trim()); }
    catch (error) { setDossier(null); setDossierError(error instanceof Error ? error.message : "The dossier could not be loaded."); }
    finally { setIsLoadingDossier(false); }
  }

  async function launchMission(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLaunching(true); setLaunchStatus("Preparing mission…"); setDossierError(""); setDossier(null);
    try {
      setLaunchStatus("Searching DuckDuckGo, filtering candidates, and fetching first-party sources…");
      setLiveOutput([]);
      const response = await fetch("/api/missions/discover/stream", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: missionName, owner, geographies: commaList(geography), accountCategories: [accountCategory], productFocus, contactRequirement, requiredSignals: commaList(requiredSignals), preferredSignals: commaList(preferredSignals), buyerRoles: commaList(buyerRole), freshnessWindowDays: Number.parseInt(freshnessWindowDays, 10), exclusions: commaList(exclusions), instructions, limits: { maxCandidateAccounts: 5, maxSearches: 12, maxPages: 20, maxModelCalls: 20, maxCostUsd: 2 } }) });
      if (!response.ok) { const payload = await response.json() as LaunchResponse & { error?: { message?: string } }; throw new Error(payload.error?.message ?? "The mission could not be launched."); }
      let completedRunId = "";
      await readNdjson(response, (message) => {
        if (message.type === "run_started") {
          const startedRunId = typeof message.missionRunId === "string" ? message.missionRunId : "";
          if (startedRunId) { completedRunId = startedRunId; setRunId(startedRunId); void loadRunHistory(); }
          setLaunchStatus(typeof message.message === "string" ? message.message : "Mission started.");
        } else if (message.type === "progress") {
          setLiveOutput((current) => [...current, { kind: "stage" as const, message: String(message.message ?? "Progress update"), detail: typeof message.detail === "string" ? message.detail : undefined, occurredAt: typeof message.occurredAt === "string" ? message.occurredAt : undefined, counts: typeof message.counts === "object" && message.counts !== null ? message.counts as Record<string, number> : undefined }].slice(-40));
          setLaunchStatus(String(message.message ?? "Mission running…"));
        } else if (message.type === "search_progress") {
          setLiveOutput((current) => [...current, { kind: "search" as const, message: `Search ${String(message.status ?? "updated").toLowerCase()}: ${String(message.resultCount ?? 0)} new result(s).`, detail: typeof message.query === "string" ? message.query : undefined }].slice(-40));
          setLaunchStatus(`Search ${String(message.queryIndex ?? "")} complete · ${String(message.resultCount ?? 0)} new result(s).`);
        } else if (message.type === "error") {
          const error = message.error as { message?: string } | undefined;
          throw new Error(error?.message ?? "The mission could not be completed.");
        }
        if (message.type === "completed" && typeof message.missionRunId === "string") completedRunId = message.missionRunId;
      });
      if (!completedRunId) throw new Error("The mission ended without a run ID.");
      setRunId(completedRunId); setLaunchStatus("Research complete. Loading persisted dossier…");
      const result = await loadDossierById(completedRunId);
      await loadRunHistory();
      setLaunchStatus(`Ready for review: ${result.accounts.length} account${result.accounts.length === 1 ? "" : "s"}.`);
    } catch (error) { setDossierError(error instanceof Error ? error.message : "The mission could not be launched."); setLaunchStatus(""); }
    finally { setIsLaunching(false); }
  }

  async function continueSearch() {
    if (!dossier) return;
    setIsContinuing(true); setDossierError(""); setLaunchStatus("Continuing deeper into saved search results…");
    const poll = window.setInterval(() => { void loadDossierById(dossier.id).catch(() => undefined); }, 1000);
    try {
      const response = await fetch(`/api/runs/${encodeURIComponent(dossier.id)}/search-more`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ additionalSearches: 7, additionalPages: 20, additionalModelCalls: 12, additionalCostUsd: 2 }) });
      const payload = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? "The deeper search could not be completed.");
      await loadDossierById(dossier.id); await loadRunHistory(); setLaunchStatus("Deeper search complete; dossier refreshed.");
    } catch (error) { setDossierError(error instanceof Error ? error.message : "The deeper search could not be completed."); setLaunchStatus(""); }
    finally { window.clearInterval(poll); setIsContinuing(false); }
  }

  async function recordResearchGap() {
    if (!dossier || !researchGap.trim()) return;
    setIsRecordingGap(true); setDossierError("");
    try {
      const response = await fetch(`/api/runs/${encodeURIComponent(dossier.id)}/research-gap`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question: researchGap.trim(), reviewer: "Nick" }) });
      const payload = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? "The research gap could not be recorded.");
      setResearchGap(""); await loadDossierById(dossier.id);
    } catch (error) { setDossierError(error instanceof Error ? error.message : "The research gap could not be recorded."); }
    finally { setIsRecordingGap(false); }
  }

  async function decideReview(action: "APPROVE" | "REJECT" | "EDIT") {
    if (!dossier) return;
    setIsDeciding(true); setDossierError("");
    try {
      const response = await fetch(`/api/runs/${encodeURIComponent(dossier.id)}/review`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, reviewer: "Nick" }) });
      const payload = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? "The review decision could not be saved.");
      await loadDossierById(dossier.id);
    } catch (error) { setDossierError(error instanceof Error ? error.message : "The review decision could not be saved."); }
    finally { setIsDeciding(false); }
  }

  async function draftFirstMove(accountId: string) {
    if (!dossier) return;
    setIsDrafting(true); setDossierError("");
    try {
      const response = await fetch(`/api/prospects/${encodeURIComponent(accountId)}/first-move`, { method: "POST" });
      const payload = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? "The first-move draft could not be generated.");
      await loadDossierById(dossier.id);
    } catch (error) { setDossierError(error instanceof Error ? error.message : "The first-move draft could not be generated."); }
    finally { setIsDrafting(false); }
  }

  async function exportApprovedLeads() {
    if (!dossier) return;
    setIsExporting(true); setDossierError("");
    try {
      const response = await fetch("/api/exports/leads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ missionRunId: dossier.id, mode: "DRY_RUN" }) });
      if (!response.ok) { const payload = await response.json() as { error?: { message?: string } }; throw new Error(payload.error?.message ?? "The lead export could not be generated."); }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = `monster-scout-${dossier.mission.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.csv`;
      document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
    } catch (error) { setDossierError(error instanceof Error ? error.message : "The lead export could not be generated."); }
    finally { setIsExporting(false); }
  }

  return <main className="scout-grid min-h-screen overflow-hidden bg-[#0a0d12] px-5 py-6 text-[#f5f7fa] sm:px-8 lg:px-12"><div className="mx-auto max-w-7xl">
    <header className="flex flex-col gap-5 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between"><div><div className="mb-4 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.24em] text-[#f5c542]"><span className="h-2 w-2 rounded-full bg-[#f5c542] shadow-[0_0_16px_#f5c542]" />Monster Scout</div><h1 className="max-w-3xl text-4xl font-black tracking-[-0.04em] sm:text-6xl">The AI hunting machine for the next Monster deal.</h1></div><div className="flex shrink-0 items-center gap-2 self-start rounded-full border border-[#f5c542]/30 bg-[#f5c542]/10 px-3 py-2 text-xs font-semibold text-[#f5c542] sm:self-end"><span className="h-2 w-2 rounded-full bg-[#f5c542]" />Standalone MVP · Act 1</div></header>
    <section className="grid gap-5 py-8 lg:grid-cols-[1.35fr_0.65fr]"><div className="rounded-3xl border border-white/10 bg-[#11161e]/90 p-6 shadow-2xl sm:p-8"><div className="mb-10 flex items-start justify-between gap-4"><div><p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-white/45">Sales Mission Control</p><h2 className="text-2xl font-bold">Find the next credible conversation.</h2><p className="mt-3 max-w-xl leading-7 text-white/55">Launch a bounded mission, inspect contact routes and evidence, approve the dossier, then download the lead CSV.</p></div><div className="hidden rounded-2xl border border-[#36d399]/25 bg-[#36d399]/10 px-3 py-2 text-right sm:block"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#36d399]">System state</p><p className="mt-1 text-sm font-semibold text-white">Discovery ready</p></div></div>
      <div className="mb-8 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-white/[0.045] p-4"><p className="text-xs uppercase tracking-[0.16em] text-white/40">Mission</p><p className="mt-2 font-semibold">Evidence-backed buyers</p></div><div className="rounded-2xl bg-white/[0.045] p-4"><p className="text-xs uppercase tracking-[0.16em] text-white/40">Storage</p><p className="mt-2 font-semibold">Postgres + checkpoints</p></div><div className="rounded-2xl bg-white/[0.045] p-4"><p className="text-xs uppercase tracking-[0.16em] text-white/40">Output</p><p className="mt-2 font-semibold">Dossier + approved CSV</p></div></div>
      <div className="mb-8"><div className="mb-3 flex items-center justify-between text-xs font-bold uppercase tracking-[0.16em] text-white/40"><span>Mission stages</span><span>6 / 6 connected</span></div><ol className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">{stages.map((stage, index) => <li key={stage} className="rounded-xl border border-white/10 bg-white/[0.025] px-3 py-3 text-sm text-white/60"><span className="mr-2 font-mono text-xs text-[#f5c542]/70">0{index + 1}</span>{stage}</li>)}</ol></div>
      <button type="button" onClick={runSmokeTest} disabled={isRunning} className="rounded-full bg-[#f5c542] px-5 py-3 text-sm font-bold text-[#0a0d12] transition hover:bg-[#ffd761] disabled:cursor-wait disabled:opacity-60">{isRunning ? "Checking gateway…" : "Run AI Gateway smoke test"}</button>{smoke ? <div className={`mt-5 rounded-2xl border p-4 text-sm ${smoke.error ? "border-[#ff7d7d]/30 bg-[#ff7d7d]/10 text-[#ffb0b0]" : "border-[#36d399]/30 bg-[#36d399]/10 text-[#b7f5dd]"}`} role="status">{smoke.error ? <><p className="font-bold">{smoke.error.code}</p><p className="mt-1">{smoke.error.message}</p></> : <><p className="font-bold">Gateway smoke test passed.</p><p className="mt-1">Mission title: {smoke.missionTitle}</p></>}</div> : null}
      <div className="mt-10 border-t border-white/10 pt-8"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#f5c542]">Launch bounded mission</p><p className="mt-2 text-sm leading-6 text-white/50">Complete the sales brief below. Comma-separated fields accept multiple values. The run is bounded to five accounts and persists this brief with the dossier.</p><form className="mt-4 space-y-4" onSubmit={launchMission}><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><label className="text-xs text-white/50">Mission name<input value={missionName} onChange={(event) => setMissionName(event.target.value)} className="mt-1 w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white" required /></label><label className="text-xs text-white/50">Owner<input value={owner} onChange={(event) => setOwner(event.target.value)} className="mt-1 w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white" required /></label><label className="text-xs text-white/50">Geography or regions<input value={geography} onChange={(event) => setGeography(event.target.value)} placeholder="United Kingdom, Ireland" className="mt-1 w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white" required /></label><label className="text-xs text-white/50">Account category<select value={accountCategory} onChange={(event) => setAccountCategory(event.target.value)} className="mt-1 w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white"><option value="TICKETED_EVENT_PROMOTER">Ticketed event promoter</option><option value="FAMILY_ATTRACTION_OPERATOR">Family attraction operator</option><option value="FESTIVAL_PRODUCER">Festival producer</option><option value="EXPERIENTIAL_EVENT_AGENCY">Experiential event agency</option><option value="VISITOR_ATTRACTION">Visitor attraction</option><option value="HOLIDAY_RESORT">Holiday resort</option><option value="COMPARABLE_ATTRACTION_OPERATOR">Comparable attraction operator</option></select></label><label className="text-xs text-white/50">Product focus<select value={productFocus} onChange={(event) => setProductFocus(event.target.value)} className="mt-1 w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white"><option value="THE_MONSTER">The Monster</option><option value="MEGA_BOUNCE_HOUSE">Mega Bounce House</option><option value="UNDECIDED">Undecided</option></select></label><label className="text-xs text-white/50">Contact requirement<select value={contactRequirement} onChange={(event) => setContactRequirement(event.target.value)} className="mt-1 w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white"><option value="ANY_ROUTE">Any verified route</option><option value="PUBLIC_EMAIL">Only publicly confirmed email</option></select></label><label className="text-xs text-white/50">Buyer role or roles<input value={buyerRole} onChange={(event) => setBuyerRole(event.target.value)} placeholder="Managing Director, Head of Programming" className="mt-1 w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white" required /></label><label className="text-xs text-white/50">Required signals<input value={requiredSignals} onChange={(event) => setRequiredSignals(event.target.value)} placeholder="new programme" className="mt-1 w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white" /></label><label className="text-xs text-white/50">Preferred signals<input value={preferredSignals} onChange={(event) => setPreferredSignals(event.target.value)} placeholder="expansion, partnership" className="mt-1 w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white" /></label><label className="text-xs text-white/50">Freshness window (days)<input type="number" min="1" max="3650" value={freshnessWindowDays} onChange={(event) => setFreshnessWindowDays(event.target.value)} className="mt-1 w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white" required /></label><label className="text-xs text-white/50 sm:col-span-2 lg:col-span-3">Exclusions<input value={exclusions} onChange={(event) => setExclusions(event.target.value)} placeholder="ticket resellers, job boards" className="mt-1 w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white" /></label><label className="text-xs text-white/50 sm:col-span-2 lg:col-span-3">Instructions for this hunt<textarea value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder="Prioritise organisations with public partnership or programming routes." rows={3} className="mt-1 w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white" /></label></div><p className="text-xs text-white/35">Email-only runs keep accounts only when a public email appears in the fetched official-source excerpt. No email addresses are guessed.</p><p className="text-xs text-white/35">Fixed safety limits: up to 5 accounts, 12 searches, 20 pages, 20 model calls and USD 2 estimated model cost.</p><button type="submit" disabled={isLaunching} className="w-full rounded-full border border-[#36d399]/40 px-5 py-3 text-sm font-bold text-[#b7f5dd] disabled:opacity-50">{isLaunching ? "Mission running…" : "Launch mission from brief"}</button></form>{launchStatus ? <p className="mt-3 text-sm text-[#b7f5dd]" role="status">{launchStatus}</p> : null}</div>
      <div className="mt-10 border-t border-white/10 pt-8"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#f5c542]">Persisted prospect dossier</p><p className="mt-2 text-sm leading-6 text-white/50">Open a saved mission run from Executed runs, or paste its ID here. New runs use the streamed discovery route above.</p><form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={loadDossier}><label className="sr-only" htmlFor="run-id">Mission run ID</label><input id="run-id" value={runId} onChange={(event) => setRunId(event.target.value)} placeholder="missionRunId" className="min-w-0 flex-1 rounded-full border border-white/15 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#f5c542]/70" required /><button type="submit" disabled={isLoadingDossier} className="rounded-full border border-[#f5c542]/40 px-5 py-3 text-sm font-bold text-[#f5c542] transition hover:bg-[#f5c542]/10 disabled:opacity-50">{isLoadingDossier ? "Loading…" : "Open dossier"}</button></form>{dossierError ? <p className="mt-3 rounded-xl border border-[#ff7d7d]/30 bg-[#ff7d7d]/10 p-3 text-sm text-[#ffb0b0]" role="alert">{dossierError}</p> : null}</div>
      {liveOutput.length > 0 ? <LiveOutputPanel output={liveOutput} running={isLaunching || isContinuing} /> : null}
      {runHistory.length > 0 || isLoadingHistory ? <RunHistory runs={runHistory} loading={isLoadingHistory} onOpen={(id) => { setRunId(id); void loadDossierById(id); }} /> : null}
      {dossier ? <DossierView dossier={dossier} isDeciding={isDeciding} isDrafting={isDrafting} isExporting={isExporting} isContinuing={isContinuing} isRecordingGap={isRecordingGap} researchGap={researchGap} onResearchGapChange={setResearchGap} onResearchGap={recordResearchGap} onContinue={continueSearch} onExport={exportApprovedLeads} onDecision={decideReview} onDraft={draftFirstMove} /> : null}</div>
      <aside className="rounded-3xl border border-white/10 bg-[#0f141b]/90 p-6 sm:p-8"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#f5c542]">What this proves</p><ul className="mt-6 space-y-5">{[["01", "Durable state", "A mission survives the request and can resume from Postgres."], ["02", "Contact clarity", "Public pages are linked; role-only routes are labeled honestly."], ["03", "Human review", "Nick approves before CSV export."]].map(([number, title, detail]) => <li key={number} className="flex gap-4"><span className="font-mono text-xs text-white/30">{number}</span><div><p className="font-semibold">{title}</p><p className="mt-1 text-sm leading-6 text-white/45">{detail}</p></div></li>)}</ul><div className="mt-10 border-t border-white/10 pt-5 text-sm leading-6 text-white/45">Unknown names and emails stay blank unless publicly confirmed.</div></aside></section>
    <footer className="flex flex-col gap-2 border-t border-white/10 py-5 text-xs text-white/35 sm:flex-row sm:justify-between"><span>MONSTER SCOUT / Sales Mission Control</span><span>Prepared for evidence-backed commercial research.</span></footer>
  </div></main>;
}

function LiveOutputPanel({ output, running }: { output: LiveOutput[]; running: boolean }) {
  return <div className="mt-8 rounded-2xl border border-[#36d399]/25 bg-[#36d399]/[0.06] p-5" aria-live="polite"><div className="flex items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#36d399]">{running ? "Live agent output" : "Saved run output"}</p><span className="text-xs text-white/40">{output.length} event{output.length === 1 ? "" : "s"}</span></div><ol className="mt-4 max-h-72 space-y-2 overflow-y-auto">{output.map((event, index) => <li key={`${event.occurredAt ?? "live"}-${index}`} className="rounded-xl border border-white/10 bg-black/15 px-3 py-2 text-sm"><p className="text-white/80"><span className="mr-2 font-mono text-xs text-[#f5c542]">{event.kind === "search" ? "SEARCH" : "AGENT"}</span>{event.message}</p>{event.detail ? <p className="mt-1 truncate text-xs text-white/40">{event.detail}</p> : null}{event.counts ? <p className="mt-1 text-xs text-white/35">{Object.entries(event.counts).map(([key, value]) => `${key}: ${value}`).join(" · ")}</p> : null}</li>)}</ol></div>;
}

function RunHistory({ runs, loading, onOpen }: { runs: RunHistoryItem[]; loading: boolean; onOpen: (id: string) => void }) {
  return <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.035] p-5"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#f5c542]">Executed runs</p><p className="mt-1 text-sm text-white/50">Run IDs are stored in Postgres and can be reopened.</p></div>{loading ? <span className="text-xs text-white/40">Refreshing…</span> : null}</div><div className="mt-4 space-y-2">{runs.map((run) => <div key={run.id} className="flex flex-col gap-3 rounded-xl border border-white/10 bg-black/15 px-3 py-3 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-white/80">{run.mission.name}</p><p className="mt-1 truncate font-mono text-xs text-white/35">{run.id}</p></div><div className="text-xs text-white/45"><span className="text-white/70">{run.status}</span> · {run.discoveryStage}</div><button type="button" onClick={() => onOpen(run.id)} className="rounded-full border border-[#f5c542]/35 px-3 py-1.5 text-xs font-bold text-[#f5c542]">Open</button></div>)}</div></div>;
}

function DossierView({ dossier, isDeciding, isDrafting, isExporting, isContinuing, isRecordingGap, researchGap, onResearchGapChange, onResearchGap, onContinue, onExport, onDecision, onDraft }: { dossier: DossierResponse; isDeciding: boolean; isDrafting: boolean; isExporting: boolean; isContinuing: boolean; isRecordingGap: boolean; researchGap: string; onResearchGapChange: (value: string) => void; onResearchGap: () => void; onContinue: () => void; onExport: () => void; onDecision: (action: "APPROVE" | "REJECT" | "EDIT") => void; onDraft: (accountId: string) => void }) {
  const approved = dossier.review?.status === "APPROVED";
  return <section className="mt-8 space-y-5" aria-label="Prospect dossier">
    <div className="rounded-2xl border border-[#36d399]/25 bg-[#36d399]/10 p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#36d399]">{dossier.mission.name}</p><h3 className="mt-2 text-2xl font-bold">{dossier.accounts.length} prospect account{dossier.accounts.length === 1 ? "" : "s"}</h3><p className="mt-1 text-sm text-white/55">Run {dossier.id} · {dossier.discoveryStage}</p></div><div className="flex flex-wrap items-center justify-end gap-3"><span className="rounded-full border border-[#f5c542]/30 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[#f5c542]">Review: {dossier.review?.status ?? "UNKNOWN"}</span>{dossier.status !== "RUNNING" ? <button type="button" disabled={isContinuing} onClick={onContinue} className="rounded-full border border-[#f5c542]/40 px-4 py-2 text-xs font-bold text-[#f5c542] disabled:opacity-50">{isContinuing ? "Searching deeper…" : "Search deeper"}</button> : null}{approved ? <button type="button" disabled={isExporting} onClick={onExport} className="rounded-full bg-[#36d399] px-4 py-2 text-xs font-bold text-[#07130f] disabled:opacity-50">{isExporting ? "Exporting…" : "Download approved CSV"}</button> : null}</div></div>{approved ? <p className="mt-3 text-xs text-white/50">CSV includes public role/contact-page evidence where available; unknown names and emails remain blank.</p> : null}</div>
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#f5c542]">Mission brief</p><div className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3"><div><p className="text-xs uppercase tracking-[0.14em] text-white/35">Owner</p><p className="mt-1 text-white/80">{dossier.mission.brief.owner}</p></div><div><p className="text-xs uppercase tracking-[0.14em] text-white/35">Geographies</p><p className="mt-1 text-white/80">{dossier.mission.brief.geographies.join(", ")}</p></div><div><p className="text-xs uppercase tracking-[0.14em] text-white/35">Account categories</p><p className="mt-1 text-white/80">{dossier.mission.brief.accountCategories.join(", ")}</p></div><div><p className="text-xs uppercase tracking-[0.14em] text-white/35">Product focus</p><p className="mt-1 text-white/80">{dossier.mission.brief.productFocus}</p></div><div><p className="text-xs uppercase tracking-[0.14em] text-white/35">Contact requirement</p><p className="mt-1 text-white/80">{dossier.mission.brief.contactRequirement === "PUBLIC_EMAIL" ? "Only publicly confirmed email" : "Any verified route"}</p></div><div><p className="text-xs uppercase tracking-[0.14em] text-white/35">Buyer roles</p><p className="mt-1 text-white/80">{dossier.mission.brief.buyerRoles.join(", ")}</p></div><div><p className="text-xs uppercase tracking-[0.14em] text-white/35">Freshness window</p><p className="mt-1 text-white/80">{dossier.mission.brief.freshnessWindowDays} days</p></div><div><p className="text-xs uppercase tracking-[0.14em] text-white/35">Required signals</p><p className="mt-1 text-white/80">{dossier.mission.brief.requiredSignals.join(", ") || "None"}</p></div><div><p className="text-xs uppercase tracking-[0.14em] text-white/35">Preferred signals</p><p className="mt-1 text-white/80">{dossier.mission.brief.preferredSignals.join(", ") || "None"}</p></div><div><p className="text-xs uppercase tracking-[0.14em] text-white/35">Exclusions</p><p className="mt-1 text-white/80">{dossier.mission.brief.exclusions.join(", ") || "None"}</p></div></div>{dossier.mission.brief.instructions ? <p className="mt-4 border-l-2 border-[#f5c542] pl-3 text-sm leading-6 text-white/65"><span className="font-semibold text-white/80">Instructions:</span> {dossier.mission.brief.instructions}</p> : null}</div>
    {dossier.errors?.length ? <div className="rounded-2xl border border-[#ff7d7d]/30 bg-[#ff7d7d]/10 p-4 text-sm text-[#ffb0b0]"><p className="font-bold">Partial research warnings</p>{dossier.errors.map((error) => <p key={`${error.code}-${error.message}`} className="mt-1">{error.code}: {error.message}</p>)}</div> : null}
    {dossier.warnings?.length ? <div className="rounded-2xl border border-[#f5c542]/30 bg-[#f5c542]/10 p-4 text-sm text-[#ffe9a3]"><p className="font-bold">Review notes</p>{dossier.warnings.map((warning) => <p key={`${warning.code}-${warning.message}`} className="mt-1">{warning.code}: {warning.message}</p>)}</div> : null}
    {dossier.accounts.map((account) => <AccountDossier key={account.id} account={account} isDrafting={isDrafting} canDraft={approved} emailOnly={dossier.mission.brief.contactRequirement === "PUBLIC_EMAIL"} onDraft={onDraft} />)}
    {dossier.review?.status === "PENDING" ? <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.035] p-5"><div className="flex flex-wrap gap-3"><p className="mr-auto self-center text-sm text-white/60">Nick review is required before export.</p><button type="button" disabled={isDeciding} onClick={() => onDecision("REJECT")} className="rounded-full border border-[#ff7d7d]/40 px-4 py-2 text-sm font-semibold text-[#ffb0b0]">Reject</button><button type="button" disabled={isDeciding} onClick={() => onDecision("APPROVE")} className="rounded-full bg-[#f5c542] px-4 py-2 text-sm font-bold text-[#0a0d12]">Approve</button></div><div className="border-t border-white/10 pt-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f5c542]">Research one gap</p><div className="mt-2 flex flex-col gap-3 sm:flex-row"><input value={researchGap} onChange={(event) => onResearchGapChange(event.target.value)} placeholder="What should be verified next?" className="min-w-0 flex-1 rounded-full border border-white/15 bg-black/20 px-4 py-2 text-sm text-white" /><button type="button" disabled={isRecordingGap || !researchGap.trim()} onClick={onResearchGap} className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white/70 disabled:opacity-50">{isRecordingGap ? "Recording…" : "Record research gap"}</button></div></div></div> : null}
  </section>;
}

function AccountDossier({ account, isDrafting, canDraft, emailOnly, onDraft }: { account: DossierAccount; isDrafting: boolean; canDraft: boolean; emailOnly: boolean; onDraft: (accountId: string) => void }) {
  const score = account.score;
  return <article className="rounded-2xl border border-white/10 bg-[#0f141b] p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-white/40">Prospect account</p><h4 className="mt-1 text-xl font-bold">{account.companyName}</h4><p className="mt-1 text-sm text-white/50">{[account.city, account.country].filter(Boolean).join(", ") || "Location unknown"}</p></div><div className="text-right"><p className="text-3xl font-black text-[#f5c542]">{score?.total ?? "—"}</p><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">{score?.scoreState ?? "UNSCORED"}</p></div></div><p className="mt-5 leading-7 text-white/70">{account.relevanceHypothesis}</p>
    <div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-white/[0.045] p-4"><p className="text-xs uppercase tracking-[0.14em] text-white/35">Contact route</p>{account.contactRoutes.length > 0 ? <div className="mt-2 space-y-2 text-sm text-white/75">{account.contactRoutes.map((route) => <div key={`${route.targetRole}-${route.contactPageUrl ?? route.email ?? route.routeType}`}><span className="font-semibold">{route.targetRole}</span>{route.email ? <><span className="mx-2 text-white/35">·</span><a href={`mailto:${route.email}`} className="text-[#36d399] hover:underline">{route.email}</a></> : null}{route.contactPageUrl ? <><span className="mx-2 text-white/35">·</span><a href={route.contactPageUrl} target="_blank" rel="noreferrer" className="text-[#f5c542] hover:underline">Open public contact page</a></> : route.email ? null : <p className="text-xs text-white/45">Role-only route — no named public contact or direct email was verified.</p>}</div>)}</div> : <p className="mt-2 text-sm text-[#ffb0b0]">{emailOnly ? "No qualifying public email route was found for this brief." : "No buyer route was extracted."}</p>}</div><div className="rounded-xl bg-white/[0.045] p-4"><p className="text-xs uppercase tracking-[0.14em] text-white/35">Score cap</p><p className="mt-2 text-sm text-white/75">{score?.caps.join(", ") || "None"}</p></div></div>
    <div className="mt-5 space-y-3"><p className="text-xs font-bold uppercase tracking-[0.16em] text-white/40">Evidence and signals</p>{account.evidence.map((evidence) => <div key={evidence.id} className="rounded-xl border border-white/10 p-4"><a href={evidence.finalUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-[#f5c542] hover:underline">{evidence.title || evidence.finalUrl}</a><p className="mt-2 text-sm leading-6 text-white/55">{evidence.readableExcerpt}</p>{account.buyingSignals.filter((signal) => signal.evidenceExcerpt).map((signal) => <p key={signal.id} className="mt-3 border-l-2 border-[#36d399] pl-3 text-sm text-white/70">{signal.signalType}: {signal.summary} <span className="text-white/35">· {signal.verified ? "verified" : "unverified"} · {signal.freshness}</span></p>)}</div>)}</div>
    {account.firstMoveDraft ? <div className="mt-5 rounded-xl border border-[#f5c542]/30 bg-[#f5c542]/10 p-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f5c542]">First-move draft · {account.firstMoveDraft.recommendedChannel}</p><h5 className="mt-2 font-bold">{account.firstMoveDraft.subject}</h5><p className="mt-2 text-sm leading-6 text-white/70">{account.firstMoveDraft.opening}</p><p className="mt-3 text-sm text-white/60"><strong className="text-white/80">Ask:</strong> {account.firstMoveDraft.ask}</p></div> : canDraft && account.firstMoveDraft === null ? <button type="button" disabled={isDrafting} onClick={() => onDraft(account.id)} className="mt-5 rounded-full border border-[#f5c542]/40 px-4 py-2 text-sm font-bold text-[#f5c542] disabled:opacity-50">{isDrafting ? "Drafting…" : "Draft first move"}</button> : null}
    {account.unresolvedQuestions.length > 0 ? <p className="mt-5 text-sm text-[#f5c542]/80">Open questions: {account.unresolvedQuestions.join(" · ")}</p> : null}</article>;
}
