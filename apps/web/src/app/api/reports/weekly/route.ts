export const runtime = "nodejs";
export const maxDuration = 60;

import { z } from "zod";
import { rateLimits } from "@/lib/rate-limit";
import { withRoute } from "@/server/http/withRoute";
import { getPreferences } from "@/server/prefs";
import { buildWeeklyReport, currentWeekStart, previousWeekStart } from "@/server/reports/weekly-data";
import { renderWeeklyPdf, reportFilename } from "@/server/reports/render";

// GET /api/reports/weekly?week=current|last — the weekly report as a PDF download.
export const GET = withRoute(
    {
        name: "GET /api/reports/weekly",
        auth: "user",
        query: z.object({ week: z.enum(["current", "last"]).catch("current") }),
        rateLimit: ({ user }) => rateLimits.user(user.userId, "report-pdf", rateLimits.perHour(20)),
    },
    async ({ user, query }) => {
        const { timezone } = await getPreferences(user.userId);
        const now = new Date();
        const weekStart = query.week === "last" ? previousWeekStart(now, timezone) : currentWeekStart(now, timezone);
        const data = await buildWeeklyReport(user.userId, weekStart, timezone);
        const pdf = await renderWeeklyPdf(data);
        return new Response(new Uint8Array(pdf), {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${reportFilename(data)}"`,
                "Cache-Control": "private, no-store",
            },
        });
    },
);
