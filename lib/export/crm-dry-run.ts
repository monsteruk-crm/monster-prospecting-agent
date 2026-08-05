import { z } from "zod";

import { getPrismaClient } from "@/lib/db/client";
import { Prisma, type PrismaClient } from "@/prisma/generated/client";
import { buildApprovedLeadExport, LeadExportRowSchema } from "@/lib/export/lead-export";

export const CrmDryRunRequestSchema = z.object({
  missionRunId: z.string().trim().min(1).max(200),
  idempotencyKey: z.string().trim().min(1).max(200).default("default"),
  existingCompanyNames: z.array(z.string().trim().min(1).max(200)).max(1000).default(() => []),
  optedOutAccountIds: z.array(z.string().trim().min(1).max(300)).max(1000).default(() => []),
});

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export async function buildCrmDryRun(rawInput: unknown, client: PrismaClient | undefined = undefined, organizationId = "unscoped") {
  const input = CrmDryRunRequestSchema.parse(rawInput);
  const db = client ?? getPrismaClient();
  const exportResult = await buildApprovedLeadExport({ missionRunId: input.missionRunId, mode: "DRY_RUN" }, client);
  const existingNames = new Set(input.existingCompanyNames.map(normalize));
  const optedOutIds = new Set(input.optedOutAccountIds);
  const run = await db.salesMissionRun.findUnique({ where: { id: input.missionRunId }, select: { missionId: true, accounts: { select: { id: true, companyName: true } } } });
  if (!run) throw new Error("RUN_NOT_FOUND");
  const accountIdByCompany = new Map(run.accounts.map((account) => [normalize(account.companyName), account.id]));
  const accepted: z.infer<typeof LeadExportRowSchema>[] = [];
  const rejected: Array<{ company_name: string; reason: "DUPLICATE" | "OPTED_OUT" }> = [];
  for (const row of exportResult.rows) {
    const accountId = accountIdByCompany.get(normalize(row.company_name));
    if (accountId && optedOutIds.has(accountId)) { rejected.push({ company_name: row.company_name, reason: "OPTED_OUT" }); continue; }
    if (existingNames.has(normalize(row.company_name))) { rejected.push({ company_name: row.company_name, reason: "DUPLICATE" }); continue; }
    accepted.push(row);
  }
  const result = { accepted, rejected, duplicate: rejected.filter((row) => row.reason === "DUPLICATE"), opted_out: rejected.filter((row) => row.reason === "OPTED_OUT"), validation_errors: [] as string[], mode: "DRY_RUN" as const };
  const auditKey = `${input.missionRunId}:crm-dry-run:${input.idempotencyKey}`;
  await db.missionAuditEvent.upsert({
    where: { idempotencyKey: auditKey },
    create: { id: `audit:${auditKey}`, idempotencyKey: auditKey, missionId: run.missionId, missionRunId: input.missionRunId, eventType: "CRM_DRY_RUN", payload: JSON.parse(JSON.stringify({ organizationId, accepted: accepted.length, rejected: rejected.length, duplicate: result.duplicate.length, opted_out: result.opted_out.length })) as Prisma.InputJsonValue },
    update: { payload: JSON.parse(JSON.stringify({ organizationId, accepted: accepted.length, rejected: rejected.length, duplicate: result.duplicate.length, opted_out: result.opted_out.length })) as Prisma.InputJsonValue },
  });
  return result;
}
