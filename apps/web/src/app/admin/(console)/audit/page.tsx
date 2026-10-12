import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { EmptyState, Forbidden, PageHeader, describeAction, formatDateTime } from "@/components/admin/ui";
import { getAdminActor } from "@/server/admin/session";

const AREA_COLORS: Record<string, string> = { kb: "var(--series-1)", user: "var(--series-7)", jobs: "var(--series-4)" };

export default async function AdminAuditPage() {
    const actor = (await getAdminActor())!;
    if (!can(actor.role, "audit:view")) return <Forbidden />;

    const entries = await prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
        include: { actor: { select: { email: true } } },
    });

    const days: { day: string; items: typeof entries }[] = [];
    for (const e of entries) {
        const day = e.createdAt.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
        if (days[days.length - 1]?.day !== day) days.push({ day, items: [] });
        days[days.length - 1].items.push(e);
    }

    return (
        <>
            <PageHeader eyebrow="~/people/audit" title="Audit log" description="Every privileged action taken in this console (latest 200, times in UTC)." />
            {entries.length === 0 ? (
                <EmptyState>Nothing recorded yet.</EmptyState>
            ) : (
                <div className="space-y-6">
                    {days.map(({ day, items }) => (
                        <section key={day}>
                            <h2 className="text-[11px] font-black uppercase tracking-widest text-[rgb(var(--ink-muted))] mb-2">{day}</h2>
                            <ol className="card px-4 py-2">
                                {items.map((e, i) => {
                                    const { area, label } = describeAction(e.action);
                                    const meta = e.meta && typeof e.meta === "object" ? Object.entries(e.meta as Record<string, unknown>) : [];
                                    return (
                                        <li key={e.id} className="relative flex gap-3 py-2.5">
                                            {i < items.length - 1 && <span className="absolute left-[7px] top-6 -bottom-1 w-0.5 bg-[rgb(var(--ink)/0.1)]" />}
                                            <span className="relative mt-1 w-4 h-4 flex-shrink-0 rounded-full border-[3px] border-[rgb(var(--card-bg))] ring-2 ring-[rgb(var(--ink)/0.12)]" style={{ background: `rgb(${AREA_COLORS[area] ?? "var(--ink-muted)"})` }} />
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                                                    <p className="text-sm">
                                                        <b>{label}</b>
                                                        {e.target && <span className="font-mono text-xs text-[rgb(var(--ink-muted))]"> {e.target}</span>}
                                                    </p>
                                                    <p className="text-xs text-[rgb(var(--ink-muted))] whitespace-nowrap" title={formatDateTime(e.createdAt)}>
                                                        {e.createdAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })}
                                                    </p>
                                                </div>
                                                <p className="text-xs text-[rgb(var(--ink-muted))] mt-0.5">
                                                    by <span className="font-mono">{e.actor?.email ?? "deleted user"}</span>
                                                    <span className="font-mono text-[10px] ml-2 opacity-70">{e.action}</span>
                                                </p>
                                                {meta.length > 0 && (
                                                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                        {meta.map(([k, v]) => (
                                                            <span key={k} className="px-2 h-5 inline-flex items-center rounded-full bg-[rgb(var(--paper-alt))] text-[10px] text-[rgb(var(--ink-muted))]">
                                                                {k} <b className="font-mono ml-1 text-[rgb(var(--ink))]">{typeof v === "object" ? JSON.stringify(v) : String(v)}</b>
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ol>
                        </section>
                    ))}
                </div>
            )}
        </>
    );
}
