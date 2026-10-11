export const runtime = "nodejs";

import { z } from "zod";
import { rateLimits } from "@/lib/rate-limit";
import { withRoute } from "@/server/http/withRoute";
import { articleUrl, searchKb } from "@/server/kb/service";

const query = z.object({
    q: z.string().trim().min(2, "q must be at least 2 characters.").max(300),
    limit: z.coerce.number().int().min(1).max(10).catch(5),
});

// GET /api/kb/search?q=&limit=
// Public hybrid search over published knowledge-base articles (used by /kb and the MCP server).
export const GET = withRoute(
    {
        name: "GET /api/kb/search",
        query,
        rateLimit: ({ req }) => rateLimits.ip(req, "kb-search", rateLimits.perMinute(30)),
    },
    async ({ query }) => {
        const { hits, timings } = await searchKb(query.q, { purpose: "search", limit: query.limit });
        return Response.json({
            results: hits.map((h) => ({
                articleId: h.articleId,
                slug: h.slug,
                title: h.title,
                heading: h.heading,
                excerpt: h.content.length > 400 ? `${h.content.slice(0, 400).trimEnd()}…` : h.content,
                content: h.content,
                url: articleUrl(h.slug),
                score: Number(h.score.toFixed(5)),
            })),
            timings,
        });
    },
);
