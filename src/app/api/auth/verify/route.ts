export const runtime = "nodejs";
import { NextRequest } from "next/server";
import { requireAuth, unauthorized, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const payload = requireAuth(req);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) return unauthorized();
    return Response.json({ userId: user.id, email: user.email });
  } catch {
    return unauthorized();
  }
}

// CLI also calls GET /api/auth/verify
export async function GET(req: NextRequest) {
  return POST(req);
}
