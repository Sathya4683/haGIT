export const runtime = "nodejs";
// A coach run is a few sequential Gemini calls; give it room beyond the default.
export const maxDuration = 60;
import { NextRequest } from "next/server";
import { CoachError, geminiGenerate, runCoach } from "@hagit/coach-core/agent";
import { requireAuth, unauthorized, badRequest, serverError } from "@/lib/auth";
import { limitUserOperation, rateLimitExceeded } from "@/lib/rate-limit";
import { isValidTimezone } from "@/lib/datetime";
import { prismaHabitData } from "@/lib/coach-data";

const MAX_QUESTION_CHARS = 500;
const MAX_PREVIOUS_REVIEW_CHARS = 2000;
const RUN_TIMEOUT_MS = 45_000; // stays under maxDuration
const GEMINI_RETRY_AFTER_S = 60;

// POST /api/coach
// Body: { mode: "review" | "ask", question?, tz?, previousReview? }
// Returns { reply, toolCalls: [{ name, args }], model }
// Disabled (503) unless GEMINI_API_KEY is set.
export async function POST(req: NextRequest) {
    const started = Date.now();
    try {
        const payload = requireAuth(req);
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return Response.json({ error: "The coach isn't enabled on this server." }, { status: 503 });

        const body = (await req.json().catch(() => null)) ?? {};
        const mode = body.mode;
        if (mode !== "review" && mode !== "ask") return badRequest('mode must be "review" or "ask".');

        const question = typeof body.question === "string" ? body.question.trim() : "";
        if (mode === "ask" && !question) return badRequest("question is required.");
        if (question.length > MAX_QUESTION_CHARS) return badRequest(`Keep questions under ${MAX_QUESTION_CHARS} characters.`);

        const previousReview =
            typeof body.previousReview === "string" ? body.previousReview.slice(0, MAX_PREVIOUS_REVIEW_CHARS) : undefined;
        const tz = typeof body.tz === "string" && isValidTimezone(body.tz) ? body.tz : "UTC";

        // Checked after validation so a malformed request doesn't burn one of the 5 hourly runs.
        const rateLimit = await limitUserOperation(payload.userId, "coach");
        if (!rateLimit.allowed) return rateLimitExceeded(rateLimit.retryAfter);

        const result = await runCoach({
            generate: geminiGenerate(apiKey),
            model: process.env.GEMINI_MODEL,
            ctx: { data: prismaHabitData(payload.userId), tz },
            request: { mode, question, previousReview },
            signal: AbortSignal.timeout(RUN_TIMEOUT_MS),
        });

        // Tool names and timing only — never habit data or messages.
        const tools = result.toolCalls.map((t) => (t.error ? `${t.name}(error)` : t.name)).join(",");
        console.info(`[POST /api/coach] mode=${mode} model=${result.model} steps=${result.steps} tools=${tools} ms=${Date.now() - started}`);

        return Response.json({
            reply: result.reply,
            toolCalls: result.toolCalls.map(({ name, args }) => ({ name, args })),
            model: result.model,
        });
    } catch (e: unknown) {
        if ((e as Error).message === "UNAUTHORIZED") return unauthorized();
        if (e instanceof CoachError) {
            console.error(`[POST /api/coach] ${e.code} after ${Date.now() - started}ms`, e.cause ?? "");
            if (e.code === "rate_limited") {
                return Response.json(
                    { error: e.message, retryAfter: GEMINI_RETRY_AFTER_S },
                    { status: 429, headers: { "Retry-After": String(GEMINI_RETRY_AFTER_S) } },
                );
            }
            return Response.json({ error: e.message }, { status: e.code === "timeout" ? 504 : 502 });
        }
        console.error("[POST /api/coach]", e);
        return serverError();
    }
}
