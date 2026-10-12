export const runtime = "nodejs";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isValidTimezone } from "@/lib/datetime";
import { isPaletteId } from "@/lib/palettes";
import { rateLimits } from "@/lib/rate-limit";
import { withRoute } from "@/server/http/withRoute";
import { generateTopic, getPreferences, serializePreferences } from "@/server/prefs";

const patch = z
    .object({
        timezone: z.string().refine(isValidTimezone, "Unknown timezone."),
        palette: z.string().refine(isPaletteId, "Unknown palette."),
        nudgeEnabled: z.boolean(),
        nudgeHour: z.number().int().min(0).max(23),
        weeklyReportEnabled: z.boolean(),
        /** Issue a new ntfy topic (e.g. if the old one was shared by mistake). */
        regenerateTopic: z.literal(true),
    })
    .partial()
    .strict();

// GET /api/me/preferences
export const GET = withRoute(
    { name: "GET /api/me/preferences", auth: "user", rateLimit: ({ user }) => rateLimits.userRead(user.userId) },
    async ({ user }) => Response.json({ email: user.email, ...serializePreferences(await getPreferences(user.userId)) }),
);

// PATCH /api/me/preferences
export const PATCH = withRoute(
    {
        name: "PATCH /api/me/preferences",
        auth: "user",
        body: patch,
        rateLimit: ({ user }) => rateLimits.user(user.userId, "preferences", rateLimits.perMinute(30)),
    },
    async ({ user, body }) => {
        const current = await getPreferences(user.userId);
        const { regenerateTopic, ...fields } = body;
        const needsTopic = regenerateTopic || (fields.nudgeEnabled && !current.ntfyTopic);
        const updated = await prisma.userPreference.update({
            where: { userId: user.userId },
            data: { ...fields, ...(needsTopic && { ntfyTopic: generateTopic() }) },
        });
        return Response.json({ email: user.email, ...serializePreferences(updated) });
    },
);
