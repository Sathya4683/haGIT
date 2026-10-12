import Link from "next/link";
import { BookOpen, FilePlus2, FlaskConical, GitCommitHorizontal, Layers, LineChart, UserCheck, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { getAdminActor } from "@/server/admin/session";
import { displayName } from "@/components/ui/Avatar";
import { EmptyState, PageHeader, Panel, StatTile, StatusPill, describeAction, formatDateTime, timeAgo } from "@/components/admin/ui";
import { DailyBars, Sparkline } from "@/components/admin/charts";
import { RunTickButton } from "@/components/admin/RunTickButton";
import { adminBasePath } from "@/server/admin/session";

const DAY_MS = 24 * 60 * 60 * 1000;
const DAYS = 30;
const JOBS = [
    { id: "nightly-nudge", label: "Nightly reminders", kind: "NUDGE" },
    { id: "weekly-report", label: "Weekly reports", kind: "WEEKLY_REPORT" },
] as const;

type DayRow = { d: string; n: number; users: number };

function lastDays(count: number, now: number) {
    return Array.from({ length: count }, (_, i) => new Date(now - (count - 1 - i) * DAY_MS).toISOString().slice(0, 10));
}

export default async function AdminOverviewPage() {
    const actor = (await getAdminActor())!;
    const base = adminBasePath();
    const now = Date.now();
    const since = new Date(`${lastDays(DAYS, now)[0]}T00:00:00Z`);
    const canOps = can(actor.role, "ops:view");
    const canKb = can(actor.role, "kb:write");
    const canAudit = can(actor.role, "audit:view");

    const [users, newUsers, habits, commits, commits24h, active7d, commitDays, signupDays, kbByStatus, chunks, unindexed, jobRuns, deliveries, audit] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { createdAt: { gte: new Date(now - 7 * DAY_MS) } } }),
        prisma.habit.count(),
        prisma.commit.count(),
        prisma.commit.count({ where: { timestamp: { gte: new Date(now - DAY_MS) } } }),
        prisma.commit.findMany({ where: { timestamp: { gte: new Date(now - 7 * DAY_MS) } }, distinct: ["userId"], select: { userId: true } }),
        prisma.$queryRaw<DayRow[]>`
            SELECT to_char(date_trunc('day', "timestamp"), 'YYYY-MM-DD') AS d, count(*)::int AS n, count(DISTINCT "userId")::int AS users
            FROM "Commit" WHERE "timestamp" >= ${since} GROUP BY 1`,
        prisma.$queryRaw<DayRow[]>`
            SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS d, count(*)::int AS n, 0 AS users
            FROM "User" WHERE "createdAt" >= ${since} GROUP BY 1`,
        prisma.kbArticle.groupBy({ by: ["status"], _count: true }),
        prisma.kbChunk.count(),
        prisma.kbArticle.count({ where: { status: "PUBLISHED", chunks: { none: {} } } }),
        canOps
            ? Promise.all(JOBS.map((j) => Promise.all([
                prisma.jobRun.findFirst({ where: { job: j.id }, orderBy: { startedAt: "desc" } }),
                prisma.jobRun.findFirst({ where: { job: j.id, status: "success" }, orderBy: { startedAt: "desc" } }),
            ])))
            : Promise.resolve([]),
        canOps
            ? prisma.notificationLog.groupBy({ by: ["kind", "status"], where: { createdAt: { gte: new Date(now - 7 * DAY_MS) } }, _count: true })
            : Promise.resolve([]),
        canAudit
            ? prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 6, include: { actor: { select: { email: true } } } })
            : Promise.resolve([]),
    ]);

    const days = lastDays(DAYS, now);
    const byDay = new Map(commitDays.map((r) => [r.d, r]));
    const signups = new Map(signupDays.map((r) => [r.d, r.n]));
    const daily = days.map((d) => ({ date: d, value: byDay.get(d)?.n ?? 0, secondary: byDay.get(d)?.users ?? 0 }));
    const last14 = daily.slice(-14);
    // Users at the end of each day: today's total minus later signups.
    let running = users;
    const userTrend = [...days].reverse().map((d) => { const v = running; running -= signups.get(d) ?? 0; return v; }).reverse().slice(-14);
    const commits30 = daily.reduce((s, d) => s + d.value, 0);

    const live = kbByStatus.find((s) => s.status === "PUBLISHED")?._count ?? 0;
    const drafts = kbByStatus.find((s) => s.status === "DRAFT")?._count ?? 0;
    const delivered = (kind: string, status: string) => deliveries.find((d) => d.kind === kind && d.status === status)?._count ?? 0;

    const action = "btn-press-sm inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-2";
    return (
        <>
            <PageHeader
                eyebrow="$ hagit admin status"
                title={`Welcome back, ${displayName(actor.email)}`}
                description={<>Here&apos;s how haGIT is doing. <span className="font-mono">{commits24h}</span> commits in the last 24 hours.</>}
                actions={
                    <>
                        {canKb && <Link href={`${base}/kb/new`} className={`${action} bg-brand-500 text-white border-ink shadow-brutal-sm`}><FilePlus2 size={13} /> New article</Link>}
                        {canOps && <RunTickButton subtle />}
                    </>
                }
            />

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <StatTile label="Users" value={users} hint={`+${newUsers} this week`} icon={<Users size={14} />} tint="var(--series-1)">
                    <Sparkline values={userTrend} color="rgb(var(--series-1))" label="Users over the last 14 days" />
                </StatTile>
                <StatTile label="Active 7d" value={active7d.length} hint="committed this week" icon={<UserCheck size={14} />} tint="var(--series-3)">
                    <Sparkline values={last14.map((d) => d.secondary)} color="rgb(var(--series-3))" label="Daily active users, last 14 days" />
                </StatTile>
                <StatTile label="Commits" value={commits} hint={`${commits30} in 30 days`} icon={<GitCommitHorizontal size={14} />} tint="var(--series-2)">
                    <Sparkline values={last14.map((d) => d.value)} color="rgb(var(--series-2))" label="Commits per day, last 14 days" />
                </StatTile>
                <StatTile label="Habits" value={habits} hint={users ? `${(habits / users).toFixed(1)} per user` : "no users yet"} icon={<Layers size={14} />} tint="var(--series-7)" />
            </div>

            <div className="grid gap-4 lg:grid-cols-3 mt-4">
                <Panel title="Commits per day" meta="Last 30 days, UTC" className="lg:col-span-2">
                    <DailyBars data={daily} label="commits" secondaryLabel="active users" />
                </Panel>

                <Panel
                    title="Knowledge base"
                    meta="What the coach can cite"
                    action={canKb ? <Link href={`${base}/kb`} className="text-xs font-bold text-[rgb(var(--ink-muted))] hover:text-[rgb(var(--ink))]">Manage →</Link> : undefined}
                >
                    <div className="grid grid-cols-3 gap-2 text-center">
                        {[["Live", live], ["Drafts", drafts], ["Chunks", chunks]].map(([label, value]) => (
                            <div key={label} className="py-2.5 bg-[rgb(var(--paper-alt))]">
                                <p className="font-mono text-2xl font-black leading-none">{value}</p>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-[rgb(var(--ink-muted))] mt-1">{label}</p>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 h-2.5 flex rounded-full overflow-hidden bg-[rgb(var(--paper-alt))]" role="img" aria-label={`${live} live, ${drafts} drafts`}>
                        <span className="bg-brand-500" style={{ width: `${(live / Math.max(1, live + drafts)) * 100}%` }} />
                    </div>
                    <p className="mt-3 text-xs">
                        {unindexed > 0
                            ? <StatusPill tone="warn">{unindexed} need re-indexing</StatusPill>
                            : <StatusPill tone="good">Index up to date</StatusPill>}
                    </p>
                    {canKb && (
                        <div className="grid grid-cols-2 gap-2 mt-4">
                            <Link href={`${base}/kb/playground`} className="flex items-center justify-center gap-1.5 py-2 text-xs font-bold border-2 border-[rgb(var(--border))] hover:bg-[rgb(var(--paper-alt))]"><FlaskConical size={13} /> Playground</Link>
                            <a href="/kb" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 py-2 text-xs font-bold border-2 border-[rgb(var(--border))] hover:bg-[rgb(var(--paper-alt))]"><BookOpen size={13} /> Public library</a>
                        </div>
                    )}
                </Panel>
            </div>

            {(canOps || canAudit) && (
                <div className="grid gap-4 lg:grid-cols-3 mt-4">
                    {canOps && (
                        <Panel
                            title="Scheduled jobs"
                            meta="Hourly tick · deliveries in the last 7 days"
                            action={<Link href={`${base}/ops`} className="text-xs font-bold text-[rgb(var(--ink-muted))] hover:text-[rgb(var(--ink))]">Runs →</Link>}
                        >
                            <ul className="space-y-3">
                                {JOBS.map((job, i) => {
                                    const [lastRun, lastOk] = jobRuns[i] ?? [null, null];
                                    const tone = !lastRun ? "idle" : lastRun.status === "failed" ? "bad" : lastRun.status === "running" ? "warn" : "good";
                                    return (
                                        <li key={job.id} className="p-3 border-2 border-[rgb(var(--border))]">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-sm font-bold">{job.label}</p>
                                                <StatusPill tone={tone}>{lastRun ? lastRun.status : "never run"}</StatusPill>
                                            </div>
                                            <p className="mt-1.5 text-xs text-[rgb(var(--ink-muted))]">
                                                {lastOk ? <>Last success <b title={formatDateTime(lastOk.startedAt)}>{timeAgo(lastOk.startedAt, now)}</b> · {lastOk.durationMs ?? 0} ms</> : "No successful run yet"}
                                            </p>
                                            <p className="mt-1 text-xs">
                                                <b className="font-mono">{delivered(job.kind, "SENT")}</b> sent
                                                {delivered(job.kind, "FAILED") > 0 && <span className="text-red-600 dark:text-red-400"> · <b className="font-mono">{delivered(job.kind, "FAILED")}</b> failed</span>}
                                            </p>
                                        </li>
                                    );
                                })}
                            </ul>
                            {process.env.GRAFANA_URL && (
                                <a href={process.env.GRAFANA_URL} target="_blank" rel="noreferrer" className="mt-3 flex items-center justify-center gap-1.5 py-2 text-xs font-bold border-2 border-[rgb(var(--border))] hover:bg-[rgb(var(--paper-alt))]">
                                    <LineChart size={13} /> Dashboards in Grafana
                                </a>
                            )}
                        </Panel>
                    )}

                    {canAudit && (
                        <Panel
                            title="Recent activity"
                            meta="Privileged actions in this console"
                            className={canOps ? "lg:col-span-2" : "lg:col-span-3"}
                            action={<Link href={`${base}/audit`} className="text-xs font-bold text-[rgb(var(--ink-muted))] hover:text-[rgb(var(--ink))]">Audit log →</Link>}
                        >
                            {audit.length === 0 ? (
                                <EmptyState>No admin actions yet.</EmptyState>
                            ) : (
                                <ol className="relative">
                                    {audit.map((entry, i) => {
                                        const { area, label } = describeAction(entry.action);
                                        return (
                                            <li key={entry.id} className="relative flex gap-3 pb-4 last:pb-0">
                                                {i < audit.length - 1 && <span className="absolute left-[7px] top-4 bottom-0 w-0.5 bg-[rgb(var(--ink)/0.1)]" />}
                                                <span className="relative mt-1 w-4 h-4 flex-shrink-0 rounded-full border-[3px] border-[rgb(var(--card-bg))] ring-2 ring-[rgb(var(--ink)/0.12)]" style={{ background: area === "kb" ? "rgb(var(--series-1))" : area === "user" ? "rgb(var(--series-7))" : "rgb(var(--series-4))" }} />
                                                <div className="min-w-0 flex-1 flex flex-wrap items-baseline justify-between gap-x-3">
                                                    <p className="text-sm min-w-0">
                                                        <b>{label}</b>
                                                        {entry.target && <span className="font-mono text-xs text-[rgb(var(--ink-muted))]"> {entry.target}</span>}
                                                    </p>
                                                    <p className="text-xs text-[rgb(var(--ink-muted))] whitespace-nowrap" title={formatDateTime(entry.createdAt)}>
                                                        {entry.actor?.email ?? "deleted user"} · {timeAgo(entry.createdAt, now)}
                                                    </p>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ol>
                            )}
                        </Panel>
                    )}
                </div>
            )}
        </>
    );
}
