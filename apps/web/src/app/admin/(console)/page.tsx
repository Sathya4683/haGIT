import { prisma } from "@/lib/prisma";
import { PageHeader, StatTile, formatDateTime, EmptyState } from "@/components/admin/ui";
import { can } from "@/lib/permissions";
import { getAdminActor } from "@/server/admin/session";

const DAY_MS = 24 * 60 * 60 * 1000;

export default async function AdminOverviewPage() {
    const actor = (await getAdminActor())!;
    const now = Date.now();
    const [users, newUsers, habits, commits, commits24h, active7d, recentAudit] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { createdAt: { gte: new Date(now - 7 * DAY_MS) } } }),
        prisma.habit.count(),
        prisma.commit.count(),
        prisma.commit.count({ where: { createdAt: { gte: new Date(now - DAY_MS) } } }),
        prisma.commit.findMany({
            where: { createdAt: { gte: new Date(now - 7 * DAY_MS) } },
            distinct: ["userId"],
            select: { userId: true },
        }),
        can(actor.role, "audit:view")
            ? prisma.auditLog.findMany({
                  orderBy: { createdAt: "desc" },
                  take: 5,
                  include: { actor: { select: { email: true } } },
              })
            : Promise.resolve([]),
    ]);

    const grafanaUrl = process.env.GRAFANA_URL;

    return (
        <>
            <PageHeader
                title="Overview"
                description={`Signed in as ${actor.email}`}
                actions={
                    grafanaUrl ? (
                        <a
                            href={grafanaUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-press-sm px-3 py-2 text-xs font-bold border-2 border-[rgb(var(--border))] hover:bg-[rgb(var(--paper-alt))]"
                        >
                            Open Grafana ↗
                        </a>
                    ) : undefined
                }
            />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatTile label="Users" value={users} hint={`${newUsers} new this week`} />
                <StatTile label="Active (7d)" value={active7d.length} hint="users who committed" />
                <StatTile label="Habits" value={habits} />
                <StatTile label="Commits" value={commits} hint={`${commits24h} in the last 24h`} />
            </div>

            {can(actor.role, "audit:view") && (
                <section className="mt-10">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[rgb(var(--ink-muted))] mb-3">Recent admin activity</p>
                    {recentAudit.length === 0 ? (
                        <EmptyState>No admin actions yet.</EmptyState>
                    ) : (
                        <div className="card divide-y-2 divide-[rgb(var(--border))]">
                            {recentAudit.map((entry) => (
                                <div key={entry.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                                    <span>
                                        <span className="font-mono font-bold">{entry.action}</span>
                                        {entry.target && <span className="text-[rgb(var(--ink-muted))]"> · {entry.target}</span>}
                                    </span>
                                    <span className="text-xs text-[rgb(var(--ink-muted))]">
                                        {entry.actor?.email ?? "deleted user"} · {formatDateTime(entry.createdAt)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            )}
        </>
    );
}
