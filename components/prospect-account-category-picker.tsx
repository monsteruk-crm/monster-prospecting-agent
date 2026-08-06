"use client";

import { useMemo, useState } from "react";

import {
  FEATURED_PROSPECT_ACCOUNT_CATEGORIES,
  PROSPECT_CATEGORY_DEFINITIONS,
  PROSPECT_CATEGORY_GROUPS,
  getProspectCategoryDefinition,
  getProspectCategorySearchText,
  type ProspectAccountCategory,
} from "@/lib/sales/prospect-taxonomy";

type ProspectAccountCategoryPickerProps = {
  value: ProspectAccountCategory[];
  onChange: (value: ProspectAccountCategory[]) => void;
  label?: string;
  helperText?: string;
  error?: string;
  maxSelected?: number;
};

type CategoryGroup = (typeof PROSPECT_CATEGORY_GROUPS)[number];

function toggleCategory(current: ProspectAccountCategory[], category: ProspectAccountCategory, maxSelected: number): ProspectAccountCategory[] {
  if (current.includes(category)) {
    return current.filter((item) => item !== category);
  }
  if (current.length >= maxSelected) {
    return current;
  }
  return [...current, category];
}

function groupLabel(group: CategoryGroup): string {
  const labels: Record<CategoryGroup, string> = {
    PROMOTERS_AND_EVENT_OPERATORS: "Promoters and event operators",
    ATTRACTIONS_AND_LEISURE: "Attractions and leisure",
    FESTIVALS_AND_PUBLIC_EVENTS: "Festivals and public events",
    VENUES_AND_DESTINATIONS: "Venues and destinations",
    AGENCIES_AND_PARTNERS: "Agencies and partners",
    PUBLIC_SECTOR_AND_PLACE_MANAGEMENT: "Public sector and place management",
    RIGHTS_LICENSING_AND_SPONSORSHIP: "Rights, licensing and sponsorship",
  };
  return labels[group];
}

export function ProspectAccountCategoryPicker({
  value,
  onChange,
  label = "Target account categories",
  helperText = "Select the types of organisations Monster Scout should search for. Keep each mission focused for better results.",
  error,
  maxSelected = 6,
}: ProspectAccountCategoryPickerProps) {
  const [query, setQuery] = useState("");
  const selected = useMemo(() => new Set(value), [value]);
  const normalizedQuery = query.trim().toLowerCase();
  const matchesQuery = (category: ProspectAccountCategory) => {
    if (!normalizedQuery) return true;
    return getProspectCategorySearchText(category).includes(normalizedQuery);
  };
  const featured = FEATURED_PROSPECT_ACCOUNT_CATEGORIES.filter((category) => matchesQuery(category));
  const grouped = PROSPECT_CATEGORY_GROUPS.map((group) => ({
    group,
    categories: Object.values(PROSPECT_CATEGORY_DEFINITIONS).filter((definition) => definition.group === group && matchesQuery(definition.value)),
  })).filter((section) => section.categories.length > 0);
  const selectedDefinitions = value.map((category) => getProspectCategoryDefinition(category));
  const canSelectMore = value.length < maxSelected;

  return <div className="space-y-4">
    <label className="field">
      {label}
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search categories, descriptions, or aliases"
        aria-describedby="prospect-category-picker-help"
      />
    </label>
    <p id="prospect-category-picker-help" className="text-xs text-white/45">{helperText}</p>
    {selectedDefinitions.length > 0 ? <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">Selected categories</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {selectedDefinitions.map((definition) => <button
          key={definition.value}
          type="button"
          onClick={() => onChange(value.filter((category) => category !== definition.value))}
          className="inline-flex items-center gap-2 rounded-full border border-[#f5c542]/25 bg-[#f5c542]/10 px-3 py-1.5 text-sm text-[#ffe9a3] transition hover:border-[#f5c542]/50"
        >
          <span>{definition.label}</span>
          <span className="text-xs text-white/40">Remove</span>
        </button>)}
      </div>
      <p className="mt-2 text-xs text-white/45">{value.length} of {maxSelected} selected.</p>
    </div> : <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-white/45">No target categories selected yet. Choose one or more from the featured list or a group below.</div>}
    {featured.length > 0 ? <section className="rounded-2xl border border-[#f5c542]/20 bg-[#f5c542]/[0.04] p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f5c542]">Featured categories</p>
          <p className="mt-1 text-sm text-white/50">The best first-release targets appear here first.</p>
        </div>
        <p className="text-xs text-white/45">Up to {maxSelected} total</p>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {featured.map((category) => {
          const definition = getProspectCategoryDefinition(category);
          const checked = selected.has(category);
          const disabled = !checked && !canSelectMore;
          return <CategoryTile
            key={definition.value}
            definition={definition}
            checked={checked}
            disabled={disabled}
            onToggle={() => onChange(toggleCategory(value, definition.value, maxSelected))}
          />;
        })}
      </div>
    </section> : null}
    {grouped.length > 0 ? <div className="space-y-4">
      {grouped.map(({ group, categories }) => <section key={group} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/50">{groupLabel(group)}</p>
          <p className="mt-1 text-xs text-white/35">{categories.length} matching option{categories.length === 1 ? "" : "s"}</p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map((definition) => {
            const checked = selected.has(definition.value);
            const disabled = !checked && !canSelectMore;
            return <CategoryTile
              key={definition.value}
              definition={definition}
              checked={checked}
              disabled={disabled}
              onToggle={() => onChange(toggleCategory(value, definition.value, maxSelected))}
            />;
          })}
        </div>
      </section>)}
    </div> : <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-white/45">No categories matched “{query.trim()}”. Try a label, description, or alias.</div>}
    {error ? <p className="text-sm text-[#ffb0b0]" role="alert">{error}</p> : null}
  </div>;
}

function CategoryTile({
  definition,
  checked,
  disabled,
  onToggle,
}: {
  definition: ReturnType<typeof getProspectCategoryDefinition>;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return <label className={`flex cursor-pointer gap-3 rounded-2xl border p-4 transition ${checked ? "border-[#f5c542]/50 bg-[#f5c542]/10" : "border-white/10 bg-black/10 hover:border-white/20"} ${disabled ? "opacity-50" : ""}`}>
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={onToggle}
      className="mt-1 h-4 w-4 rounded border-white/30 bg-black/30 text-[#f5c542] focus:ring-[#f5c542]"
    />
    <div className="min-w-0">
      <p className="font-semibold text-white">{definition.label}</p>
      <p className="mt-1 text-sm leading-6 text-white/55">{definition.description}</p>
      <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-white/35">
        {definition.defaultPriority} · {definition.likelyProductFit} · {definition.suggestedBuyerModels.join(" / ")}
      </p>
    </div>
  </label>;
}
