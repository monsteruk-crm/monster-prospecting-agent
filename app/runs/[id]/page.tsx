import { AppShell } from "@/components/app-shell";
import { MissionControl } from "@/components/mission-control";
export default async function RunRoute({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <AppShell><div className="mb-6"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#f5c542]">Run dossier</p><h1 className="mt-2 text-3xl font-black">{id}</h1></div><MissionControl /></AppShell>; }
