export const runtime = "nodejs";

import { withRoute } from "@/server/http/withRoute";

// POST /api/auth/verify (the CLI also calls GET)
const verify = withRoute({ name: "POST /api/auth/verify", auth: "user" }, async ({ user }) =>
    Response.json({ userId: user.userId, email: user.email }),
);

export const POST = verify;
export const GET = verify;
