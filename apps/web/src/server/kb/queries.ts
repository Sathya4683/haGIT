import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

// Public knowledge-base reads are cached in the Next.js data cache (tag "kb") and refreshed
// when an article is published, edited or deleted, or after CI syncs content/kb.
export const KB_CACHE_TAG = "kb";
const CACHE = { revalidate: 300, tags: [KB_CACHE_TAG] };

export interface ArticleCard {
    id: number;
    slug: string;
    title: string;
    summary: string;
    tags: string[];
    readingMinutes: number;
}

const cardSelect = { id: true, slug: true, title: true, summary: true, tags: true, readingMinutes: true } as const;

export const listPublishedArticles = unstable_cache(
    (): Promise<ArticleCard[]> =>
        prisma.kbArticle.findMany({ where: { status: "PUBLISHED" }, orderBy: { title: "asc" }, select: cardSelect }),
    ["kb-list"],
    CACHE,
);

export const getPublishedArticle = unstable_cache(
    (slug: string) =>
        prisma.kbArticle.findFirst({
            where: { slug, status: "PUBLISHED" },
            select: { ...cardSelect, body: true, sources: true },
        }),
    ["kb-article"],
    CACHE,
);

/** Articles whose average chunk embedding is closest to this article's. */
export const relatedArticles = unstable_cache(
    async (articleId: number, limit = 3): Promise<ArticleCard[]> => {
        const rows = await prisma.$queryRaw<{ articleId: number }[]>`
            WITH target AS (
                SELECT AVG(embedding) AS v FROM "KbChunk" WHERE "articleId" = ${articleId}
            ), centroids AS (
                SELECT "articleId", AVG(embedding) AS v FROM "KbChunk" WHERE "articleId" <> ${articleId} GROUP BY "articleId"
            )
            SELECT c."articleId" FROM centroids c, target t
            WHERE t.v IS NOT NULL
            ORDER BY c.v <=> t.v
            LIMIT ${limit}`;
        if (rows.length === 0) return [];
        const articles = await prisma.kbArticle.findMany({
            where: { id: { in: rows.map((r) => r.articleId) }, status: "PUBLISHED" },
            select: cardSelect,
        });
        return rows.flatMap((r) => articles.filter((a) => a.id === r.articleId));
    },
    ["kb-related"],
    CACHE,
);
