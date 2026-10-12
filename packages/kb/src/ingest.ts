import { createHash } from "node:crypto";
import type { PrismaClient, KbArticle } from "@prisma/client";
import { chunkArticle } from "./chunk";
import { getEmbedder, toVectorLiteral, type Embedder } from "./embed";
import { readingMinutes } from "./parse";
import type { ParsedArticle } from "./types";

export interface SaveArticleInput extends ParsedArticle {
    status: "DRAFT" | "PUBLISHED";
    origin: "REPO" | "ADMIN";
    authorId?: number | null;
}

export interface SaveResult {
    article: KbArticle;
    /** Present when chunks were (re)built. */
    indexed: { chunks: number; ms: number } | null;
}

export function contentHash(embedderId: string, title: string, body: string) {
    return createHash("sha256").update(`${embedderId}\n${title}\n${body}`).digest("hex");
}

/**
 * Creates or updates an article (by id when given, otherwise by slug) and keeps its chunks in
 * sync: published articles are chunked and embedded when their content changed; drafts have no
 * chunks and are therefore never retrieved.
 */
export async function saveArticle(
    db: PrismaClient,
    input: SaveArticleInput,
    opts: { id?: number; embedder?: Embedder; force?: boolean } = {},
): Promise<SaveResult> {
    const embedder = opts.embedder ?? getEmbedder();
    const hash = contentHash(embedder.id, input.title, input.body);
    const data = {
        slug: input.slug,
        title: input.title,
        summary: input.summary,
        body: input.body,
        tags: input.tags,
        sources: input.sources as unknown as object,
        status: input.status,
        origin: input.origin,
        readingMinutes: readingMinutes(input.body),
    };

    const existing = opts.id
        ? await db.kbArticle.findUnique({ where: { id: opts.id } })
        : await db.kbArticle.findUnique({ where: { slug: input.slug } });
    const publishing = input.status === "PUBLISHED";
    const publishedAt = publishing ? existing?.publishedAt ?? new Date() : null;

    const article = existing
        ? await db.kbArticle.update({ where: { id: existing.id }, data: { ...data, publishedAt } })
        : await db.kbArticle.create({ data: { ...data, publishedAt, authorId: input.authorId ?? null } });

    if (!publishing) {
        await db.kbChunk.deleteMany({ where: { articleId: article.id } });
        const updated = await db.kbArticle.update({ where: { id: article.id }, data: { indexedAt: null, contentHash: "" } });
        return { article: updated, indexed: null };
    }

    const chunkCount = await db.kbChunk.count({ where: { articleId: article.id } });
    if (!opts.force && article.contentHash === hash && chunkCount > 0) return { article, indexed: null };

    return reindex(db, article, embedder, hash);
}

async function reindex(db: PrismaClient, article: KbArticle, embedder: Embedder, hash: string): Promise<SaveResult> {
    const started = performance.now();
    const chunks = chunkArticle(article.title, article.body);
    // Embed before opening the transaction so the write phase stays short.
    const vectors = await embedder.embedDocuments(chunks.map((c) => c.embedText));
    const chunkHash = (text: string) => createHash("sha256").update(text).digest("hex").slice(0, 16);

    const updated = await db.$transaction(async (tx) => {
        await tx.kbChunk.deleteMany({ where: { articleId: article.id } });
        for (let i = 0; i < chunks.length; i++) {
            const c = chunks[i];
            await tx.$executeRaw`
                INSERT INTO "KbChunk" ("articleId", "ordinal", "heading", "content", "tokenCount", "contentHash", "embedding")
                VALUES (${article.id}, ${c.ordinal}, ${c.heading}, ${c.content}, ${c.tokenCount}, ${chunkHash(c.embedText)},
                        ${toVectorLiteral(vectors[i])}::vector)`;
        }
        return tx.kbArticle.update({ where: { id: article.id }, data: { contentHash: hash, indexedAt: new Date() } });
    });

    return { article: updated, indexed: { chunks: chunks.length, ms: Math.round(performance.now() - started) } };
}

export async function deleteArticle(db: PrismaClient, id: number) {
    await db.kbArticle.delete({ where: { id } });
}
