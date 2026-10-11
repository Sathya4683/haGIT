export const runtime = "nodejs";
export const maxDuration = 60;

import { withRoute } from "@/server/http/withRoute";
import { audit } from "@/server/admin/audit";
import { runTick } from "@/server/jobs/tick";

// POST /api/admin/jobs — run a scheduler tick now (from the admin console).
export const POST = withRoute({ name: "POST /api/admin/jobs", auth: "admin", permission: "ops:view" }, async ({ user }) => {
    const result = await runTick();
    await audit(user.userId, "jobs.tick_triggered");
    return Response.json(result);
});
