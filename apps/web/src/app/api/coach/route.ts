export const runtime = "nodejs";
// A coach run is a few sequential Gemini calls; give it room beyond the default.
export const maxDuration = 60;

import { z } from "zod";
import { CoachError, geminiGenerate, runCoach } from "@hagit/coach-core/agent";
import { rateLimits } from "@/lib/rate-limit";
import { prismaHabitData } from "@/lib/coach-data";
import { withRoute } from "@/server/http/withRoute";
import { HttpError } from "@/server/http/errors";
import { getLogger } from "@/server/obs/logger";
import { timezone } from "@/server/http/schemas";

const MAX_QUESTION_CHARS = 500;
const MAX_PREVIOUS_REVIEW_CHARS = 2000;
const RUN_TIMEOUT_MS = 45_000; // stays under maxDuration
const GEMINI_RETRY_AFTER_S = 60;

const coachLog = getLogger("coach");

const body = z
    .object({
        mode: z.enum(["review", "ask"], { error: 'mode must be "review" or "ask".' }),
        question: z
            .string()
            .trim()
            .max(MAX_QUESTION_CHARS, `Keep questions under ${MAX_QUESTION_CHARS} characters.`)
            .optional()
            .default(""),
        previousReview: z
            .string()
            .optional()
            .transform((s) => s?.slice(0, MAX_PREVIOUS_REVIEW_CHARS)),
        tz: timezone,
    })
    .refine((b) => b.mode !== "ask" || b.question.length > 0, { message: "question is required." });

// POST /api/coach
// Body: { mode: "review" | "ask", question?, tz?, previousReview? }
// Returns { reply, toolCalls: [{ name, args }], model }
// Disabled (503) unless GEMINI_API_KEY is set.
export const POST = withRoute(
    {
        name: "POST /api/coach",
        auth: "user",
        body,
        // Checked after validation so a malformed request doesn't burn one of the hourly runs.
        rateLimit: ({ user }) =>
            process.env.GEMINI_API_KEY ? [rateLimits.coach(user.userId), rateLimits.coachGlobal()] : null,
    },
    async ({ user, body, requestId }) => {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new HttpError(503, "The coach isn't enabled on this server.");

        const started = Date.now();
        try {
            const result = await runCoach({
                generate: geminiGenerate(apiKey),
                model: process.env.GEMINI_MODEL,
                ctx: { data: prismaHabitData(user.userId), tz: body.tz },
                request: { mode: body.mode, question: body.question, previousReview: body.previousReview },
                signal: AbortSignal.timeout(RUN_TIMEOUT_MS),
            });

            // Tool names and timing only — never habit data or messages.
            coachLog.info("coach run", {
                requestId,
                userId: user.userId,
                mode: body.mode,
                model: result.model,
                steps: result.steps,
                tools: result.toolCalls.map((t) => (t.error ? `${t.name}(error)` : t.name)).join(","),
                durationMs: Date.now() - started,
                outcome: "ok",
            });

            return Response.json({
                reply: result.reply,
                toolCalls: result.toolCalls.map(({ name, args }) => ({ name, args })),
                model: result.model,
            });
        } catch (e) {
            if (!(e instanceof CoachError)) throw e;
            coachLog.warn("coach run failed", {
                requestId,
                userId: user.userId,
                mode: body.mode,
                durationMs: Date.now() - started,
                outcome: e.code,
                err: e.cause ?? e,
            });
            if (e.code === "rate_limited") {
                throw new HttpError(429, e.message, { retryAfter: GEMINI_RETRY_AFTER_S }, {
                    "Retry-After": String(GEMINI_RETRY_AFTER_S),
                });
            }
            throw new HttpError(e.code === "timeout" ? 504 : 502, e.message);
        }
    },
);
