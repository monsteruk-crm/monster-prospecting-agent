import Link from "next/link";

const navigation = [["Mission Control", "/"], ["New Mission", "/missions/new"], ["Executed Runs", "/runs"], ["Costs & Usage", "/costs"], ["Settings", "/settings"]] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[#08090b] text-white"><div className="mx-auto flex min-h-screen max-w-[1600px] flex-col lg:flex-row"><aside className="border-b border-white/10 bg-[#0d0f12] p-5 lg:w-64 lg:border-b-0 lg:border-r"><Link href="/" className="block"><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#f5c542]">The Monster</p><p className="mt-2 text-2xl font-black tracking-tight">SCOUT<span className="text-[#f5c542]">.</span></p></Link><nav aria-label="Primary navigation" className="mt-8 flex gap-2 overflow-x-auto lg:block lg:space-y-2">{navigation.map(([label, href]) => <Link key={href} href={href} className="block whitespace-nowrap rounded-xl px-3 py-2 text-sm text-white/60 transition hover:bg-white/10 hover:text-white">{label}</Link>)}</nav></aside><main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-10">{children}</main></div></div>;
}
