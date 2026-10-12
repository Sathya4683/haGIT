// Inline knowledge-base citations: the coach ends lines that use a library passage with a tag
// like [KB12] (12 = article id). Tags are validated against the passages the model was given.

import type { KbSnippet } from "./data";

export const kbTag = (articleId: number) => `KB${articleId}`;

/** Numbered library block appended to the user message. */
export function formatLibrary(snippets: KbSnippet[]): string {
    const lines = ["Library context (haGIT knowledge base: general, research-backed guidance, not my data):"];
    for (const s of snippets) {
        lines.push(`[${kbTag(s.articleId)}] ${s.heading}\n${s.content.trim()}`);
    }
    return lines.join("\n\n");
}

/**
 * Normalises citation variants ("[KB 3]", "[KB3, KB7]") to "[KB3]" form, drops tags for
 * articles the model was not given, and returns the cited article ids in order of appearance.
 */
export function sanitizeCitations(text: string, allowed: Set<number>): { text: string; cited: number[] } {
    const cited: number[] = [];
    const normalized = text.replace(/\[((?:\s*KB\s*\d+\s*,?)+)\]/gi, (_, inner: string) => {
        const ids = Array.from(inner.matchAll(/KB\s*(\d+)/gi), (m) => Number(m[1]));
        const kept = ids.filter((id) => allowed.has(id));
        for (const id of kept) if (!cited.includes(id)) cited.push(id);
        return kept.map((id) => `[${kbTag(id)}]`).join(" ");
    });
    // Tidy whitespace left behind by removed tags.
    const tidy = normalized.replace(/[ \t]+$/gm, "").replace(/ {2,}/g, " ").replace(/ +([.,;:!?])/g, "$1");
    return { text: tidy, cited };
}
