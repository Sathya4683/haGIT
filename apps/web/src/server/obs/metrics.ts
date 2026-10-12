// Prometheus text exposition for /api/metrics. Serverless instances are short-lived, so request
// counters can't be scraped; these are point-in-time gauges computed from the database, which
// stay correct whichever instance answers. Request-level metrics come from logs (Loki).

import { prisma } from "@/lib/prisma";
import { buildVersion, checkDependencies } from "./health";

type Labels = Record<string, string>;

class Exposition {
    private lines: string[] = [];
    private declared = new Set<string>();

    gauge(name: string, help: string, value: number, labels: Labels = {}) {
        if (!this.declared.has(name)) {
            this.lines.push(`# HELP ${name} ${help}`, `# TYPE ${name} gauge`);
            this.declared.add(name);
        }
        const l = Object.entries(labels).map(([k, v]) => `${k}="${v.replace(/["\\\n]/g, "_")}"`).join(",");
        this.lines.push(`${name}${l ? `{${l}}` : ""} ${Number.isFinite(value) ? value : 0}`);
    }

    toString() {
        return `${this.lines.join("\n")}\n`;
    }
}

const HOUR = 3600_000;
const JOBS = ["nightly-nudge", "weekly-report"];

export async function collectMetrics(): Promise<string> {
    const started = performance.now();
    const now = Date.now();
    const since24h = new Date(now - 24 * HOUR);
    const since7d = new Date(now - 7 * 24 * HOUR);

    const [deps, users, newUsers7d, habits, commits, commits24h, active24h, active7d, articles, chunks, ntfySubs, emailSubs, notifications, lastRuns] =
        await Promise.all([
            checkDependencies(),
            prisma.user.count(),
            prisma.user.count({ where: { createdAt: { gte: since7d } } }),
            prisma.habit.count(),
            prisma.commit.count(),
            prisma.commit.count({ where: { createdAt: { gte: since24h } } }),
            prisma.commit.findMany({ where: { createdAt: { gte: since24h } }, distinct: ["userId"], select: { userId: true } }),
            prisma.commit.findMany({ where: { createdAt: { gte: since7d } }, distinct: ["userId"], select: { userId: true } }),
            prisma.kbArticle.groupBy({ by: ["status"], _count: true }),
            prisma.kbChunk.count(),
            prisma.userPreference.count({ where: { nudgeEnabled: true, ntfyTopic: { not: null } } }),
            prisma.userPreference.count({ where: { weeklyReportEnabled: true } }),
            prisma.notificationLog.groupBy({ by: ["kind", "status"], where: { updatedAt: { gte: since24h } }, _count: true }),
            Promise.all(
                JOBS.map(async (job) => ({
                    job,
                    last: await prisma.jobRun.findFirst({ where: { job }, orderBy: { startedAt: "desc" } }),
                    lastSuccess: await prisma.jobRun.findFirst({ where: { job, status: "success" }, orderBy: { startedAt: "desc" } }),
                })),
            ),
        ]);

    const m = new Exposition();
    m.gauge("hagit_build_info", "Build information", 1, { version: buildVersion(), env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development" });
    for (const [dependency, check] of Object.entries(deps)) {
        m.gauge("hagit_dependency_up", "1 when the dependency answered the health check", check.ok ? 1 : 0, { dependency });
        m.gauge("hagit_dependency_latency_seconds", "Health check round-trip time", check.latencyMs / 1000, { dependency });
    }
    m.gauge("hagit_users_total", "Registered users", users);
    m.gauge("hagit_users_new_7d", "Users who signed up in the last 7 days", newUsers7d);
    m.gauge("hagit_habits_total", "Habits across all users", habits);
    m.gauge("hagit_commits_total", "Commits across all users", commits);
    m.gauge("hagit_commits_24h", "Commits created in the last 24 hours", commits24h);
    m.gauge("hagit_active_users", "Users with at least one commit in the window", active24h.length, { window: "24h" });
    m.gauge("hagit_active_users", "Users with at least one commit in the window", active7d.length, { window: "7d" });
    for (const status of ["PUBLISHED", "DRAFT"]) {
        m.gauge("hagit_kb_articles", "Knowledge-base articles by status", articles.find((a) => a.status === status)?._count ?? 0, { status: status.toLowerCase() });
    }
    m.gauge("hagit_kb_chunks_total", "Indexed knowledge-base chunks", chunks);
    m.gauge("hagit_subscribers", "Users subscribed to a channel", ntfySubs, { channel: "ntfy" });
    m.gauge("hagit_subscribers", "Users subscribed to a channel", emailSubs, { channel: "email" });
    for (const kind of ["NUDGE", "WEEKLY_REPORT", "TEST"]) {
        for (const status of ["SENT", "SKIPPED", "FAILED"]) {
            const n = notifications.find((x) => x.kind === kind && x.status === status)?._count ?? 0;
            m.gauge("hagit_notifications_24h", "Deliveries updated in the last 24 hours", n, { kind: kind.toLowerCase(), status: status.toLowerCase() });
        }
    }
    // Labelled `task`, not `job`: Prometheus reserves `job` for the scrape target.
    for (const { job: task, last, lastSuccess } of lastRuns) {
        m.gauge("hagit_job_last_run_timestamp_seconds", "Start time of the latest run", last ? last.startedAt.getTime() / 1000 : 0, { task });
        m.gauge("hagit_job_last_success_timestamp_seconds", "Start time of the latest successful run", lastSuccess ? lastSuccess.startedAt.getTime() / 1000 : 0, { task });
        m.gauge("hagit_job_last_duration_seconds", "Duration of the latest finished run", (last?.durationMs ?? 0) / 1000, { task });
        m.gauge("hagit_job_last_status", "1 when the latest run succeeded, 0 when it failed", last ? (last.status === "failed" ? 0 : 1) : 1, { task });
    }
    m.gauge("hagit_metrics_collect_seconds", "Time spent collecting these metrics", (performance.now() - started) / 1000);
    return m.toString();
}
