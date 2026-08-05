import { NextResponse } from "next/server";
import { ensureStoredScoutSettings, getEffectiveScoutSettings, updateScoutSettings } from "@/lib/settings/settings-service";
import { ScoutSettingsPatchSchema } from "@/lib/settings/scout-settings";

export const runtime = "nodejs";

function canWrite(request: Request): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  const expected = process.env.SETTINGS_ADMIN_TOKEN;
  return Boolean(expected && request.headers.get("x-settings-admin-token") === expected);
}

export async function GET() {
  const effective = await (async () => {
    try {
      const stored = await ensureStoredScoutSettings();
      return { ...stored, source: "DATABASE" as const };
    } catch {
      return getEffectiveScoutSettings();
    }
  })();
  return NextResponse.json(effective, { headers: { "cache-control": "no-store" } });
}

export async function PATCH(request: Request) {
  if (!canWrite(request)) return NextResponse.json({ error: { code: "SETTINGS_WRITE_NOT_CONFIGURED", message: "Settings writes require the local environment or SETTINGS_ADMIN_TOKEN." } }, { status: 403 });
  const payload = await request.json() as { version?: number; patch?: unknown; changeSummary?: string };
  const parsed = ScoutSettingsPatchSchema.safeParse(payload.patch);
  if (!parsed.success || !Number.isInteger(payload.version) || (payload.version ?? 0) < 0) return NextResponse.json({ error: { code: "INVALID_SETTINGS", message: "The complete settings patch and observed version are required.", issues: parsed.success ? undefined : parsed.error.issues } }, { status: 400 });
  try {
    const result = await updateScoutSettings({ version: payload.version!, patch: parsed.data as Record<string, unknown>, changedBy: request.headers.get("x-settings-actor") ?? "operator", changeSummary: payload.changeSummary });
    return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && (error.name === "SETTINGS_VERSION_CONFLICT" || error.message === "SETTINGS_VERSION_CONFLICT")) return NextResponse.json({ error: { code: "SETTINGS_VERSION_CONFLICT", message: "Settings changed since they were loaded. Reload before saving." } }, { status: 409 });
    throw error;
  }
}
