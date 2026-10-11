import type { PrismaClient } from "@prisma/client";
import { getEmbedder, toVectorLiteral, type Embedder } from "./embed";
import { rank, toOrTsQuery, type RankOptions } from "./rank";
import type { SearchHit } from "./types";

export interface SearchOptions extends RankOptions {
    embedder?: Embedder;
    /** Candidates fetched from each retriever before fusion. */
    candidates?: number;
}

export interface SearchResult {
    hits: SearchHit[];
    timings: { embedMs: number; retrieveMs: number };
}

type Db = Pick<PrismaClient, "$queryRaw" | "kbChunk">;

/**
 * Hybrid retrieval over published chunks: dense similarity (pgvector, cosine) and lexical
 * matching (Postgres full-text) fused with RRF, filtered for relevance and diversified.
 */
export async function searchKnowledgeBase(db: Db, query: string, opts: SearchOptions = {}): Promise<SearchResult> {
    const text = query.trim().slice(0, 1000);
    if (!text) return { hits: [], timings: { embedMs: 0, retrieveMs: 0 } };

    const k = opts.candidates ?? 20;
    const embedder = opts.embedder ?? getEmbedder();

    const t0 = performance.now();
    const vec = toVectorLiteral(await embedder.embedQuery(text));
    const t1 = performance.now();

    const tsquery = toOrTsQuery(text);
    const [dense, lexical] = await Promise.all([
        db.$queryRaw<{ id: number; articleId: number; similarity: number }[]>`
            SELECT c.id, c."articleId", 1 - (c.embedding <=> ${vec}::vector) AS similarity
            FROM "KbChunk" c
            ORDER BY c.embedding <=> ${vec}::vector
            LIMIT ${k}`,
        tsquery
            ? db.$queryRaw<{ id: number; articleId: number }[]>`
                SELECT c.id, c."articleId"
                FROM "KbChunk" c, to_tsquery('english', ${tsquery}) q
                WHERE to_tsvector('english', c.heading || ' ' || c.content) @@ q
                ORDER BY ts_rank_cd(to_tsvector('english', c.heading || ' ' || c.content), q) DESC
                LIMIT ${k}`
            : Promise.resolve([]),
    ]);

    const ranked = rank(
        dense.map((d) => ({ chunkId: d.id, articleId: d.articleId, similarity: Number(d.similarity) })),
        lexical.map((l) => ({ chunkId: l.id, articleId: l.articleId })),
        opts,
    );

    const rows = ranked.length
        ? await db.kbChunk.findMany({
              where: { id: { in: ranked.map((r) => r.chunkId) } },
              select: { id: true, heading: true, content: true, article: { select: { id: true, slug: true, title: true } } },
          })
        : [];
    const byId = new Map(rows.map((r) => [r.id, r]));
    const t2 = performance.now();

    const hits: SearchHit[] = ranked.flatMap((r) => {
        const row = byId.get(r.chunkId);
        if (!row) return [];
        return [{
            chunkId: row.id,
            articleId: row.article.id,
            slug: row.article.slug,
            title: row.article.title,
            heading: row.heading,
            content: row.content,
            similarity: r.similarity,
            denseRank: r.denseRank,
            lexicalRank: r.lexicalRank,
            score: r.score,
        }];
    });

    return { hits, timings: { embedMs: Math.round(t1 - t0), retrieveMs: Math.round(t2 - t1) } };
}

/** Distinct articles in hit order. */
export function articlesFromHits(hits: SearchHit[]) {
    const seen = new Map<number, { id: number; slug: string; title: string }>();
    for (const h of hits) if (!seen.has(h.articleId)) seen.set(h.articleId, { id: h.articleId, slug: h.slug, title: h.title });
    return Array.from(seen.values());
}

export interface ExplainRow {
    chunkId: number;
    slug: string;
    title: string;
    heading: string;
    similarity: number | null;
    denseRank: number | null;
    lexicalRank: number | null;
    score: number;
    selected: boolean;
}

/** Full ranking breakdown for the admin retrieval playground. */
export async function explainSearch(db: Db, query: string, opts: SearchOptions = {}) {
    const all = await searchKnowledgeBase(db, query, {
        ...opts,
        limit: 50,
        perArticle: 50,
        minSimilarity: -1,
        minSimilarityWithLexical: -1,
        relativeMargin: 2,
    });
    const final = await searchKnowledgeBase(db, query, opts);
    const selected = new Set(final.hits.map((h) => h.chunkId));
    const rows: ExplainRow[] = [...all.hits].sort((a, b) => b.score - a.score).map((h) => ({
        chunkId: h.chunkId,
        slug: h.slug,
        title: h.title,
        heading: h.heading,
        similarity: h.similarity,
        denseRank: h.denseRank,
        lexicalRank: h.lexicalRank,
        score: h.score,
        selected: selected.has(h.chunkId),
    }));
    return { rows, selected: final.hits, timings: final.timings };
}
