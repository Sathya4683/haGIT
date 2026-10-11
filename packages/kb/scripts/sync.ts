// Syncs content/kb/*.md into the database and indexes published articles.
//   npm run kb:sync              upsert repo articles, unpublish repo articles that were deleted
//   npm run kb:sync -- --force   re-embed everything (e.g. after changing provider)
// Articles created or edited in the admin console (origin ADMIN) are never touched.

import "./_env";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { contentDir, repoRoot } from "./_env";
import { fetchModel } from "./fetch-model.mjs";
import { parseArticle } from "../src/parse";
import { getEmbedder } from "../src/embed";
import { saveArticle } from "../src/ingest";

const force = process.argv.includes("--force");
const prisma = new PrismaClient();

async function main() {
    if (process.env.EMBEDDINGS_PROVIDER !== "cloudflare") await fetchModel(process.env.KB_MODEL_DIR);
    const embedder = getEmbedder();
    const files = readdirSync(contentDir).filter((f) => f.endsWith(".md")).sort();
    const slugs = new Set<string>();
    let indexed = 0;
    let skipped = 0;

    for (const file of files) {
        const article = parseArticle(readFileSync(path.join(contentDir, file), "utf8"));
        slugs.add(article.slug);
        const existing = await prisma.kbArticle.findUnique({ where: { slug: article.slug }, select: { origin: true } });
        if (existing?.origin === "ADMIN") {
            console.log(`skip   ${article.slug} (edited in admin console)`);
            skipped++;
            continue;
        }
        const result = await saveArticle(prisma, { ...article, status: "PUBLISHED", origin: "REPO" }, { embedder, force });
        if (result.indexed) {
            indexed++;
            console.log(`index  ${article.slug}: ${result.indexed.chunks} chunks in ${result.indexed.ms} ms`);
        } else {
            console.log(`ok     ${article.slug} (unchanged)`);
        }
    }

    // Repo articles whose file was removed are unpublished (kept as drafts, not deleted).
    const removed = await prisma.kbArticle.findMany({
        where: { origin: "REPO", status: "PUBLISHED", slug: { notIn: Array.from(slugs) } },
    });
    for (const article of removed) {
        await saveArticle(prisma, { ...article, sources: article.sources as never, status: "DRAFT", origin: "REPO" }, { id: article.id, embedder });
        console.log(`unpub  ${article.slug} (file removed)`);
    }

    console.log(
        `\n${files.length} files from ${path.relative(repoRoot, contentDir)} · ${indexed} indexed · ${skipped} skipped · ${removed.length} unpublished · ${embedder.id}`,
    );
}

main()
    .catch((e) => {
        console.error(e);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
