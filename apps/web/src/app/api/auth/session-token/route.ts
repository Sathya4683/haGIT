export const runtime = "nodejs";

import { auth } from "@/auth";
import { signToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unauthorized, serverError } from "@/lib/auth";

// CLI token bridge: Auth.js manages its own session cookie, but the existing
// /api/auth/{login,signup,verify} contract (and the CLI's `hagit login -t <token>`)
// is a long-lived JWT signed with JWT_SECRET. This route reads the Auth.js session
// and mints that legacy JWT so the SettingsDrawer CLI Token panel can show it and
// `hagit login -t <token>` keeps working unchanged after OAuth sign-in.
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.userId) return unauthorized();

        const user = await prisma.user.findUnique({
            where: { id: session.user.userId },
        });
        if (!user) return unauthorized();

        const token = signToken({ userId: user.id, email: user.email });
        return Response.json({ userId: user.id, email: user.email, token });
    } catch (e) {
        console.error("[session-token]", e);
        return serverError();
    }
}
