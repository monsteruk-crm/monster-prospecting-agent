import { randomUUID } from "node:crypto";
import { Prisma } from "@/prisma/generated/client";
import { getPrismaClient } from "@/lib/db/client";
import { ABSOLUTE_LIMITS_VERSION } from "@/lib/settings/absolute-limits";
import { SalesMissionBriefSchema, type SalesMissionBrief } from "@/lib/sales/mission-schema";
import {
  defaultScoutSettings,
  ScoutSettingsSchema,
  type ScoutSettings,
} from "@/lib/settings/scout-settings";

const SETTINGS_ID = "default";

function asJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function mergeSettings(base: ScoutSettings, patch: Record<string, unknown>): ScoutSettings {
  const merged = {
    ...base,
    ...patch,
    missionDefaults: { ...base.missionDefaults, ...(patch.missionDefaults as object | undefined) },
    missionBudgets: { ...base.missionBudgets, ...(patch.missionBudgets as object | undefined) },
    continuationBudgets: { ...base.continuationBudgets, ...(patch.continuationBudgets as object | undefined) },
    contactEnrichment: { ...base.contactEnrichment, ...(patch.contactEnrichment as object | undefined) },
    modelRouting: { ...base.modelRouting, ...(patch.modelRouting as object | undefined) },
    costPolicy: { ...base.costPolicy, ...(patch.costPolicy as object | undefined) },
    interface: { ...base.interface, ...(patch.interface as object | undefined) },
    absoluteLimitsVersion: ABSOLUTE_LIMITS_VERSION,
  };
  return ScoutSettingsSchema.parse(merged);
}

export async function getStoredScoutSettings() {
  const db = getPrismaClient();
  const row = await db.scoutSettings.findUnique({ where: { id: SETTINGS_ID } });
  return row ? { version: row.version, updatedAt: row.updatedAt.toISOString(), settings: ScoutSettingsSchema.parse(row.settings) } : null;
}

export async function getEffectiveScoutSettings(): Promise<{ version: number; settings: ScoutSettings; source: "DATABASE" | "BOOTSTRAP" }> {
  let stored: Awaited<ReturnType<typeof getStoredScoutSettings>> = null;
  try {
    stored = await getStoredScoutSettings();
  } catch {
    // The additive migration may not have been applied yet; retain the safe bootstrap path.
  }
  if (stored) return { version: stored.version, settings: stored.settings, source: "DATABASE" };
  return { version: 0, settings: defaultScoutSettings(), source: "BOOTSTRAP" };
}

export async function resolveMissionBrief(raw: unknown): Promise<{ brief: SalesMissionBrief; settingsVersion: number; settingsSnapshot: ScoutSettings }> {
  const effective = await getEffectiveScoutSettings();
  const incoming = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  const defaults = effective.settings.missionDefaults;
  const limits = effective.settings.missionBudgets;
  const brief = SalesMissionBriefSchema.parse({
    ...incoming,
    productFocus: incoming.productFocus ?? defaults.productFocus,
    contactRequirement: incoming.contactRequirement ?? defaults.contactRequirement,
    freshnessWindowDays: incoming.freshnessWindowDays ?? defaults.freshnessWindowDays,
    requiredSignals: incoming.requiredSignals ?? defaults.requiredSignals,
    preferredSignals: incoming.preferredSignals ?? defaults.preferredSignals,
    exclusions: incoming.exclusions ?? defaults.exclusions,
    limits: { ...limits, ...(incoming.limits && typeof incoming.limits === "object" ? incoming.limits : {}) },
  });
  return { brief, settingsVersion: effective.version, settingsSnapshot: effective.settings };
}

export async function ensureStoredScoutSettings(changedBy = "bootstrap") {
  const existing = await getStoredScoutSettings();
  if (existing) return existing;
  const settings = defaultScoutSettings();
  const db = getPrismaClient();
  const created = await db.$transaction(async (transaction) => {
    const row = await transaction.scoutSettings.create({ data: { id: SETTINGS_ID, schemaVersion: settings.schemaVersion, version: 1, settings: asJson(settings), updatedBy: changedBy } });
    await transaction.scoutSettingsRevision.create({ data: { id: randomUUID(), settingsId: SETTINGS_ID, version: 1, settings: asJson(settings), changedBy, changeSummary: "Initial settings bootstrap" } });
    return row;
  });
  return { version: created.version, updatedAt: created.updatedAt.toISOString(), settings };
}

export async function updateScoutSettings(input: { version: number; patch: Record<string, unknown>; changedBy?: string; changeSummary?: string }) {
  const current = await getEffectiveScoutSettings();
  if (current.version !== input.version) {
    const error = new Error("The settings were changed by another request.");
    error.name = "SETTINGS_VERSION_CONFLICT";
    throw error;
  }
  const next = mergeSettings(current.settings, input.patch);
  const db = getPrismaClient();
  const result = await db.$transaction(async (transaction) => {
    if (current.version === 0) {
      await transaction.scoutSettings.create({ data: { id: SETTINGS_ID, schemaVersion: next.schemaVersion, version: 1, settings: asJson(next), updatedBy: input.changedBy } });
      await transaction.scoutSettingsRevision.create({ data: { id: randomUUID(), settingsId: SETTINGS_ID, version: 1, settings: asJson(next), changedBy: input.changedBy, changeSummary: input.changeSummary ?? "Settings created" } });
      return { version: 1, settings: next };
    }
    const updated = await transaction.scoutSettings.updateMany({ where: { id: SETTINGS_ID, version: input.version }, data: { schemaVersion: next.schemaVersion, version: input.version + 1, settings: asJson(next), updatedBy: input.changedBy } });
    if (updated.count !== 1) throw new Error("SETTINGS_VERSION_CONFLICT");
    await transaction.scoutSettingsRevision.create({ data: { id: randomUUID(), settingsId: SETTINGS_ID, version: input.version + 1, settings: asJson(next), changedBy: input.changedBy, changeSummary: input.changeSummary ?? "Settings updated" } });
    return { version: input.version + 1, settings: next };
  });
  return result;
}

export async function resetScoutSettings(changedBy = "operator") {
  const current = await getEffectiveScoutSettings();
  return updateScoutSettings({ version: current.version, patch: defaultScoutSettings(), changedBy, changeSummary: "Reset to bootstrap defaults" });
}

export async function listScoutSettingsRevisions(limit = 20) {
  const db = getPrismaClient();
  return db.scoutSettingsRevision.findMany({ where: { settingsId: SETTINGS_ID }, orderBy: { version: "desc" }, take: Math.min(Math.max(limit, 1), 100), select: { id: true, version: true, changedBy: true, changeSummary: true, createdAt: true, settings: true } });
}
