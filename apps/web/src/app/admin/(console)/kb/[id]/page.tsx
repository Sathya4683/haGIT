import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { ArticleEditor } from "@/components/admin/ArticleEditor";
import { Forbidden, PageHeader } from "@/components/admin/ui";
import { adminBasePath, getAdminActor } from "@/server/admin/session";

export default async function EditArticlePage({ params }: { params: { id: string } }) {
    const actor = (await getAdminActor())!;
    if (!can(actor.role, "kb:write")) return <Forbidden />;

    const id = Number(params.id);
    const article = Number.isSafeInteger(id)
        ? await prisma.kbArticle.findUnique({ where: { id }, include: { _count: { select: { chunks: true } } } })
        : null;
    if (!article) notFound();

    return (
        <>
            <PageHeader
                title={`KB${article.id} · ${article.title}`}
                description={article.status === "PUBLISHED" ? `Live at /kb/${article.slug}` : "Draft"}
                actions={
                    article.status === "PUBLISHED" ? (
                        <Link href={`/kb/${article.slug}`} target="_blank" className="btn-press-sm px-3 py-2 text-xs font-bold border-2 border-[rgb(var(--border))] hover:bg-[rgb(var(--paper-alt))]">
                            View ↗
                        </Link>
                    ) : undefined
                }
            />
            <ArticleEditor
                base={adminBasePath()}
                initial={{
                    id: article.id,
                    title: article.title,
                    slug: article.slug,
                    summary: article.summary,
                    tags: article.tags,
                    sources: (article.sources as unknown as { title: string; url?: string }[]) ?? [],
                    body: article.body,
                    status: article.status,
                    origin: article.origin,
                    chunks: article._count.chunks,
                    indexedAt: article.indexedAt?.toISOString() ?? null,
                }}
            />
        </>
    );
}
