export interface ArticleSource {
    title: string;
    url?: string;
}

export interface ArticleMeta {
    title: string;
    slug: string;
    summary: string;
    tags: string[];
    sources: ArticleSource[];
}

export interface ParsedArticle extends ArticleMeta {
    /** Markdown body without frontmatter. */
    body: string;
}

export interface Chunk {
    ordinal: number;
    /** "Article title > Section > Subsection" */
    heading: string;
    content: string;
    tokenCount: number;
    /** Text that is embedded: contextual heading + content. */
    embedText: string;
}

/** One retrieved chunk after ranking. */
export interface SearchHit {
    chunkId: number;
    articleId: number;
    slug: string;
    title: string;
    heading: string;
    content: string;
    /** Cosine similarity to the query (null when found only lexically). */
    similarity: number | null;
    /** 1-based rank in the dense / lexical candidate lists. */
    denseRank: number | null;
    lexicalRank: number | null;
    /** Reciprocal-rank-fusion score. */
    score: number;
}
