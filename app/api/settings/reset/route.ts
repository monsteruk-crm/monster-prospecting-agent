import { NextResponse } from "next/server";
import { resetScoutSettings } from "@/lib/settings/settings-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production" && (!process.env.SETTINGS_ADMIN_TOKEN || request.headers.get("x-settings-admin-token") !== process.env.SETTINGS_ADMIN_TOKEN)) return NextResponse.json({ error: { code: "SETTINGS_WRITE_NOT_CONFIGURED", message: "Settings reset requires the configured settings admin token." } }, { status: 403 });
  const result = await resetScoutSettings(request.headers.get("x-settings-actor") ?? "operator");
  return NextResponse.json(result);
}
