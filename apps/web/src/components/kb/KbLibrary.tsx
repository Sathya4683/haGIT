"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ArticleCard } from "@/server/kb/queries";

interface Result {
    articleId: number;
    slug: string;
    title: string;
    heading: string;
    excerpt: string;
}

export function KbLibrary({ articles }: { articles: ArticleCard[] }) {
    const [tag, setTag] = useState<string | null>(null);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Result[] | null>(null);
    const [searching, setSearching] = useState(false);

    // Only tags shared by several articles are useful filters; cap the list to stay scannable.
    const tags = useMemo(() => {
        const counts = new Map<string, number>();
        for (const a of articles) for (const t of a.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
        return Array.from(counts)
            .filter(([, n]) => n >= 2)
            .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
            .slice(0, 12)
            .map(([t]) => t);
    }, [articles]);

    useEffect(() => {
        const q = query.trim();
        if (q.length < 2) {
            setResults(null);
            return;
        }
        const controller = new AbortController();
        const timer = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await fetch(`/api/kb/search?q=${encodeURIComponent(q)}&limit=6`, { signal: controller.signal });
                const data = await res.json();
                setResults(res.ok ? data.results : []);
            } catch {
                /* aborted or offline */
            } finally {
                setSearching(false);
            }
        }, 300);
        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [query]);

    const visible = tag ? articles.filter((a) => a.tags.includes(tag)) : articles;

    return (
        <div className="space-y-6">
            <div className="relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[rgb(var(--ink-muted))]" />
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Describe what you're struggling with, e.g. “I keep skipping workouts on Fridays”"
                    className="input-brutal w-full pl-10 pr-10 py-3 text-sm"
                    aria-label="Search the library"
                />
                {query && (
                    <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2" aria-label="Clear search">
                        <X size={15} />
                    </button>
                )}
            </div>

            {results !== null ? (
                <section className="space-y-3" aria-live="polite">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[rgb(var(--ink-muted))]">
                        {searching ? "Searching…" : `${results.length} matching passage${results.length === 1 ? "" : "s"}`}
                    </p>
                    {results.length === 0 && !searching && (
                        <div className="card-flat p-5 text-sm text-[rgb(var(--ink-muted))]">
                            Nothing close enough. Try describing the situation in different words.
                        </div>
                    )}
                    {results.map((r) => (
                        <Link key={`${r.articleId}-${r.heading}`} href={`/kb/${r.slug}`} className="block card p-4 hover:bg-[rgb(var(--paper-alt))] transition-colors">
                            <p className="text-sm font-black">{r.title}</p>
                            <p className="text-[11px] font-bold text-[rgb(var(--ink-muted))] mt-0.5">{r.heading.split(" > ").slice(1).join(" › ") || "Overview"}</p>
                            <p className="text-sm mt-2 text-[rgb(var(--ink-muted))] line-clamp-3">{r.excerpt}</p>
                        </Link>
                    ))}
                </section>
            ) : (
                <>
                    <div className="flex flex-wrap gap-1.5">
                        <TagChip active={tag === null} onClick={() => setTag(null)}>All</TagChip>
                        {tags.map((t) => (
                            <TagChip key={t} active={tag === t} onClick={() => setTag(tag === t ? null : t)}>
                                {t}
                            </TagChip>
                        ))}
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {visible.map((a) => (
                            <Link key={a.id} href={`/kb/${a.slug}`} className="group card p-5 flex flex-col hover:-translate-y-0.5 transition-transform">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-[10px] font-black font-mono px-1.5 py-0.5 border-2 border-[rgb(var(--border))]">KB{a.id}</span>
                                    <span className="text-[11px] font-bold text-[rgb(var(--ink-muted))]">{a.readingMinutes} min read</span>
                                </div>
                                <h2 className="font-black leading-snug group-hover:text-brand-600 dark:group-hover:text-brand-400">{a.title}</h2>
                                <p className="text-sm text-[rgb(var(--ink-muted))] mt-2 line-clamp-3 flex-1">{a.summary}</p>
                                <div className="flex flex-wrap gap-1 mt-4">
                                    {a.tags.slice(0, 3).map((t) => (
                                        <span key={t} className="text-[10px] font-bold px-1.5 py-0.5 bg-[rgb(var(--paper-alt))]">{t}</span>
                                    ))}
                                </div>
                            </Link>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

function TagChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "px-2.5 py-1 text-xs font-bold border-2 transition-colors",
                active
                    ? "bg-ink dark:bg-white text-white dark:text-ink border-ink dark:border-white"
                    : "border-[rgb(var(--border))] hover:bg-[rgb(var(--paper-alt))]",
            )}
        >
            {children}
        </button>
    );
}
