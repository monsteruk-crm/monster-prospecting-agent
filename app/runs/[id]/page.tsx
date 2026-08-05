import { AppShell } from "@/components/app-shell";
import { MissionControl } from "@/components/mission-control";
export default async function RunRoute({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <AppShell><MissionControl mode="run" initialRunId={id} /></AppShell>; }
