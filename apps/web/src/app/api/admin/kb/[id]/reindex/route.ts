export const runtime = "nodejs";
export const maxDuration = 60;

import { saveArticle } from "@hagit/kb/ingest";
import { prisma } from "@/lib/prisma";
import { withRoute } from "@/server/http/withRoute";
import { HttpError, notFoundError } from "@/server/http/errors";
import { idParam } from "@/server/http/schemas";
import { audit } from "@/server/admin/audit";

// POST /api/admin/kb/:id/reindex — rebuild chunks and embeddings for a published article.
export const POST = withRoute<"admin", undefined, undefined, { id: string }>(
    { name: "POST /api/admin/kb/:id/reindex", auth: "admin", permission: "kb:write" },
    async ({ user, params }) => {
        const id = idParam.safeParse(params.id);
        const article = id.success ? await prisma.kbArticle.findUnique({ where: { id: id.data } }) : null;
        if (!article) throw notFoundError("Article not found.");
        if (article.status !== "PUBLISHED") throw new HttpError(400, "Only published articles are indexed.");

        const { indexed } = await saveArticle(
            prisma,
            { ...article, sources: article.sources as never, status: "PUBLISHED", origin: article.origin },
            { id: article.id, force: true },
        );
        await audit(user.userId, "kb.article_reindexed", article.slug, { chunks: indexed?.chunks ?? 0 });
        return Response.json({ indexed });
    },
);
