import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { AskCoachButton } from "@/components/home/AskCoachButton";
import { Markdown, stripLeadingTitle } from "@/components/kb/Markdown";
import { tableOfContents } from "@/components/kb/toc";
import { getPublishedArticle, relatedArticles } from "@/server/kb/queries";

// Rendered per request from cached data (see server/kb/queries.ts), so builds need no database.
export const dynamic = "force-dynamic";

type Props = { params: { slug: string } };

interface Source {
    title: string;
    url?: string;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const article = await getPublishedArticle(params.slug);
    if (!article) return { title: "Article not found" };
    return { title: article.title, description: article.summary };
}

export default async function KbArticlePage({ params }: Props) {
    const article = await getPublishedArticle(params.slug);
    if (!article) notFound();

    const body = stripLeadingTitle(article.body);
    const toc = tableOfContents(body);
    const sources = (article.sources as unknown as Source[]) ?? [];
    const related = await relatedArticles(article.id);
    const askCoach = `I just read "${article.title}". How could I apply it to my habits?`;

    return (
        <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-5 sm:pt-8">
            <Link href="/kb" className="inline-flex items-center gap-1.5 text-xs font-bold text-[rgb(var(--ink-muted))] hover:text-[rgb(var(--ink))] mb-6">
                <ArrowLeft size={12} strokeWidth={2.5} /> All articles
            </Link>

            <div className="lg:grid lg:grid-cols-[minmax(0,46rem)_220px] lg:justify-between lg:gap-12">
                <article className="min-w-0">
                    <header className="mb-8">
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                            <span className="text-[10px] font-black font-mono px-1.5 py-0.5 border-2 border-[rgb(var(--border))]">KB{article.id}</span>
                            <span className="text-[11px] font-bold text-[rgb(var(--ink-muted))]">{article.readingMinutes} min read</span>
                            {article.tags.map((t) => (
                                <Link key={t} href="/kb" className="text-[10px] font-bold px-1.5 py-0.5 bg-[rgb(var(--paper-alt))]">{t}</Link>
                            ))}
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-[1.1]">{article.title}</h1>
                        <div className="mt-3 h-1 w-14 bg-brand-500" />
                        <p className="mt-4 text-base text-[rgb(var(--ink-muted))] leading-relaxed">{article.summary}</p>
                    </header>

                    <Markdown source={body} />

                    {sources.length > 0 && (
                        <section className="mt-12 card-flat p-5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-[rgb(var(--ink-muted))] mb-3">Sources</p>
                            <ol className="space-y-2 text-sm list-decimal pl-5">
                                {sources.map((s) => (
                                    <li key={s.title}>
                                        {s.url ? (
                                            <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline decoration-brand-500 decoration-2 underline-offset-2">
                                                {s.title} <ExternalLink size={11} className="inline -mt-0.5" />
                                            </a>
                                        ) : (
                                            s.title
                                        )}
                                    </li>
                                ))}
                            </ol>
                        </section>
                    )}

                    <div className="mt-8 card p-5 flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <p className="font-black">Make it personal</p>
                            <p className="text-sm text-[rgb(var(--ink-muted))]">Ask the coach how this applies to your own habit data.</p>
                        </div>
                        <AskCoachButton question={askCoach} />
                    </div>

                    {related.length > 0 && (
                        <section className="mt-12">
                            <p className="text-[10px] font-black uppercase tracking-widest text-[rgb(var(--ink-muted))] mb-3">Related</p>
                            <div className="grid sm:grid-cols-3 gap-3">
                                {related.map((r) => (
                                    <Link key={r.id} href={`/kb/${r.slug}`} className="card-sm p-4 hover:bg-[rgb(var(--paper-alt))] transition-colors">
                                        <p className="text-sm font-black leading-snug">{r.title}</p>
                                        <p className="text-xs text-[rgb(var(--ink-muted))] mt-1.5 line-clamp-2">{r.summary}</p>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}
                </article>

                {toc.length > 1 && (
                    <aside className="hidden lg:block">
                        <nav className="sticky top-20 border-l-2 border-[rgb(var(--border))] pl-4 space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-[rgb(var(--ink-muted))]">On this page</p>
                            {toc.map((item) => (
                                <a key={item.id} href={`#${item.id}`} className="block text-xs font-bold text-[rgb(var(--ink-muted))] hover:text-[rgb(var(--ink))]">
                                    {item.text}
                                </a>
                            ))}
                        </nav>
                    </aside>
                )}
            </div>
        </main>
    );
}
