"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { ProspectAccountCategoryPicker } from "@/components/prospect-account-category-picker";
import { getProspectCategoryDefinition, type ProspectAccountCategory } from "@/lib/sales/prospect-taxonomy";

function list(value: string): string[] {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function categoriesSummary(categories: ProspectAccountCategory[]): string {
  if (categories.length === 0) return "Select target categories";
  return categories.map((category) => getProspectCategoryDefinition(category).label).join(", ");
}

export function MissionBuilder() {
  const router = useRouter();
  const [name, setName] = useState("European operators");
  const [territory, setTerritory] = useState("United Kingdom");
  const [selectedCategories, setSelectedCategories] = useState<ProspectAccountCategory[]>([]);
  const [product, setProduct] = useState("THE_MONSTER");
  const [target, setTarget] = useState("5");
  const [targetTouched, setTargetTouched] = useState(false);
  const [signals, setSignals] = useState("new programme, expansion, partnership");
  const [freshness, setFreshness] = useState("365");
  const [contact, setContact] = useState("ANY_ROUTE");
  const [roles, setRoles] = useState("Managing Director");
  const [instructions, setInstructions] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [error, setError] = useState("");
  const [launching, setLaunching] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch("/api/settings/effective", { cache: "no-store" })
      .then(async (response) => response.ok ? await response.json() as { settings?: { missionBudgets?: { maxCandidateAccounts?: number } } } : null)
      .then((payload) => {
        const configuredTarget = payload?.settings?.missionBudgets?.maxCandidateAccounts;
        if (active && !targetTouched && Number.isInteger(configuredTarget)) setTarget(String(configuredTarget));
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [targetTouched]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLaunching(true);
    setError("");
    try {
      if (selectedCategories.length === 0) {
        throw new Error("Select at least one target account category.");
      }
      const response = await fetch("/api/missions/discover/stream", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          owner: "Nick",
          geographies: list(territory),
          accountCategories: selectedCategories,
          productFocus: product,
          contactRequirement: contact,
          requiredSignals: [],
          preferredSignals: list(signals),
          buyerRoles: list(roles),
          freshnessWindowDays: Number(freshness),
          instructions,
          limits: { maxCandidateAccounts: Number(target) },
        }),
      });
      if (!response.ok) {
        throw new Error(((await response.json()) as { error?: { message?: string } }).error?.message ?? "The mission could not be launched.");
      }
      if (!response.body) {
        throw new Error("The mission stream was unavailable.");
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let id = "";
      while (true) {
        const chunk = await reader.read();
        buffer += decoder.decode(chunk.value ?? new Uint8Array(), { stream: !chunk.done });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const message = JSON.parse(line) as { missionRunId?: string; type?: string };
          if (message.missionRunId) {
            id = message.missionRunId;
          }
        }
        if (chunk.done) break;
      }
      if (!id) {
        throw new Error("The mission ended without a run ID.");
      }
      router.push(`/runs/${id}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The mission could not be launched.");
      setLaunching(false);
    }
  }

  return <div className="mx-auto max-w-6xl">
    <header className="page-heading">
      <div>
        <p className="eyebrow">New mission</p>
        <h1>Define the hunt.</h1>
        <p>Give Scout a territory, target account categories, and the opportunity worth finding.</p>
      </div>
    </header>

    <form onSubmit={submit} className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="space-y-5">
        <section className="major-surface">
          <p className="eyebrow">The essentials</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Mission name" value={name} onChange={setName} required />
            <Field label="Territory" value={territory} onChange={setTerritory} required />
            <label className="field">
              Product
              <select value={product} onChange={(event) => setProduct(event.target.value)}>
                <option value="THE_MONSTER">The Monster</option>
                <option value="MEGA_BOUNCE_HOUSE">Mega Bounce House</option>
                <option value="UNDECIDED">Undecided</option>
              </select>
            </label>
            <label className="field">
              Target accounts
              <input type="number" min="1" max="25" value={target} onChange={(event) => { setTargetTouched(true); setTarget(event.target.value); }} />
            </label>
          </div>
        </section>

        <section className="major-surface">
          <ProspectAccountCategoryPicker
            value={selectedCategories}
            onChange={setSelectedCategories}
            error={error && selectedCategories.length === 0 ? error : undefined}
          />
        </section>

        <section className="major-surface">
          <p className="eyebrow">Opportunity signals</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Look for" value={signals} onChange={setSignals} />
            <label className="field">
              Freshness window
              <select value={freshness} onChange={(event) => setFreshness(event.target.value)}>
                <option value="90">Last 90 days</option>
                <option value="365">Last 12 months</option>
                <option value="1095">Last 3 years</option>
              </select>
            </label>
          </div>
        </section>

        <section className="major-surface">
          <p className="eyebrow">Contact goal</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="field">
              Preferred route
              <select value={contact} onChange={(event) => setContact(event.target.value)}>
                <option value="ANY_ROUTE">Any verified public route</option>
                <option value="PUBLIC_EMAIL">Public email required</option>
              </select>
            </label>
            <Field label="Preferred buyer roles" value={roles} onChange={setRoles} />
          </div>
          <p className="mt-4 text-xs text-white/45">Scout only uses public, attributable contact routes. It never guesses an email.</p>
        </section>

        <section className="major-surface">
          <p className="eyebrow">Strategic instruction</p>
          <label className="field mt-5">
            Anything Scout should know?
            <textarea rows={4} value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder="Prioritise organisations with partnership or programming routes." />
          </label>
        </section>

        <section className="major-surface">
          <button type="button" className="text-sm text-white/60" onClick={() => setAdvanced(!advanced)}>
            {advanced ? "Hide" : "Show"} advanced configuration
          </button>
          {advanced ? <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Maximum searches" value="24" onChange={() => undefined} />
            <Field label="Maximum pages" value="40" onChange={() => undefined} />
          </div> : null}
        </section>

        {error && selectedCategories.length > 0 ? <p className="alert alert-error" role="alert">{error}</p> : null}
      </div>

      <aside className="h-fit lg:sticky lg:top-8">
        <div className="summary-panel">
          <p className="eyebrow">Mission summary</p>
          <h2 className="mt-3 text-2xl font-bold">{name || "Untitled mission"}</h2>
          <div className="mt-6 space-y-3 text-sm text-white/65">
            <p>{target} target accounts</p>
            <p>{territory || "Territory to choose"}</p>
            <p>{categoriesSummary(selectedCategories)}</p>
            <p>Signals from last {freshness} days</p>
            <p>{contact === "PUBLIC_EMAIL" ? "Public email required" : "Public commercial route preferred"}</p>
            <p>Maximum spend: $5</p>
          </div>
          <button className="primary-button mt-8 w-full" disabled={launching}>
            {launching ? "Scout is hunting…" : "Launch hunt"}
          </button>
        </div>
      </aside>
    </form>
  </div>;
}

function Field({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return <label className="field">
    {label}
    <input required={required} value={value} onChange={(event) => onChange(event.target.value)} />
  </label>;
}
