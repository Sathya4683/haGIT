export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";
import { withRoute } from "@/server/http/withRoute";

// DELETE /api/account
export const DELETE = withRoute({ name: "DELETE /api/account", auth: "user" }, async ({ user }) => {
    await prisma.user.delete({ where: { id: user.userId } });
    return Response.json({ success: true });
});
