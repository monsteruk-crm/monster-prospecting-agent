import { z } from "zod";

import { getPrismaClient } from "@/lib/db/client";
import { Prisma, type PrismaClient } from "@/prisma/generated/client";
import { ContactRouteSchema, FirstMoveBriefSchema } from "@/lib/sales/contact-schema";
import { ProspectScoreSchema } from "@/lib/sales/score-engine";

export const LeadExportColumnSchema = z.enum([
  "company_name", "website", "country", "city", "contact_name", "role", "email", "source_url", "category", "size/signals", "notes", "confidence", "status", "owner", "last_touch", "opt_out",
]);
export const LeadExportColumns = LeadExportColumnSchema.options;

export const LeadExportRequestSchema = z.object({
  missionRunId: z.string().trim().min(1).max(200),
  mode: z.literal("DRY_RUN").default("DRY_RUN"),
});

export const LeadExportRowSchema = z.object({
  company_name: z.string().min(1),
  website: z.string(),
  country: z.string(),
  city: z.string(),
  contact_name: z.string(),
  role: z.string(),
  email: z.string(),
  source_url: z.string(),
  category: z.string(),
  "size/signals": z.string(),
  notes: z.string(),
  confidence: z.enum(["HIGH", "MEDIUM", "LOW", "UNKNOWN"]),
  status: z.enum(["APPROVED"]),
  owner: z.string(),
  last_touch: z.string(),
  opt_out: z.literal("false"),
});

export type LeadExportRow = z.infer<typeof LeadExportRowSchema>;
type PersistenceClient = PrismaClient | Prisma.TransactionClient;

function jsonArrayStrings(value: Prisma.JsonValue | null): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function csvCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export function leadRowsToCsv(rows: LeadExportRow[]): string {
  return [LeadExportColumns.join(","), ...rows.map((row) => LeadExportColumns.map((column) => csvCell(row[column])).join(","))].join("\n") + "\n";
}

export async function buildApprovedLeadExport(
  rawInput: unknown,
  client: PersistenceClient = getPrismaClient(),
) {
  const input = LeadExportRequestSchema.parse(rawInput);
  const run = await client.salesMissionRun.findUnique({
    where: { id: input.missionRunId },
    include: { mission: true, review: true, accounts: { include: { evidence: true, buyingSignals: true } } },
  });
  if (!run) throw new Error("RUN_NOT_FOUND");
  if (run.review?.status !== "APPROVED") throw new Error("APPROVAL_REQUIRED");

  const rows = run.accounts.map((account) => {
    const score = ProspectScoreSchema.safeParse(account.score).success ? ProspectScoreSchema.parse(account.score) : null;
    const routes = z.array(ContactRouteSchema).parse(account.contactRoutes);
    const route = routes[0];
    const signalText = account.buyingSignals.filter((signal) => signal.verified).map((signal) => `${signal.signalType}: ${signal.summary}`).join("; ");
    const draft = FirstMoveBriefSchema.safeParse(account.firstMoveDraft).success ? FirstMoveBriefSchema.parse(account.firstMoveDraft) : null;
    const unresolvedQuestions = jsonArrayStrings(account.unresolvedQuestions);
    const categories = jsonArrayStrings(account.categories);
    const notes = [draft?.opening, draft?.ask, unresolvedQuestions.length > 0 ? `Open questions: ${unresolvedQuestions.join("; ")}` : ""].filter(Boolean).join(" ");
    const sourceUrl = account.evidence[0]?.finalUrl ?? account.website ?? "";
    return LeadExportRowSchema.parse({
      company_name: account.companyName,
      website: account.website ?? "",
      country: account.country ?? "",
      city: account.city ?? "",
      contact_name: "",
      role: route?.targetRole ?? "",
      email: route?.email ?? "",
      source_url: sourceUrl,
      category: categories.join("; "),
      "size/signals": signalText,
      notes,
      confidence: score?.scoreState === "HOT" ? "HIGH" : score?.scoreState === "WARM" ? "MEDIUM" : score ? "LOW" : "UNKNOWN",
      status: "APPROVED",
      owner: run.mission.owner,
      last_touch: "",
      opt_out: "false",
    });
  });
  const csv = leadRowsToCsv(rows);
  const auditKey = `${run.id}:export:leads:dry-run`;
  await client.missionAuditEvent.upsert({
    where: { idempotencyKey: auditKey },
    create: { id: `audit:${auditKey}`, idempotencyKey: auditKey, missionId: run.missionId, missionRunId: run.id, eventType: "LEAD_EXPORT_DRY_RUN", payload: JSON.parse(JSON.stringify({ mode: input.mode, rowCount: rows.length })) as Prisma.InputJsonValue },
    update: { payload: JSON.parse(JSON.stringify({ mode: input.mode, rowCount: rows.length })) as Prisma.InputJsonValue },
  });
  return { csv, rows, rowCount: rows.length, mode: input.mode };
}
