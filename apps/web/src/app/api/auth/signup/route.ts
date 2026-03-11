export const runtime = "nodejs";

import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken, badRequest, serverError } from "@/lib/auth";

export async function POST(req: NextRequest) {
    try {
        const { email, password } = await req.json();

        if (!email || !password) return badRequest("Email and password are required.");
        if (password.length < 6) return badRequest("Password must be at least 6 characters.");

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) return badRequest("An account with this email already exists.");

        const hashed = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({ data: { email, password: hashed } });

        const token = signToken({ userId: user.id, email: user.email });
        return Response.json({ userId: user.id, email: user.email, token }, { status: 201 });
    } catch (e) {
        console.error("[signup]", e);
        return serverError();
    }
}
