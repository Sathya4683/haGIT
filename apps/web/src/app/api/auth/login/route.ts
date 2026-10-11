export const runtime = "nodejs";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import { rateLimits } from "@/lib/rate-limit";
import { withRoute } from "@/server/http/withRoute";
import { HttpError } from "@/server/http/errors";
import { email } from "@/server/http/schemas";

const body = z.object({
    email,
    password: z.string({ error: "Email and password are required." }).min(1, "Email and password are required."),
});

// POST /api/auth/login
export const POST = withRoute(
    {
        name: "POST /api/auth/login",
        body,
        rateLimit: ({ req, body }) => [rateLimits.authIp(req, "login"), rateLimits.loginEmail(body.email)],
    },
    async ({ body }) => {
        const user = await prisma.user.findUnique({ where: { email: body.email } });
        if (!user) throw new HttpError(400, "Invalid email or password.");

        // OAuth-only accounts have no password. Direct them to social login
        // instead of letting bcrypt.compare throw on `null`.
        if (!user.password) {
            throw new HttpError(400, "This account uses social login. Please sign in with Google or GitHub.");
        }

        const valid = await bcrypt.compare(body.password, user.password);
        if (!valid) throw new HttpError(400, "Invalid email or password.");

        const token = signToken({ userId: user.id, email: user.email, tv: user.tokenVersion });
        return Response.json({ userId: user.id, email: user.email, token });
    },
);
