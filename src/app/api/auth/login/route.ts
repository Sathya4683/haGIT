export const runtime = "nodejs";

import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken, badRequest, serverError } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) return badRequest("Email and password are required.");

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return badRequest("Invalid email or password.");

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return badRequest("Invalid email or password.");

    const token = signToken({ userId: user.id, email: user.email });
    return Response.json({ userId: user.id, email: user.email, token });
  } catch (e) {
    console.error("[login]", e);
    return serverError();
  }
}
