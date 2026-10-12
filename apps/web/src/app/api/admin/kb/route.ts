export const runtime = "nodejs";
export const maxDuration = 60;

import { saveArticle } from "@hagit/kb/ingest";
import { prisma } from "@/lib/prisma";
import { rateLimits } from "@/lib/rate-limit";
import { withRoute } from "@/server/http/withRoute";
import { audit } from "@/server/admin/audit";
import { articleInput, revalidateKb, type ArticleInput } from "@/server/kb/admin";

// POST /api/admin/kb  — create an article (indexed immediately when published)
export const POST = withRoute<"admin", ArticleInput>(
    {
        name: "POST /api/admin/kb",
        auth: "admin",
        permission: "kb:write",
        body: articleInput,
        rateLimit: ({ user }) => rateLimits.user(user.userId, "admin-write", rateLimits.perMinute(30)),
        conflictMessage: "An article with this slug already exists.",
    },
    async ({ user, body }) => {
        const existing = await prisma.kbArticle.findUnique({ where: { slug: body.slug }, select: { id: true } });
        if (existing) return Response.json({ error: "An article with this slug already exists." }, { status: 409 });

        const { article, indexed } = await saveArticle(prisma, { ...body, origin: "ADMIN", authorId: user.userId });
        await audit(user.userId, "kb.article_created", article.slug, { status: article.status, chunks: indexed?.chunks ?? 0 });
        revalidateKb(article.slug);
        return Response.json({ id: article.id, slug: article.slug, status: article.status, indexed }, { status: 201 });
    },
);
