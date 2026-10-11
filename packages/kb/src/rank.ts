// Ranking for hybrid retrieval: reciprocal rank fusion of dense (pgvector) and lexical
// (Postgres full-text) candidates, a relevance cutoff, then a diversity pass that prefers
// distinct articles before repeating one.

export interface Candidate {
    chunkId: number;
    articleId: number;
}

export interface DenseCandidate extends Candidate {
    similarity: number;
}

export interface FusedCandidate extends Candidate {
    similarity: number | null;
    denseRank: number | null;
    lexicalRank: number | null;
    score: number;
}

export interface RankOptions {
    /** RRF constant; 60 is the value from the original paper. */
    rrfK?: number;
    /** A dense-only match must reach this similarity. */
    minSimilarity?: number;
    /** A match found by both retrievers needs only this similarity. */
    minSimilarityWithLexical?: number;
    /** Drop candidates more than this far below the best similarity (keeps citations focused). */
    relativeMargin?: number;
    /** Maximum chunks returned per article. */
    perArticle?: number;
    limit?: number;
}

// Calibrated on eval/golden.json with bge-small-en-v1.5 (see `npm run kb:eval`).
export const DEFAULT_RANK_OPTIONS: Required<RankOptions> = {
    rrfK: 60,
    minSimilarity: 0.62,
    minSimilarityWithLexical: 0.55,
    relativeMargin: 0.1,
    perArticle: 2,
    limit: 4,
};

/** Reciprocal rank fusion (Cormack et al., 2009): score = Σ 1 / (k + rank). */
export function fuse(dense: DenseCandidate[], lexical: Candidate[], k = DEFAULT_RANK_OPTIONS.rrfK): FusedCandidate[] {
    const byId = new Map<number, FusedCandidate>();
    const get = (c: Candidate) => {
        let f = byId.get(c.chunkId);
        if (!f) {
            f = { chunkId: c.chunkId, articleId: c.articleId, similarity: null, denseRank: null, lexicalRank: null, score: 0 };
            byId.set(c.chunkId, f);
        }
        return f;
    };
    dense.forEach((c, i) => {
        const f = get(c);
        f.similarity = c.similarity;
        f.denseRank = i + 1;
        f.score += 1 / (k + i + 1);
    });
    lexical.forEach((c, i) => {
        const f = get(c);
        f.lexicalRank = i + 1;
        f.score += 1 / (k + i + 1);
    });
    return Array.from(byId.values()).sort((a, b) => b.score - a.score);
}

/**
 * Drops weak matches so off-topic questions retrieve nothing (and the coach cites nothing).
 * Lexical hits are only trusted when the embedding agrees at least moderately: common words
 * like "habit" appear in every article.
 */
export function applyCutoff(candidates: FusedCandidate[], opts: RankOptions = {}): FusedCandidate[] {
    const o = { ...DEFAULT_RANK_OPTIONS, ...opts };
    const best = Math.max(...candidates.map((c) => c.similarity ?? 0), 0);
    return candidates.filter((c) => {
        if (c.similarity === null) return false;
        const threshold = c.lexicalRank !== null ? o.minSimilarityWithLexical : o.minSimilarity;
        return c.similarity >= threshold && c.similarity >= best - o.relativeMargin;
    });
}

/**
 * Diversity re-ranking: the best chunk of each article first (in fused order), then second
 * chunks, capped per article.
 */
export function diversify(candidates: FusedCandidate[], opts: RankOptions = {}): FusedCandidate[] {
    const o = { ...DEFAULT_RANK_OPTIONS, ...opts };
    const seen = new Map<number, number>();
    const rounds: FusedCandidate[][] = [];
    for (const c of candidates) {
        const n = seen.get(c.articleId) ?? 0;
        if (n >= o.perArticle) continue;
        seen.set(c.articleId, n + 1);
        (rounds[n] ??= []).push(c);
    }
    return rounds.flat().slice(0, o.limit);
}

export function rank(dense: DenseCandidate[], lexical: Candidate[], opts: RankOptions = {}): FusedCandidate[] {
    const o = { ...DEFAULT_RANK_OPTIONS, ...opts };
    return diversify(applyCutoff(fuse(dense, lexical, o.rrfK), o), o);
}

const STOPWORDS = new Set(
    "a an and are as at be been but by can could did do does doing for from had has have how i if in into is it its just me my of on or our so than that the their them then there these they this to too very was we were what when where which while who why will with would you your".split(
        " ",
    ),
);

/** Builds an OR-ed tsquery from free text (websearch_to_tsquery would AND every word). */
export function toOrTsQuery(text: string): string | null {
    const terms = Array.from(
        new Set(
            text
                .toLowerCase()
                .match(/[a-z0-9]+/g)
                ?.filter((t) => t.length > 2 && !STOPWORDS.has(t)) ?? [],
        ),
    ).slice(0, 24);
    return terms.length ? terms.join(" | ") : null;
}
