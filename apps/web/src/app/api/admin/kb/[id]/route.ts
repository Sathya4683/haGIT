export const runtime = "nodejs";
export const maxDuration = 60;

import { saveArticle } from "@hagit/kb/ingest";
import { prisma } from "@/lib/prisma";
import { rateLimits } from "@/lib/rate-limit";
import { withRoute } from "@/server/http/withRoute";
import { notFoundError } from "@/server/http/errors";
import { idParam } from "@/server/http/schemas";
import { audit } from "@/server/admin/audit";
import { articleInput, revalidateKb, type ArticleInput } from "@/server/kb/admin";

type Params = { id: string };

async function findArticle(params: Params) {
    const id = idParam.safeParse(params.id);
    const article = id.success ? await prisma.kbArticle.findUnique({ where: { id: id.data } }) : null;
    if (!article) throw notFoundError("Article not found.");
    return article;
}

// PATCH /api/admin/kb/:id — update content/metadata/status; re-indexes when content changed.
// Editing a repository article hands it over to the console (repo sync stops overwriting it).
export const PATCH = withRoute<"admin", ArticleInput, undefined, Params>(
    {
        name: "PATCH /api/admin/kb/:id",
        auth: "admin",
        permission: "kb:write",
        body: articleInput,
        rateLimit: ({ user }) => rateLimits.user(user.userId, "admin-write", rateLimits.perMinute(30)),
        conflictMessage: "An article with this slug already exists.",
    },
    async ({ user, params, body }) => {
        const before = await findArticle(params);
        const { article, indexed } = await saveArticle(prisma, { ...body, origin: "ADMIN" }, { id: before.id });
        await audit(user.userId, "kb.article_updated", article.slug, {
            status: article.status,
            ...(before.status !== article.status && { from: before.status }),
            ...(indexed && { chunks: indexed.chunks }),
        });
        revalidateKb(article.slug);
        if (before.slug !== article.slug) revalidateKb(before.slug);
        return Response.json({ id: article.id, slug: article.slug, status: article.status, indexed });
    },
);

// DELETE /api/admin/kb/:id
export const DELETE = withRoute<"admin", undefined, undefined, Params>(
    {
        name: "DELETE /api/admin/kb/:id",
        auth: "admin",
        permission: "kb:write",
        rateLimit: ({ user }) => rateLimits.user(user.userId, "admin-write", rateLimits.perMinute(30)),
    },
    async ({ user, params }) => {
        const article = await findArticle(params);
        await prisma.kbArticle.delete({ where: { id: article.id } });
        await audit(user.userId, "kb.article_deleted", article.slug);
        revalidateKb(article.slug);
        return Response.json({ success: true });
    },
);
