import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { EmptyState, Forbidden, PageHeader, StatTile, formatDateTime } from "@/components/admin/ui";
import { RunTickButton } from "@/components/admin/RunTickButton";
import { getAdminActor } from "@/server/admin/session";
import { cn } from "@/lib/utils";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export default async function AdminOpsPage() {
    const actor = (await getAdminActor())!;
    if (!can(actor.role, "ops:view")) return <Forbidden />;

    const since = new Date(Date.now() - WEEK_MS);
    const [runs, deliveries, nudgeSubs, reportSubs] = await Promise.all([
        prisma.jobRun.findMany({ orderBy: { startedAt: "desc" }, take: 40 }),
        prisma.notificationLog.groupBy({ by: ["kind", "status"], where: { createdAt: { gte: since } }, _count: true }),
        prisma.userPreference.count({ where: { nudgeEnabled: true, ntfyTopic: { not: null } } }),
        prisma.userPreference.count({ where: { weeklyReportEnabled: true } }),
    ]);
    const count = (kind: string, status: string) => deliveries.find((d) => d.kind === kind && d.status === status)?._count ?? 0;

    return (
        <>
            <PageHeader
                title="Jobs"
                description="The scheduler calls /api/jobs/tick hourly. Each tick sends due nightly reminders and weekly reports in every user's timezone; deliveries are idempotent."
                actions={<RunTickButton />}
            />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                <StatTile label="Reminder subscribers" value={nudgeSubs} />
                <StatTile label="Report subscribers" value={reportSubs} />
                <StatTile label="Reminders (7d)" value={count("NUDGE", "SENT")} hint={`${count("NUDGE", "SKIPPED")} skipped (all done) · ${count("NUDGE", "FAILED")} failed`} />
                <StatTile label="Reports (7d)" value={count("WEEKLY_REPORT", "SENT")} hint={`${count("WEEKLY_REPORT", "FAILED")} failed`} />
            </div>

            <p className="text-[10px] font-black uppercase tracking-widest text-[rgb(var(--ink-muted))] mb-3">Recent runs</p>
            {runs.length === 0 ? (
                <EmptyState>No runs yet. Configure the QStash schedule (or run the local scheduler) and runs will appear here.</EmptyState>
            ) : (
                <div className="card overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b-2 border-[rgb(var(--border))] text-left text-[10px] font-black uppercase tracking-widest text-[rgb(var(--ink-muted))]">
                                <th className="px-4 py-3">Started</th>
                                <th className="px-4 py-3">Job</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 text-right">Duration</th>
                                <th className="px-4 py-3">Result</th>
                            </tr>
                        </thead>
                        <tbody>
                            {runs.map((r) => (
                                <tr key={r.id} className="border-b border-dashed border-[rgb(var(--border))] last:border-0 align-top">
                                    <td className="px-4 py-2.5 text-xs whitespace-nowrap">{formatDateTime(r.startedAt)}</td>
                                    <td className="px-4 py-2.5 font-mono text-xs font-bold">{r.job}</td>
                                    <td className="px-4 py-2.5">
                                        <span className={cn(
                                            "text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 border-2",
                                            r.status === "success" && "bg-brand-500 text-white border-ink",
                                            r.status === "failed" && "bg-red-600 text-white border-ink",
                                            r.status === "running" && "border-[rgb(var(--border))]",
                                        )}>{r.status}</span>
                                    </td>
                                    <td className="px-4 py-2.5 text-right font-mono text-xs">{r.durationMs != null ? `${r.durationMs} ms` : "—"}</td>
                                    <td className="px-4 py-2.5 font-mono text-[11px] text-[rgb(var(--ink-muted))] break-all">
                                        {r.error ?? (r.stats ? JSON.stringify(r.stats) : "")}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </>
    );
}
