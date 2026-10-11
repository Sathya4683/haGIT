-- pgvector (on Supabase this may already be enabled under the "extensions" schema).
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
CREATE TYPE "ArticleStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "ArticleOrigin" AS ENUM ('REPO', 'ADMIN');

-- CreateTable
CREATE TABLE "KbArticle" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "tags" TEXT[],
    "sources" JSONB NOT NULL DEFAULT '[]',
    "status" "ArticleStatus" NOT NULL DEFAULT 'DRAFT',
    "origin" "ArticleOrigin" NOT NULL DEFAULT 'ADMIN',
    "readingMinutes" INTEGER NOT NULL DEFAULT 1,
    "contentHash" TEXT NOT NULL DEFAULT '',
    "authorId" INTEGER,
    "publishedAt" TIMESTAMP(3),
    "indexedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KbArticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KbChunk" (
    "id" SERIAL NOT NULL,
    "articleId" INTEGER NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "heading" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tokenCount" INTEGER NOT NULL,
    "contentHash" TEXT NOT NULL,
    "embedding" vector(384) NOT NULL,

    CONSTRAINT "KbChunk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KbArticle_slug_key" ON "KbArticle"("slug");

-- CreateIndex
CREATE INDEX "KbArticle_status_idx" ON "KbArticle"("status");

-- CreateIndex
CREATE UNIQUE INDEX "KbChunk_articleId_ordinal_key" ON "KbChunk"("articleId", "ordinal");

-- AddForeignKey
ALTER TABLE "KbArticle" ADD CONSTRAINT "KbArticle_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KbChunk" ADD CONSTRAINT "KbChunk_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "KbArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

