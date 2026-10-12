"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FileText, GitBranch, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState, StatusPill } from "./ui";

export interface KbRow {
    id: number;
    title: string;
    slug: string;
    status: "PUBLISHED" | "DRAFT";
    origin: "REPO" | "ADMIN";
    tags: string[];
    chunks: number;
    updatedAt: string;
}

const FILTERS = [
    { id: "all", label: "All" },
    { id: "PUBLISHED", label: "Live" },
    { id: "DRAFT", label: "Drafts" },
] as const;

export function KbList({ base, articles }: { base: string; articles: KbRow[] }) {
    const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
    const [query, setQuery] = useState("");

    const shown = useMemo(() => {
        const q = query.trim().toLowerCase();
        return articles.filter((a) =>
            (filter === "all" || a.status === filter) &&
            (!q || a.title.toLowerCase().includes(q) || a.slug.includes(q) || a.tags.some((t) => t.toLowerCase().includes(q))),
        );
    }, [articles, filter, query]);

    const count = (id: string) => (id === "all" ? articles.length : articles.filter((a) => a.status === id).length);

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                <div className="inline-flex border-2 border-[rgb(var(--border))] self-start" role="tablist" aria-label="Filter articles">
                    {FILTERS.map((f) => (
                        <button
                            key={f.id} role="tab" aria-selected={filter === f.id} onClick={() => setFilter(f.id)}
                            className={cn(
                                "flex items-center gap-1.5 h-9 px-3.5 text-xs font-bold border-r-2 last:border-r-0 border-[rgb(var(--border))]",
                                filter === f.id ? "bg-ink text-white dark:bg-white dark:text-ink" : "hover:bg-[rgb(var(--paper-alt))]",
                            )}
                        >
                            {f.label} <span className="font-mono opacity-60">{count(f.id)}</span>
                        </button>
                    ))}
                </div>
                <label className="relative sm:w-72">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--ink-muted))]" />
                    <input
                        value={query} onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search title, slug or tag"
                        aria-label="Search articles"
                        className="input-brutal w-full h-9 pl-9 pr-3 text-sm"
                    />
                </label>
            </div>

            {shown.length === 0 ? (
                <EmptyState>No articles match.</EmptyState>
            ) : (
                <ul className="card divide-y-2 divide-dashed divide-[rgb(var(--border))]/25">
                    {shown.map((a) => (
                        <li key={a.id}>
                            <Link href={`${base}/kb/${a.id}`} className="group flex items-start sm:items-center gap-3 sm:gap-4 px-4 py-3.5 hover:bg-[rgb(var(--paper-alt))] transition-colors">
                                <span className={cn(
                                    "w-9 h-9 flex-shrink-0 flex items-center justify-center",
                                    a.status === "PUBLISHED" ? "bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300" : "bg-[rgb(var(--paper-alt))] text-[rgb(var(--ink-muted))]",
                                )}>
                                    <FileText size={16} />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="font-bold leading-snug group-hover:underline decoration-brand-500 decoration-2 underline-offset-2">{a.title}</p>
                                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[rgb(var(--ink-muted))]">
                                        <span className="font-mono font-bold text-[rgb(var(--ink))]">KB{a.id}</span>
                                        <span className="font-mono">/{a.slug}</span>
                                        {a.tags.slice(0, 3).map((t) => (
                                            <span key={t} className="px-1.5 rounded-full bg-[rgb(var(--paper-alt))]">{t}</span>
                                        ))}
                                    </p>
                                </div>
                                <div className="hidden md:flex items-center gap-1.5 text-[11px] text-[rgb(var(--ink-muted))] w-28" title={a.origin === "REPO" ? "Synced from content/kb" : "Written in the console"}>
                                    <GitBranch size={12} /> {a.origin === "REPO" ? "repository" : "console"}
                                </div>
                                <div className="hidden sm:block w-20 text-right">
                                    <p className="font-mono text-sm font-bold tabular-nums">{a.chunks}</p>
                                    <p className="text-[10px] text-[rgb(var(--ink-muted))]">chunks</p>
                                </div>
                                <div className="flex flex-col items-end gap-1 w-24 flex-shrink-0">
                                    <StatusPill tone={a.status === "PUBLISHED" ? "good" : "idle"}>{a.status === "PUBLISHED" ? "Live" : "Draft"}</StatusPill>
                                    <span className="text-[10px] text-[rgb(var(--ink-muted))]">{new Date(a.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                                </div>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
