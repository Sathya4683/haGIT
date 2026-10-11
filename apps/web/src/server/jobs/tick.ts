import { getLogger } from "@/server/obs/logger";
import { recordJobRun } from "./delivery";
import { runNightlyNudges } from "./nudge";
import { runWeeklyReports } from "./weekly";

const log = getLogger("job");
/** Leave headroom under the function's 60 s limit; unfinished users are picked up next tick. */
const TIME_BUDGET_MS = 45_000;

/**
 * One scheduler tick (hourly in production). Each job decides per user, in their timezone,
 * whether something is due, and records a JobRun row. Jobs are independent: one failing doesn't
 * stop the other.
 */
export async function runTick(now = new Date()) {
    const deadline = Date.now() + TIME_BUDGET_MS;
    const results: Record<string, unknown> = {};
    for (const [job, run] of [
        ["nightly-nudge", () => runNightlyNudges(now, deadline)],
        ["weekly-report", () => runWeeklyReports(now, deadline)],
    ] as const) {
        try {
            results[job] = await recordJobRun(job, run);
            log.info("job finished", { job, ...(results[job] as object) });
        } catch (e) {
            results[job] = { error: (e as Error).message };
            log.error("job failed", { job, err: e });
        }
    }
    return { at: now.toISOString(), ...results };
}
