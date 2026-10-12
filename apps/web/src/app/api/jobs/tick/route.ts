export const runtime = "nodejs";
export const maxDuration = 60;

import { withRoute } from "@/server/http/withRoute";
import { HttpError, unauthorizedError } from "@/server/http/errors";
import { isAuthorizedScheduler } from "@/server/jobs/auth";
import { runTick } from "@/server/jobs/tick";

// POST /api/jobs/tick — called hourly by the scheduler (QStash in production).
// Development only: ?now=<ISO instant> simulates a different time.
export const POST = withRoute({ name: "POST /api/jobs/tick" }, async ({ req }) => {
    const raw = await req.text();
    if (!(await isAuthorizedScheduler(req, raw))) throw unauthorizedError();

    let now = new Date();
    const override = req.nextUrl.searchParams.get("now");
    if (override) {
        if (process.env.NODE_ENV === "production") throw new HttpError(400, "now is only supported in development.");
        now = new Date(override);
        if (Number.isNaN(now.getTime())) throw new HttpError(400, "now must be an ISO timestamp.");
    }
    return Response.json(await runTick(now));
});
