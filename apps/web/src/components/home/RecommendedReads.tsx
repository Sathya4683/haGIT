"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, BookOpen } from "lucide-react";
import { apiClient } from "@/lib/api";
import type { HabitView } from "./types";

interface Read {
    articleId: number;
    slug: string;
    title: string;
    excerpt: string;
}

/** A query that matches where the user is right now. */
function queryFor(habits: HabitView[]) {
    if (habits.length === 0) return { q: "how to start a new habit small", why: "Starting out" };
    const longest = Math.max(...habits.map((h) => h.longestStreak));
    const current = Math.max(...habits.map((h) => h.currentStreak));
    if (longest >= 3 && current === 0) return { q: "missed a day get back on track never miss twice", why: "Bouncing back" };
    const quiet = habits.filter((h) => !h.recent.slice(-7).some(Boolean)).length;
    if (quiet > 0) return { q: "cues and environment to make habits stick", why: "Making it stick" };
    if (current >= 7) return { q: "how long does it take to form a habit automaticity", why: "Keep the streak" };
    return { q: "consistency same time same place routine", why: "Building consistency" };
}

/** Two library articles chosen for the user's current state. */
export function RecommendedReads({ habits }: { habits: HabitView[] }) {
    const { q, why } = queryFor(habits);
    const [reads, setReads] = useState<Read[] | null>(null);

    useEffect(() => {
        let cancelled = false;
        apiClient
            .get<{ results: Read[] }>("/api/kb/search", { params: { q, limit: 10 } })
            .then((r) => {
                if (cancelled) return;
                const seen = new Set<number>();
                setReads(r.data.results.filter((x) => !seen.has(x.articleId) && seen.add(x.articleId)).slice(0, 2));
            })
            .catch(() => !cancelled && setReads([]));
        return () => { cancelled = true; };
    }, [q]);

    if (reads?.length === 0) return null;

    return (
        <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[rgb(var(--ink-muted))] mb-2">{why}</p>
            <ul className="space-y-2">
                {reads === null
                    ? [0, 1].map((i) => <li key={i} className="h-16 shimmer-bg" />)
                    : reads.map((r) => (
                        <li key={r.articleId}>
                            <Link href={`/kb/${r.slug}`} className="group flex gap-3 p-3 border-2 border-[rgb(var(--border))] hover:bg-[rgb(var(--paper-alt))] transition-colors">
                                <span className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300">
                                    <BookOpen size={15} />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="flex items-start gap-1 text-sm font-black leading-snug">
                                        {r.title}
                                        <ArrowUpRight size={13} className="flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </span>
                                    <span className="text-xs text-[rgb(var(--ink-muted))] line-clamp-2 mt-0.5">{cleanExcerpt(r.excerpt)}</span>
                                </span>
                            </Link>
                        </li>
                    ))}
            </ul>
        </div>
    );
}

/** Plain prose from a markdown chunk (chunks after the first open with a "…" overlap). */
function cleanExcerpt(text: string) {
    return text.replace(/^…\s*/, "").replace(/(^|\s)(?:[-*]|\d+\.)\s+/g, " ").replace(/[#*_`>]/g, "").trim();
}
