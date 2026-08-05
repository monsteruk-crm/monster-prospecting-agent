import { AppShell } from "@/components/app-shell";
import { RunsPage } from "@/components/runs-page";
import { listMissionRuns } from "@/lib/persistence/mission-persistence";
export const dynamic = "force-dynamic";
export default async function RunsRoute() { let runs: Awaited<ReturnType<typeof listMissionRuns>> = []; try { runs = await listMissionRuns(50); } catch { /* database may not be configured */ } return <AppShell><RunsPage runs={runs} /></AppShell>; }
