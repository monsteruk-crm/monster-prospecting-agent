"use client";

import { useState } from "react";

type SmokeResponse = {
  missionTitle?: string;
  status?: "ready";
  error?: { code: string; message: string };
};

const stages = ["Brief", "ICP", "Discovery", "Signals", "Contact Map", "Sales Angle", "Review"];

export function MissionControl() {
  const [smoke, setSmoke] = useState<SmokeResponse | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  async function runSmokeTest() {
    setIsRunning(true);
    setSmoke(null);

    try {
      const response = await fetch("/api/smoke", { method: "POST" });
      const payload = (await response.json()) as SmokeResponse;
      setSmoke(payload);
    } catch {
      setSmoke({
        error: {
          code: "NETWORK_ERROR",
          message: "The smoke route could not be reached.",
        },
      });
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <main className="scout-grid min-h-screen overflow-hidden bg-[#0a0d12] px-5 py-6 text-[#f5f7fa] sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-4 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.24em] text-[#f5c542]">
              <span className="h-2 w-2 rounded-full bg-[#f5c542] shadow-[0_0_16px_#f5c542]" />
              Monster Scout
            </div>
            <h1 className="max-w-3xl text-4xl font-black tracking-[-0.04em] sm:text-6xl">
              The AI hunting machine for the next Monster deal.
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-2 self-start rounded-full border border-[#f5c542]/30 bg-[#f5c542]/10 px-3 py-2 text-xs font-semibold text-[#f5c542] sm:self-end">
            <span className="h-2 w-2 rounded-full bg-[#f5c542]" />
            Standalone MVP · Act 0
          </div>
        </header>

        <section className="grid gap-5 py-8 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="rounded-3xl border border-white/10 bg-[#11161e]/90 p-6 shadow-2xl sm:p-8">
            <div className="mb-12 flex items-start justify-between gap-4">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-white/45">Sales Mission Control</p>
                <h2 className="text-2xl font-bold">Find the next credible conversation.</h2>
                <p className="mt-3 max-w-xl leading-7 text-white/55">
                  The mission surface is ready. Live discovery, buying-signal verification and contact mapping are intentionally not connected yet.
                </p>
              </div>
              <div className="hidden rounded-2xl border border-[#36d399]/25 bg-[#36d399]/10 px-3 py-2 text-right sm:block">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#36d399]">System state</p>
                <p className="mt-1 text-sm font-semibold text-white">Foundation ready</p>
              </div>
            </div>

            <div className="mb-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-white/[0.045] p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-white/40">Mission</p>
                <p className="mt-2 font-semibold">New Monster buyers</p>
              </div>
              <div className="rounded-2xl bg-white/[0.045] p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-white/40">Scope</p>
                <p className="mt-2 font-semibold">Benelux · DACH</p>
              </div>
              <div className="rounded-2xl bg-white/[0.045] p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-white/40">Output</p>
                <p className="mt-2 font-semibold">Review-ready briefs</p>
              </div>
            </div>

            <div className="mb-8">
              <div className="mb-3 flex items-center justify-between text-xs font-bold uppercase tracking-[0.16em] text-white/40">
                <span>Mission stages</span>
                <span>0 / 7 active</span>
              </div>
              <ol className="grid gap-2 sm:grid-cols-4 lg:grid-cols-7">
                {stages.map((stage, index) => (
                  <li key={stage} className="rounded-xl border border-white/10 bg-white/[0.025] px-3 py-3 text-sm text-white/45">
                    <span className="mr-2 font-mono text-xs text-[#f5c542]/70">0{index + 1}</span>
                    {stage}
                  </li>
                ))}
              </ol>
            </div>

            <button
              type="button"
              onClick={runSmokeTest}
              disabled={isRunning}
              className="rounded-full bg-[#f5c542] px-5 py-3 text-sm font-bold text-[#0a0d12] transition hover:bg-[#ffd761] disabled:cursor-wait disabled:opacity-60"
            >
              {isRunning ? "Checking gateway…" : "Run AI Gateway smoke test"}
            </button>

            {smoke ? (
              <div className={`mt-5 rounded-2xl border p-4 text-sm ${smoke.error ? "border-[#ff7d7d]/30 bg-[#ff7d7d]/10 text-[#ffb0b0]" : "border-[#36d399]/30 bg-[#36d399]/10 text-[#b7f5dd]"}`} role="status">
                {smoke.error ? (
                  <>
                    <p className="font-bold">{smoke.error.code}</p>
                    <p className="mt-1">{smoke.error.message}</p>
                  </>
                ) : (
                  <>
                    <p className="font-bold">Gateway smoke test passed.</p>
                    <p className="mt-1">Mission title: {smoke.missionTitle}</p>
                  </>
                )}
              </div>
            ) : null}
          </div>

          <aside className="rounded-3xl border border-white/10 bg-[#0f141b]/90 p-6 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#f5c542]">What this proves</p>
            <ul className="mt-6 space-y-5">
              {[
                ["01", "Standalone boundary", "No Monster CRM reads or writes in bootstrap."],
                ["02", "Evidence first", "A website alone is not a lead."],
                ["03", "Human review", "Models prepare recommendations; Nick decides."],
              ].map(([number, title, detail]) => (
                <li key={number} className="flex gap-4">
                  <span className="font-mono text-xs text-white/30">{number}</span>
                  <div>
                    <p className="font-semibold">{title}</p>
                    <p className="mt-1 text-sm leading-6 text-white/45">{detail}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-10 border-t border-white/10 pt-5 text-sm leading-6 text-white/45">
              Act 0 intentionally stops before live search, buying-signal detection, contact discovery, scoring, interrupts, vector ingestion and CRM integration.
            </div>
          </aside>
        </section>

        <footer className="flex flex-col gap-2 border-t border-white/10 py-5 text-xs text-white/35 sm:flex-row sm:justify-between">
          <span>MONSTER SCOUT / Sales Mission Control</span>
          <span>Prepared for evidence-backed commercial research.</span>
        </footer>
      </div>
    </main>
  );
}
