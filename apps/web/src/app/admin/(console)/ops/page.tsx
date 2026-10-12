import { BellRing, CalendarClock, FileText, Send } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { EmptyState, Forbidden, PageHeader, StatTile, StatusPill, formatDateTime, timeAgo } from "@/components/admin/ui";
import { RunTickButton } from "@/components/admin/RunTickButton";
import { getAdminActor } from "@/server/admin/session";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const JOB_LABELS: Record<string, string> = { "nightly-nudge": "Nightly reminders", "weekly-report": "Weekly reports" };

export default async function AdminOpsPage() {
    const actor = (await getAdminActor())!;
    if (!can(actor.role, "ops:view")) return <Forbidden />;

    const now = Date.now();
    const since = new Date(now - WEEK_MS);
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
                eyebrow="~/system/jobs"
                title="Jobs"
                description="The scheduler calls /api/jobs/tick hourly. Each tick sends due reminders and weekly reports in every user's timezone. Deliveries are idempotent, so overlapping ticks never send twice."
                actions={<RunTickButton />}
            />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                <StatTile label="Reminder subs" value={nudgeSubs} icon={<BellRing size={14} />} tint="var(--series-7)" />
                <StatTile label="Report subs" value={reportSubs} icon={<FileText size={14} />} tint="var(--series-1)" />
                <StatTile label="Reminders 7d" value={count("NUDGE", "SENT")} icon={<Send size={14} />} tint="var(--series-3)"
                    hint={`${count("NUDGE", "SKIPPED")} skipped · ${count("NUDGE", "FAILED")} failed`} />
                <StatTile label="Reports 7d" value={count("WEEKLY_REPORT", "SENT")} icon={<CalendarClock size={14} />} tint="var(--series-4)"
                    hint={`${count("WEEKLY_REPORT", "FAILED")} failed`} />
            </div>

            <h2 className="text-sm font-black mb-3">Recent runs</h2>
            {runs.length === 0 ? (
                <EmptyState>No runs yet. Configure the QStash schedule (or run the local scheduler) and runs will appear here.</EmptyState>
            ) : (
                <ul className="card divide-y-2 divide-dashed divide-[rgb(var(--border))]/25">
                    {runs.map((r) => {
                        const stats = (r.stats ?? {}) as Record<string, number>;
                        const tone = r.status === "success" ? "good" : r.status === "failed" ? "bad" : "warn";
                        return (
                            <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                                <div className="flex items-center gap-3 min-w-[13rem] flex-1">
                                    <StatusPill tone={tone}>{r.status}</StatusPill>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold">{JOB_LABELS[r.job] ?? r.job}</p>
                                        <p className="text-[11px] text-[rgb(var(--ink-muted))]" title={formatDateTime(r.startedAt)}>
                                            {timeAgo(r.startedAt, now)} · <span className="font-mono">{r.durationMs != null ? `${r.durationMs} ms` : "running"}</span>
                                        </p>
                                    </div>
                                </div>
                                {r.error ? (
                                    <p className="w-full sm:w-auto font-mono text-[11px] text-red-600 dark:text-red-400 break-all">{r.error}</p>
                                ) : (
                                    <div className="flex flex-wrap gap-1.5">
                                        {Object.entries(stats).map(([k, v]) => (
                                            <span key={k} className={`px-2 h-5 inline-flex items-center rounded-full text-[10px] font-bold ${k === "failed" && v > 0 ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" : k === "sent" && v > 0 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-[rgb(var(--paper-alt))] text-[rgb(var(--ink-muted))]"}`}>
                                                {k} <b className="font-mono ml-1">{v}</b>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </>
    );
}
