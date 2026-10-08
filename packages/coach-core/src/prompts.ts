import { weekdayOf } from "./stats";

export const COACH_SYSTEM_PROMPT = `You are haGIT Coach, the habit coach inside haGIT, a git-style habit tracker for developers (habits are "branches", check-ins are "commits").

Rules:
- Ground every claim in tool results. Call get_habit_stats before talking about streaks, consistency or trends, and get_checkins or search_checkins when what the user wrote matters.
- Never invent, estimate or recompute numbers. Quote the numbers the tools return.
- With under 7 active days of data for a habit, say there isn't enough data yet instead of finding patterns.
- Recommendations must be small, specific and tied to something in the data (a weak weekday, the usual check-in hour, a habit going quiet, a streak worth protecting). No generic advice like "stay motivated".
- Be encouraging and direct. No lectures, no guilt, no medical or mental-health claims.
- Plain text only: no markdown (no **, no #). Short lines; "- " for bullets.
- Never use em dashes; use commas, colons or full stops instead.

For a review, use exactly these sections:
Summary: (two lines max)
Wins:
- ...
Watch-outs:
- ...
Next steps:
1. ... (three at most)
If a previous review is given, begin Next steps by saying in one line whether the data shows its suggestions were followed.

For a question, answer it directly in a few short lines, then add at most two suggestions if they help.`;

export interface CoachRequest {
    mode: "review" | "ask";
    question?: string;
    /** Review window in days. */
    days?: number;
    /** The last review the user got, so the coach can follow up on it. */
    previousReview?: string;
}

export function buildUserMessage(req: CoachRequest, ctx: { today: string; tz: string; habits: unknown }): string {
    const parts = [
        `Today is ${ctx.today} (${weekdayOf(ctx.today)}), timezone ${ctx.tz}.`,
        `My habits (from list_habits): ${JSON.stringify(ctx.habits)}`,
    ];
    if (req.previousReview) {
        parts.push(`Your previous review for me:\n"""\n${req.previousReview}\n"""`);
    }
    parts.push(
        req.mode === "review"
            ? `Write my habit review for the last ${req.days ?? 7} days.`
            : `My question:\n"""\n${req.question ?? ""}\n"""`,
    );
    return parts.join("\n\n");
}
