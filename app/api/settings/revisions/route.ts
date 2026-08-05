import { NextResponse } from "next/server";
import { listScoutSettingsRevisions } from "@/lib/settings/settings-service";

export const runtime = "nodejs";

export async function GET() {
  const revisions = await listScoutSettingsRevisions();
  return NextResponse.json({ revisions }, { headers: { "cache-control": "no-store" } });
}
