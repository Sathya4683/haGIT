import Link from "next/link";
import { FilePlus2, FlaskConical } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { EmptyState, Forbidden, PageHeader } from "@/components/admin/ui";
import { KbList } from "@/components/admin/KbList";
import { adminBasePath, getAdminActor } from "@/server/admin/session";

export default async function AdminKbPage() {
    const actor = (await getAdminActor())!;
    if (!can(actor.role, "kb:write")) return <Forbidden />;
    const base = adminBasePath();

    const articles = await prisma.kbArticle.findMany({
        orderBy: [{ status: "desc" }, { updatedAt: "desc" }],
        select: { id: true, slug: true, title: true, status: true, origin: true, tags: true, updatedAt: true, _count: { select: { chunks: true } } },
    });

    const button = "btn-press-sm inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-2";
    return (
        <>
            <PageHeader
                eyebrow="~/content/kb"
                title="Knowledge base"
                description="Published articles are chunked, embedded and cited by the coach. Repository articles sync from content/kb on deploy; edits made here take precedence."
                actions={
                    <>
                        <Link href={`${base}/kb/playground`} className={`${button} border-[rgb(var(--border))] hover:bg-[rgb(var(--paper-alt))]`}><FlaskConical size={13} /> Playground</Link>
                        <Link href={`${base}/kb/new`} className={`${button} bg-brand-500 text-white border-ink shadow-brutal-sm`}><FilePlus2 size={13} /> New article</Link>
                    </>
                }
            />
            {articles.length === 0 ? (
                <EmptyState>No articles yet. Create one, or run <span className="font-mono">npm run kb:sync</span> to import the repository articles.</EmptyState>
            ) : (
                <KbList
                    base={base}
                    articles={articles.map((a) => ({
                        id: a.id, title: a.title, slug: a.slug, status: a.status, origin: a.origin, tags: a.tags,
                        chunks: a._count.chunks, updatedAt: a.updatedAt.toISOString(),
                    }))}
                />
            )}
        </>
    );
}
