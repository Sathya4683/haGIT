import { prisma } from "@/lib/prisma";
import { zonedParts } from "@/lib/datetime";
import { sendMail } from "@/server/mail/mailer";
import { buildWeeklyReport, previousWeekStart, type WeeklyReportData } from "@/server/reports/weekly-data";
import { renderWeeklyPdf, reportFilename } from "@/server/reports/render";
import { weeklyEmail } from "@/server/reports/weekly-email";
import { getLogger } from "@/server/obs/logger";
import { isoWeekKey } from "@/lib/datetime";
import { claimDelivery, completeDelivery } from "./delivery";

const log = getLogger("job");
/** Reports go out on Monday from this local hour, covering the previous Monday–Sunday. */
export const REPORT_WEEKDAY = 1;
export const REPORT_HOUR = 8;

export async function emailWeeklyReport(to: string, data: WeeklyReportData) {
    const [pdf, email] = [await renderWeeklyPdf(data), weeklyEmail(data)];
    await sendMail({
        to,
        subject: email.subject,
        html: email.html,
        text: email.text,
        attachments: [{ filename: reportFilename(data), content: pdf, contentType: "application/pdf" }],
    });
}

export interface WeeklyStats extends Record<string, unknown> {
    candidates: number;
    due: number;
    sent: number;
    failed: number;
    deferred: number;
}

export async function runWeeklyReports(now: Date, deadline: number): Promise<WeeklyStats> {
    const prefs = await prisma.userPreference.findMany({
        where: { weeklyReportEnabled: true },
        select: { userId: true, timezone: true, user: { select: { email: true } } },
    });
    const stats: WeeklyStats = { candidates: prefs.length, due: 0, sent: 0, failed: 0, deferred: 0 };

    for (const p of prefs) {
        const local = zonedParts(now, p.timezone);
        if (local.weekday !== REPORT_WEEKDAY || local.hour < REPORT_HOUR) continue;
        stats.due++;
        if (Date.now() > deadline) {
            stats.deferred++;
            continue;
        }
        const weekStart = previousWeekStart(now, p.timezone);
        const claim = await claimDelivery(p.userId, "WEEKLY_REPORT", isoWeekKey(weekStart), now);
        if (!claim) continue;
        try {
            await emailWeeklyReport(p.user.email, await buildWeeklyReport(p.userId, weekStart, p.timezone));
            await completeDelivery(claim, "SENT");
            stats.sent++;
        } catch (e) {
            await completeDelivery(claim, "FAILED", e);
            stats.failed++;
            log.warn("weekly report delivery failed", { job: "weekly-report", userId: p.userId, err: e });
        }
    }
    return stats;
}
