export const runtime = "nodejs";

import { auth } from "@/auth";
import { signToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withRoute } from "@/server/http/withRoute";
import { unauthorizedError } from "@/server/http/errors";

// Token bridge: Auth.js manages its own session cookie, but the dashboard, CLI and extension
// authenticate with a long-lived API token signed with JWT_SECRET. This route reads the Auth.js
// session and mints that token so OAuth users get the same API access as password users.
export const GET = withRoute({ name: "GET /api/auth/session-token" }, async () => {
    const session = await auth();
    if (!session?.user?.userId) throw unauthorizedError();

    const user = await prisma.user.findUnique({ where: { id: session.user.userId } });
    // Rotating tokens ("sign out everywhere") also retires existing browser sessions.
    if (!user || user.tokenVersion !== session.tokenVersion) throw unauthorizedError();

    const token = signToken({ userId: user.id, email: user.email, tv: user.tokenVersion });
    return Response.json({ userId: user.id, email: user.email, token });
});
