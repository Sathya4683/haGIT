export const runtime = "nodejs";

import { z } from "zod";
import { rateLimits } from "@/lib/rate-limit";
import { withRoute } from "@/server/http/withRoute";
import { clientId, commitMessage, commitTimestamp, habitName } from "@/server/http/schemas";
import { pushCommits } from "@/server/commits/push";

const body = z.object({
    commits: z
        .array(
            z.object({
                habitName,
                message: commitMessage,
                timestamp: commitTimestamp.optional(),
                clientId: clientId.optional(),
            }),
            { error: "commits array is required." },
        )
        .min(1, "commits array is required.")
        .max(100, "A maximum of 100 commits can be pushed at once."),
});

// POST /api/commits/push
// Body: { commits: [{ habitName, message, timestamp?, clientId? }] }
// All-or-nothing; commits whose clientId was already stored are returned without duplicating.
export const POST = withRoute(
    {
        name: "POST /api/commits/push",
        auth: "user",
        body,
        rateLimit: ({ user }) => rateLimits.userWrite(user.userId, "commits"),
    },
    async ({ user, body }) => {
        const result = await pushCommits(user.userId, body.commits);
        return Response.json(
            {
                success: true,
                count: result.commits.length,
                created: result.created,
                duplicates: result.duplicates,
                commits: result.commits,
            },
            { status: 201 },
        );
    },
);
