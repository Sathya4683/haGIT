import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { EmptyState, Forbidden, PageHeader, formatDateTime } from "@/components/admin/ui";
import { adminBasePath, getAdminActor } from "@/server/admin/session";
import { cn } from "@/lib/utils";

export default async function AdminKbPage() {
    const actor = (await getAdminActor())!;
    if (!can(actor.role, "kb:write")) return <Forbidden />;
    const base = adminBasePath();

    const articles = await prisma.kbArticle.findMany({
        orderBy: [{ status: "desc" }, { updatedAt: "desc" }],
        select: {
            id: true, slug: true, title: true, status: true, origin: true, tags: true, updatedAt: true, indexedAt: true,
            _count: { select: { chunks: true } },
        },
    });
    const published = articles.filter((a) => a.status === "PUBLISHED").length;

    const button = "btn-press-sm px-3 py-2 text-xs font-bold border-2";
    return (
        <>
            <PageHeader
                title="Knowledge base"
                description={`${published} published · ${articles.length - published} drafts. Published articles are chunked, embedded and cited by the coach.`}
                actions={
                    <>
                        <Link href={`${base}/kb/playground`} className={cn(button, "border-[rgb(var(--border))] hover:bg-[rgb(var(--paper-alt))]")}>Playground</Link>
                        <Link href={`${base}/kb/new`} className={cn(button, "bg-brand-500 text-white border-ink shadow-brutal-sm")}>New article</Link>
                    </>
                }
            />
            {articles.length === 0 ? (
                <EmptyState>No articles yet. Create one, or run <span className="font-mono">npm run kb:sync</span> to import the repository articles.</EmptyState>
            ) : (
                <div className="card overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b-2 border-[rgb(var(--border))] text-left text-[10px] font-black uppercase tracking-widest text-[rgb(var(--ink-muted))]">
                                <th className="px-4 py-3">Article</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Source</th>
                                <th className="px-4 py-3 text-right">Chunks</th>
                                <th className="px-4 py-3">Updated</th>
                            </tr>
                        </thead>
                        <tbody>
                            {articles.map((a) => (
                                <tr key={a.id} className="border-b border-dashed border-[rgb(var(--border))] last:border-0">
                                    <td className="px-4 py-2.5">
                                        <Link href={`${base}/kb/${a.id}`} className="font-bold hover:underline decoration-brand-500 decoration-2 underline-offset-2">
                                            <span className="font-mono text-[10px] mr-1.5 px-1 border-2 border-[rgb(var(--border))]">KB{a.id}</span>
                                            {a.title}
                                        </Link>
                                        <p className="text-[11px] text-[rgb(var(--ink-muted))] mt-0.5">{a.tags.join(" · ")}</p>
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <span className={cn("text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 border-2", a.status === "PUBLISHED" ? "bg-brand-500 text-white border-ink" : "border-[rgb(var(--border))] text-[rgb(var(--ink-muted))]")}>
                                            {a.status === "PUBLISHED" ? "Live" : "Draft"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2.5 text-xs text-[rgb(var(--ink-muted))]">{a.origin === "REPO" ? "repository" : "console"}</td>
                                    <td className="px-4 py-2.5 text-right font-mono tabular-nums">{a._count.chunks}</td>
                                    <td className="px-4 py-2.5 text-xs whitespace-nowrap">{formatDateTime(a.updatedAt)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </>
    );
}
