export const runtime = "nodejs";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/permissions";
import { rateLimits } from "@/lib/rate-limit";
import { withRoute } from "@/server/http/withRoute";
import { HttpError, notFoundError } from "@/server/http/errors";
import { idParam } from "@/server/http/schemas";
import { audit } from "@/server/admin/audit";

const body = z.object({ role: z.enum(ROLES as [string, ...string[]], { error: "Unknown role." }) });

// PATCH /api/admin/users/:id  { role }
export const PATCH = withRoute<"admin", { role: string }, undefined, { id: string }>(
    {
        name: "PATCH /api/admin/users/:id",
        auth: "admin",
        permission: "users:manage",
        body,
        rateLimit: ({ user }) => rateLimits.user(user.userId, "admin-write", rateLimits.perMinute(30)),
    },
    async ({ user, params, body }) => {
        const id = idParam.safeParse(params.id);
        if (!id.success) throw notFoundError("User not found.");
        if (id.data === user.userId) throw new HttpError(400, "You can't change your own role.");

        const target = await prisma.user.findUnique({ where: { id: id.data }, select: { id: true, email: true, role: true } });
        if (!target) throw notFoundError("User not found.");
        const role = body.role as (typeof ROLES)[number];
        if (target.role === role) return Response.json({ id: target.id, role });

        // Demoting the last admin would lock everyone out of user management.
        if (target.role === "ADMIN" && (await prisma.user.count({ where: { role: "ADMIN" } })) <= 1) {
            throw new HttpError(400, "There must be at least one admin.");
        }

        await prisma.user.update({ where: { id: target.id }, data: { role } });
        await audit(user.userId, "user.role_changed", target.email, { from: target.role, to: role });
        return Response.json({ id: target.id, role });
    },
);
