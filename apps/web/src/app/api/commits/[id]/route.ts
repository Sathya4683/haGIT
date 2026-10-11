export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";
import { rateLimits } from "@/lib/rate-limit";
import { withRoute } from "@/server/http/withRoute";
import { notFoundError } from "@/server/http/errors";
import { idParam } from "@/server/http/schemas";

// DELETE /api/commits/:id
export const DELETE = withRoute<"user", undefined, undefined, { id: string }>(
    {
        name: "DELETE /api/commits/:id",
        auth: "user",
        rateLimit: ({ user }) => rateLimits.userWrite(user.userId, "commits"),
    },
    async ({ user, params }) => {
        const id = idParam.safeParse(params.id);
        if (!id.success) throw notFoundError("Commit not found.");
        const { count } = await prisma.commit.deleteMany({ where: { id: id.data, userId: user.userId } });
        if (count === 0) throw notFoundError("Commit not found.");
        return Response.json({ success: true });
    },
);
