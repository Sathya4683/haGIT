"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RankOptions } from "@hagit/kb";

interface Row {
    chunkId: number;
    slug: string;
    title: string;
    heading: string;
    similarity: number | null;
    denseRank: number | null;
    lexicalRank: number | null;
    score: number;
    selected: boolean;
}

export function RetrievalPlayground({ options }: { options: Required<RankOptions> }) {
    const [query, setQuery] = useState("I keep skipping the gym on weekends");
    const [rows, setRows] = useState<Row[] | null>(null);
    const [timings, setTimings] = useState<{ embedMs: number; retrieveMs: number } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const run = async (e?: React.FormEvent) => {
        e?.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/admin/kb/explain?q=${encodeURIComponent(query)}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? "Search failed.");
            setRows(data.rows);
            setTimings(data.timings);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-5">
            <form onSubmit={run} className="flex gap-2">
                <input value={query} onChange={(e) => setQuery(e.target.value)} className="input-brutal flex-1 px-3 py-2.5 text-sm" placeholder="Ask like a user would…" />
                <button type="submit" disabled={loading || query.trim().length < 2} className="btn-press flex items-center gap-2 px-4 text-sm font-bold bg-brand-500 text-white border-2 border-ink shadow-brutal disabled:opacity-60">
                    <Search size={14} /> {loading ? "Ranking…" : "Rank"}
                </button>
            </form>

            <div className="flex flex-wrap gap-2 text-[11px] font-mono">
                {[
                    `min similarity ${options.minSimilarity}`,
                    `with lexical match ${options.minSimilarityWithLexical}`,
                    `within ${options.relativeMargin} of best`,
                    `≤${options.perArticle} chunks/article`,
                    `top ${options.limit}`,
                    `RRF k=${options.rrfK}`,
                ].map((t) => (
                    <span key={t} className="px-1.5 py-0.5 border-2 border-[rgb(var(--border))]">{t}</span>
                ))}
                {timings && <span className="px-1.5 py-0.5 bg-[rgb(var(--paper-alt))]">embed {timings.embedMs} ms · retrieve {timings.retrieveMs} ms</span>}
            </div>

            {error && <p className="text-sm font-bold text-red-600">{error}</p>}

            {rows && (
                <div className="card overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b-2 border-[rgb(var(--border))] text-left text-[10px] font-black uppercase tracking-widest text-[rgb(var(--ink-muted))]">
                                <th className="px-3 py-3">#</th>
                                <th className="px-3 py-3">Chunk</th>
                                <th className="px-3 py-3 text-right">Cosine</th>
                                <th className="px-3 py-3 text-right">Dense</th>
                                <th className="px-3 py-3 text-right">Lexical</th>
                                <th className="px-3 py-3 text-right">RRF</th>
                                <th className="px-3 py-3">Used</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r, i) => (
                                <tr key={r.chunkId} className={cn("border-b border-dashed border-[rgb(var(--border))] last:border-0", r.selected && "bg-brand-500/10")}>
                                    <td className="px-3 py-2 font-mono text-xs">{i + 1}</td>
                                    <td className="px-3 py-2">
                                        <p className="font-bold text-xs">{r.title}</p>
                                        <p className="text-[11px] text-[rgb(var(--ink-muted))]">{r.heading.split(" > ").slice(1).join(" › ") || "Intro"}</p>
                                    </td>
                                    <td className="px-3 py-2 text-right font-mono text-xs">{r.similarity?.toFixed(3) ?? "—"}</td>
                                    <td className="px-3 py-2 text-right font-mono text-xs">{r.denseRank ?? "—"}</td>
                                    <td className="px-3 py-2 text-right font-mono text-xs">{r.lexicalRank ?? "—"}</td>
                                    <td className="px-3 py-2 text-right font-mono text-xs">{r.score.toFixed(4)}</td>
                                    <td className="px-3 py-2 text-xs font-black">{r.selected ? "✓" : ""}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
