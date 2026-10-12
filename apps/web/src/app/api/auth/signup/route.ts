export const runtime = "nodejs";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import { rateLimits } from "@/lib/rate-limit";
import { withRoute } from "@/server/http/withRoute";
import { email } from "@/server/http/schemas";

const body = z.object({
    email,
    password: z
        .string({ error: "Email and password are required." })
        .min(8, "Password must be at least 8 characters.")
        .max(128, "Password must be at most 128 characters."),
});

// POST /api/auth/signup
export const POST = withRoute(
    {
        name: "POST /api/auth/signup",
        body,
        rateLimit: ({ req }) => rateLimits.authIp(req, "signup"),
        conflictMessage: "An account with this email already exists.",
    },
    async ({ body }) => {
        const hashed = await bcrypt.hash(body.password, 10);
        // A duplicate email surfaces as P2002 and is mapped to 409 by withRoute.
        const user = await prisma.user.create({ data: { email: body.email, password: hashed } });

        const token = signToken({ userId: user.id, email: user.email, tv: user.tokenVersion });
        return Response.json({ userId: user.id, email: user.email, token }, { status: 201 });
    },
);
