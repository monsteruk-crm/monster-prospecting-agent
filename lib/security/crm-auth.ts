import { timingSafeEqual } from "node:crypto";
import { z } from "zod";

const CrmRoleSchema = z.enum(["CRM_OPERATOR", "ADMIN"]);
const CrmAuthConfigSchema = z.object({
  token: z.string().trim().min(16),
  organizationId: z.string().trim().min(1).max(120),
  role: CrmRoleSchema.default("CRM_OPERATOR"),
});

export class CrmAuthConfigurationError extends Error {
  readonly code = "CRM_AUTH_CONFIGURATION_ERROR";

  constructor(message: string) {
    super(message);
    this.name = "CrmAuthConfigurationError";
  }
}

export class CrmAuthorizationError extends Error {
  readonly code: "CRM_UNAUTHENTICATED" | "CRM_FORBIDDEN";

  constructor(code: "CRM_UNAUTHENTICATED" | "CRM_FORBIDDEN", message: string) {
    super(message);
    this.name = "CrmAuthorizationError";
    this.code = code;
  }
}

function configuredCrmAuth(env: Record<string, string | undefined> = process.env) {
  const parsed = CrmAuthConfigSchema.safeParse({
    token: env.CRM_DRY_RUN_SERVICE_TOKEN,
    organizationId: env.CRM_DRY_RUN_ORGANIZATION_ID,
    role: env.CRM_DRY_RUN_SERVICE_ROLE ?? "CRM_OPERATOR",
  });
  if (!parsed.success) {
    throw new CrmAuthConfigurationError("CRM dry-run authentication is not configured. Set CRM_DRY_RUN_SERVICE_TOKEN, CRM_DRY_RUN_ORGANIZATION_ID and a supported CRM_DRY_RUN_SERVICE_ROLE.");
  }
  return parsed.data;
}

function tokenMatches(expected: string, received: string): boolean {
  const expectedBytes = Buffer.from(expected);
  const receivedBytes = Buffer.from(received);
  return expectedBytes.length === receivedBytes.length && timingSafeEqual(expectedBytes, receivedBytes);
}

export function authorizeCrmDryRun(request: Request, env?: Record<string, string | undefined>) {
  const config = configuredCrmAuth(env);
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";
  if (!token || !tokenMatches(config.token, token)) {
    throw new CrmAuthorizationError("CRM_UNAUTHENTICATED", "A valid CRM service bearer token is required.");
  }
  const organizationId = request.headers.get("x-monster-organization-id")?.trim();
  if (!organizationId || organizationId !== config.organizationId) {
    throw new CrmAuthorizationError("CRM_FORBIDDEN", "The service is not authorized for this organisation.");
  }
  if (config.role !== "CRM_OPERATOR" && config.role !== "ADMIN") {
    throw new CrmAuthorizationError("CRM_FORBIDDEN", "The configured service role cannot run CRM dry-runs.");
  }
  return { organizationId, role: config.role };
}
