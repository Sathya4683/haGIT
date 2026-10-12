export const runtime = "nodejs";
export const maxDuration = 60;

import { rateLimits } from "@/lib/rate-limit";
import { withRoute } from "@/server/http/withRoute";
import { HttpError } from "@/server/http/errors";
import { getPreferences } from "@/server/prefs";
import { mailConfigured } from "@/server/mail/mailer";
import { buildWeeklyReport, currentWeekStart } from "@/server/reports/weekly-data";
import { emailWeeklyReport } from "@/server/jobs/weekly";

// POST /api/reports/weekly/email — emails this week's report so far (a preview of Monday's email).
export const POST = withRoute(
    {
        name: "POST /api/reports/weekly/email",
        auth: "user",
        rateLimit: ({ user }) => rateLimits.user(user.userId, "report-email", rateLimits.perHour(3)),
    },
    async ({ user }) => {
        if (!mailConfigured()) throw new HttpError(503, "Email isn't configured on this server.");
        const { timezone } = await getPreferences(user.userId);
        const data = await buildWeeklyReport(user.userId, currentWeekStart(new Date(), timezone), timezone);
        try {
            await emailWeeklyReport(user.email, data);
        } catch (e) {
            throw new HttpError(502, `Couldn't send the email: ${(e as Error).message}`);
        }
        return Response.json({ sent: true, to: user.email });
    },
);
