export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import { rateLimits } from "@/lib/rate-limit";
import { withRoute } from "@/server/http/withRoute";

// POST /api/account/token
// Revokes every previously issued API token (dashboard sessions, CLI, extension) and returns a
// fresh one for the caller.
export const POST = withRoute(
    {
        name: "POST /api/account/token",
        auth: "user",
        rateLimit: ({ user }) => rateLimits.user(user.userId, "token-rotate", rateLimits.perHour(10)),
    },
    async ({ user }) => {
        const updated = await prisma.user.update({
            where: { id: user.userId },
            data: { tokenVersion: { increment: 1 } },
            select: { id: true, email: true, tokenVersion: true },
        });
        const token = signToken({ userId: updated.id, email: updated.email, tv: updated.tokenVersion });
        return Response.json({ userId: updated.id, email: updated.email, token });
    },
);
