import type { KbSnippet, KnowledgeBase } from "@hagit/coach-core";
import { searchKnowledgeBase, type SearchOptions } from "@hagit/kb/search";
import { prisma } from "@/lib/prisma";
import { getLogger } from "@/server/obs/logger";

const log = getLogger("app");

export function appUrl() {
    return (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");
}

export const articleUrl = (slug: string) => `${appUrl()}/kb/${slug}`;

/** Hybrid search with timing logs (feeds the KB panels in Grafana). */
export async function searchKb(query: string, opts: SearchOptions & { purpose: string }) {
    const result = await searchKnowledgeBase(prisma, query, opts);
    log.info("kb search", {
        purpose: opts.purpose,
        hits: result.hits.length,
        articles: Array.from(new Set(result.hits.map((h) => h.slug))).join(","),
        embedMs: result.timings.embedMs,
        retrieveMs: result.timings.retrieveMs,
    });
    return result;
}

/** Knowledge base adapter for the coach; never throws (the coach works without it). */
export function coachKnowledgeBase(purpose: string, timeoutMs = 1500): KnowledgeBase {
    return {
        async search(query, opts): Promise<KbSnippet[]> {
            let timer: ReturnType<typeof setTimeout> | undefined;
            try {
                const result = await Promise.race([
                    searchKb(query, { purpose, limit: opts?.limit ?? 4 }),
                    new Promise<never>((_, reject) => {
                        timer = setTimeout(() => reject(new Error("knowledge base search timed out")), timeoutMs);
                    }),
                ]);
                return result.hits.map((h) => ({
                    articleId: h.articleId,
                    slug: h.slug,
                    title: h.title,
                    heading: h.heading,
                    content: h.content,
                    url: articleUrl(h.slug),
                }));
            } catch (e) {
                log.warn("kb search failed", { purpose, err: e });
                return [];
            } finally {
                if (timer) clearTimeout(timer);
            }
        },
    };
}
