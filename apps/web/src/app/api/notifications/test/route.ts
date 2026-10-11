export const runtime = "nodejs";

import { rateLimits } from "@/lib/rate-limit";
import { withRoute } from "@/server/http/withRoute";
import { HttpError } from "@/server/http/errors";
import { getPreferences } from "@/server/prefs";
import { publishNtfy } from "@/server/notify/ntfy";
import { appUrl } from "@/server/kb/service";
import { prisma } from "@/lib/prisma";

// POST /api/notifications/test — sends a test push to the user's ntfy topic.
export const POST = withRoute(
    {
        name: "POST /api/notifications/test",
        auth: "user",
        rateLimit: ({ user }) => rateLimits.user(user.userId, "notify-test", rateLimits.perHour(5)),
    },
    async ({ user }) => {
        const prefs = await getPreferences(user.userId);
        if (!prefs.ntfyTopic) throw new HttpError(400, "Turn on reminders first to get your notification channel.");
        const dashboard = `${appUrl()}/dashboard`;
        try {
            await publishNtfy({
                topic: prefs.ntfyTopic,
                title: "haGIT is connected",
                message: `You'll get a reminder around ${String(prefs.nudgeHour).padStart(2, "0")}:00 when habits are still open.`,
                tags: ["white_check_mark"],
                click: dashboard,
            });
        } catch (e) {
            throw new HttpError(502, `Couldn't reach the notification server: ${(e as Error).message}`);
        }
        await prisma.notificationLog.create({
            data: { userId: user.userId, kind: "TEST", periodKey: new Date().toISOString(), status: "SENT" },
        });
        return Response.json({ sent: true });
    },
);
