import { describe, expect, test } from "vitest";

import { CrmDryRunRequestSchema } from "@/lib/export/crm-dry-run";

describe("CRM dry-run contract", () => {
  test("defaults to an idempotent dry-run request", () => {
    expect(CrmDryRunRequestSchema.parse({ missionRunId: "run-1" })).toMatchObject({ idempotencyKey: "default", existingCompanyNames: [], optedOutAccountIds: [] });
  });
});
