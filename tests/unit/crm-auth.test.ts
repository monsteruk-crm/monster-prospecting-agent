import { describe, expect, test } from "vitest";

import { CrmAuthConfigurationError, CrmAuthorizationError, authorizeCrmDryRun } from "@/lib/security/crm-auth";

const env = { CRM_DRY_RUN_SERVICE_TOKEN: "a-service-token-longer-than-16", CRM_DRY_RUN_ORGANIZATION_ID: "monster-scout", CRM_DRY_RUN_SERVICE_ROLE: "CRM_OPERATOR" };

describe("CRM dry-run authentication", () => {
  test("requires a valid bearer token and organisation scope", () => {
    expect(() => authorizeCrmDryRun(new Request("http://localhost"), env)).toThrowError(CrmAuthorizationError);
    expect(() => authorizeCrmDryRun(new Request("http://localhost", { headers: { authorization: `Bearer ${env.CRM_DRY_RUN_SERVICE_TOKEN}`, "x-monster-organization-id": "other" } }), env)).toThrowError(CrmAuthorizationError);
    expect(authorizeCrmDryRun(new Request("http://localhost", { headers: { authorization: `Bearer ${env.CRM_DRY_RUN_SERVICE_TOKEN}`, "x-monster-organization-id": "monster-scout" } }), env)).toMatchObject({ organizationId: "monster-scout", role: "CRM_OPERATOR" });
  });

  test("fails closed when service configuration is missing", () => {
    expect(() => authorizeCrmDryRun(new Request("http://localhost"), {})).toThrowError(CrmAuthConfigurationError);
  });
});
