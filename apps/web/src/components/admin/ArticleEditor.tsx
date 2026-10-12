"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bold, Code, Heading2, Heading3, Italic, Link2, List, ListOrdered, Quote, Trash2, Upload, RefreshCw } from "lucide-react";
import { Markdown, stripLeadingTitle } from "@/components/kb/Markdown";
import { cn } from "@/lib/utils";

export interface EditableArticle {
    id?: number;
    title: string;
    slug: string;
    summary: string;
    tags: string[];
    sources: { title: string; url?: string }[];
    body: string;
    status: "DRAFT" | "PUBLISHED";
    origin?: "REPO" | "ADMIN";
    chunks?: number;
    indexedAt?: string | null;
}

const EMPTY: EditableArticle = { title: "", slug: "", summary: "", tags: [], sources: [], body: "", status: "DRAFT" };

function slugify(title: string) {
    return title.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

const sourcesToText = (s: EditableArticle["sources"]) => s.map((x) => (x.url ? `${x.title} | ${x.url}` : x.title)).join("\n");
const textToSources = (text: string) =>
    text.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
        const [title, url] = l.split(/\s+\|\s+/);
        return url ? { title: title.trim(), url: url.trim() } : { title: title.trim() };
    });

type View = "split" | "write" | "preview";

export function ArticleEditor({ base, initial }: { base: "" | "/admin"; initial?: EditableArticle }) {
    const router = useRouter();
    const [a, setA] = useState<EditableArticle>(initial ?? EMPTY);
    const [tagsText, setTagsText] = useState((initial?.tags ?? []).join(", "));
    const [sourcesText, setSourcesText] = useState(sourcesToText(initial?.sources ?? []));
    const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));
    const [view, setView] = useState<View>("split");
    const [saving, setSaving] = useState<string | null>(null);
    const [dragging, setDragging] = useState(false);
    const bodyRef = useRef<HTMLTextAreaElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const isNew = !a.id;

    const set = <K extends keyof EditableArticle>(key: K, value: EditableArticle[K]) => setA((prev) => ({ ...prev, [key]: value }));

    const setTitle = (title: string) => setA((prev) => ({ ...prev, title, slug: slugTouched ? prev.slug : slugify(title) }));

    /** Wraps the selection (or inserts a placeholder) in the body textarea. */
    const format = (before: string, after = "", placeholder = "text", linePrefix = false) => {
        const el = bodyRef.current;
        if (!el) return;
        const { selectionStart: s, selectionEnd: e, value } = el;
        const selected = value.slice(s, e) || placeholder;
        let insert: string;
        if (linePrefix) {
            const lineStart = value.lastIndexOf("\n", s - 1) + 1;
            const block = value.slice(lineStart, e) || placeholder;
            insert = block.split("\n").map((line, i) => `${before.replace("1.", `${i + 1}.`)}${line}`).join("\n");
            const next = value.slice(0, lineStart) + insert + value.slice(Math.max(e, lineStart));
            set("body", next);
            requestAnimationFrame(() => { el.focus(); el.setSelectionRange(lineStart, lineStart + insert.length); });
            return;
        }
        insert = `${before}${selected}${after}`;
        set("body", value.slice(0, s) + insert + value.slice(e));
        requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + before.length, s + before.length + selected.length); });
    };

    const loadFile = async (file: File) => {
        if (!file.name.toLowerCase().endsWith(".md") && file.type !== "text/markdown") {
            toast.error("Upload a Markdown (.md) file.");
            return;
        }
        if (file.size > 200_000) {
            toast.error("Files are limited to 200 KB.");
            return;
        }
        if (a.body.trim() && !confirm("Replace the current content with this file?")) return;
        const markdown = await file.text();
        const res = await fetch("/api/admin/kb/parse", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ markdown }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            toast.error(data.error ?? "Couldn't read the file.");
            return;
        }
        setA((prev) => ({ ...prev, title: data.title, slug: isNew ? data.slug : prev.slug, summary: data.summary, body: data.body }));
        setSlugTouched(true);
        setTagsText((data.tags ?? []).join(", "));
        setSourcesText(sourcesToText(data.sources ?? []));
        toast.success(`Loaded ${file.name}`);
    };

    const save = async (status: EditableArticle["status"], label: string) => {
        setSaving(label);
        try {
            const payload = {
                title: a.title,
                slug: a.slug,
                summary: a.summary,
                tags: tagsText.split(",").map((t) => t.trim()).filter(Boolean),
                sources: textToSources(sourcesText),
                body: a.body,
                status,
            };
            const res = await fetch(isNew ? "/api/admin/kb" : `/api/admin/kb/${a.id}`, {
                method: isNew ? "POST" : "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error ?? "Save failed.");
            const indexed = data.indexed ? ` · indexed ${data.indexed.chunks} chunks in ${data.indexed.ms} ms` : "";
            toast.success(`${status === "PUBLISHED" ? "Published" : "Saved as draft"}${indexed}`);
            if (isNew) router.replace(`${base}/kb/${data.id}`);
            else {
                setA((prev) => ({ ...prev, status, origin: "ADMIN" }));
                router.refresh();
            }
        } catch (e) {
            toast.error((e as Error).message);
        } finally {
            setSaving(null);
        }
    };

    const remove = async () => {
        if (!a.id || !confirm(`Delete "${a.title}"? This can't be undone.`)) return;
        setSaving("delete");
        const res = await fetch(`/api/admin/kb/${a.id}`, { method: "DELETE" });
        setSaving(null);
        if (!res.ok) return toast.error("Delete failed.");
        toast.success("Article deleted.");
        router.replace(`${base}/kb`);
        router.refresh();
    };

    const reindex = async () => {
        if (!a.id) return;
        setSaving("reindex");
        const res = await fetch(`/api/admin/kb/${a.id}/reindex`, { method: "POST" });
        const data = await res.json().catch(() => ({}));
        setSaving(null);
        if (!res.ok) return toast.error(data.error ?? "Re-index failed.");
        toast.success(`Re-indexed ${data.indexed?.chunks ?? 0} chunks in ${data.indexed?.ms ?? 0} ms`);
        router.refresh();
    };

    const tools: { icon: typeof Bold; label: string; run: () => void }[] = [
        { icon: Heading2, label: "Heading", run: () => format("## ", "", "Heading", true) },
        { icon: Heading3, label: "Subheading", run: () => format("### ", "", "Subheading", true) },
        { icon: Bold, label: "Bold", run: () => format("**", "**") },
        { icon: Italic, label: "Italic", run: () => format("*", "*") },
        { icon: List, label: "Bulleted list", run: () => format("- ", "", "Item", true) },
        { icon: ListOrdered, label: "Numbered list", run: () => format("1. ", "", "Item", true) },
        { icon: Quote, label: "Quote", run: () => format("> ", "", "Quote", true) },
        { icon: Code, label: "Code", run: () => format("`", "`", "code") },
        { icon: Link2, label: "Link", run: () => format("[", "](https://)", "link text") },
    ];

    const field = "input-brutal w-full px-3 py-2 text-sm";
    const label = "text-[10px] font-black uppercase tracking-widest text-[rgb(var(--ink-muted))]";

    return (
        <div className="space-y-6">
            {a.origin === "REPO" && (
                <div className="card-flat p-3 text-xs">
                    This article is synced from <span className="font-mono">content/kb/{a.slug}.md</span>. Saving it here hands it over to the
                    console: repository updates will no longer overwrite it.
                </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
                <label className="space-y-1.5 md:col-span-2">
                    <span className={label}>Title</span>
                    <input value={a.title} onChange={(e) => setTitle(e.target.value)} className={cn(field, "text-base font-bold")} placeholder="Never miss twice" />
                </label>
                <label className="space-y-1.5">
                    <span className={label}>Slug</span>
                    <input value={a.slug} onChange={(e) => { setSlugTouched(true); set("slug", e.target.value); }} className={cn(field, "font-mono")} placeholder="never-miss-twice" />
                </label>
                <label className="space-y-1.5">
                    <span className={label}>Tags (comma separated)</span>
                    <input value={tagsText} onChange={(e) => setTagsText(e.target.value)} className={field} placeholder="streaks, setbacks" />
                </label>
                <label className="space-y-1.5 md:col-span-2">
                    <span className={label}>Summary</span>
                    <textarea value={a.summary} onChange={(e) => set("summary", e.target.value)} rows={2} className={cn(field, "resize-none")} placeholder="One or two sentences shown on cards and search results." />
                </label>
            </div>

            {/* Body editor */}
            <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className={label}>Content (Markdown)</span>
                    <div className="flex items-center gap-1">
                        {(["write", "split", "preview"] as View[]).map((v) => (
                            <button
                                key={v} onClick={() => setView(v)}
                                className={cn("px-2.5 py-1 text-xs font-bold border-2 capitalize", view === v ? "bg-ink dark:bg-white text-white dark:text-ink border-ink dark:border-white" : "border-[rgb(var(--border))]", v === "split" && "hidden lg:block")}
                            >
                                {v}
                            </button>
                        ))}
                        <button onClick={() => fileRef.current?.click()} className="ml-2 flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold border-2 border-[rgb(var(--border))] hover:bg-[rgb(var(--paper-alt))]">
                            <Upload size={12} /> Upload .md
                        </button>
                        <input ref={fileRef} type="file" accept=".md,text/markdown" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f); e.target.value = ""; }} />
                    </div>
                </div>

                <div className={cn("grid gap-4", view === "split" && "lg:grid-cols-2")}>
                    {view !== "preview" && (
                        <div
                            className={cn("card-flat flex flex-col", dragging && "outline outline-2 outline-offset-2 outline-[rgb(var(--brand))]")}
                            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                            onDragLeave={() => setDragging(false)}
                            onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) loadFile(f); }}
                        >
                            <div className="flex flex-wrap gap-0.5 p-1.5 border-b-2 border-[rgb(var(--border))]">
                                {tools.map(({ icon: Icon, label: l, run }) => (
                                    <button key={l} onClick={run} title={l} aria-label={l} className="w-7 h-7 flex items-center justify-center hover:bg-[rgb(var(--paper-alt))]">
                                        <Icon size={14} />
                                    </button>
                                ))}
                            </div>
                            <textarea
                                ref={bodyRef}
                                value={a.body}
                                onChange={(e) => set("body", e.target.value)}
                                placeholder={"## A section heading\n\nWrite here, or drop a .md file onto this box."}
                                className="flex-1 min-h-[28rem] w-full p-4 font-mono text-[13px] leading-relaxed bg-transparent outline-none resize-y"
                                spellCheck
                            />
                        </div>
                    )}
                    {view !== "write" && (
                        <div className="card-flat p-5 min-h-[28rem] overflow-auto">
                            {a.title && <h1 className="text-2xl font-black tracking-tight mb-4">{a.title}</h1>}
                            {a.body.trim() ? <Markdown source={stripLeadingTitle(a.body)} /> : <p className="text-sm text-[rgb(var(--ink-muted))]">Nothing to preview yet.</p>}
                        </div>
                    )}
                </div>
                <p className="text-[11px] text-[rgb(var(--ink-muted))]">
                    Use <span className="font-mono">##</span> headings to structure the article: each section becomes a retrieval chunk the coach can cite.
                </p>
            </div>

            <label className="block space-y-1.5">
                <span className={label}>Sources (one per line: Title | URL)</span>
                <textarea value={sourcesText} onChange={(e) => setSourcesText(e.target.value)} rows={3} className={cn(field, "font-mono text-xs")} placeholder="Lally et al. (2010). How are habits formed. | https://doi.org/10.1002/ejsp.674" />
            </label>

            {/* Actions */}
            <div className="sticky bottom-0 -mx-4 sm:mx-0 px-4 sm:px-0 py-3 bg-[rgb(var(--paper))] border-t-2 border-[rgb(var(--border))] flex flex-wrap items-center gap-2">
                <button
                    onClick={() => save("PUBLISHED", "publish")} disabled={saving !== null}
                    className="btn-press px-4 py-2 text-sm font-bold bg-brand-500 text-white border-2 border-ink shadow-brutal disabled:opacity-60"
                >
                    {saving === "publish" ? "Publishing…" : a.status === "PUBLISHED" && !isNew ? "Update" : "Publish"}
                </button>
                <button
                    onClick={() => save("DRAFT", "draft")} disabled={saving !== null}
                    className="btn-press-sm px-4 py-2 text-sm font-bold border-2 border-[rgb(var(--border))] hover:bg-[rgb(var(--paper-alt))] disabled:opacity-60"
                >
                    {saving === "draft" ? "Saving…" : a.status === "PUBLISHED" && !isNew ? "Unpublish" : "Save draft"}
                </button>
                {!isNew && a.status === "PUBLISHED" && (
                    <button onClick={reindex} disabled={saving !== null} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-2 border-[rgb(var(--border))] hover:bg-[rgb(var(--paper-alt))] disabled:opacity-60">
                        <RefreshCw size={12} className={cn(saving === "reindex" && "animate-spin")} /> Re-index
                    </button>
                )}
                <div className="flex-1" />
                {!isNew && (
                    <span className="text-[11px] text-[rgb(var(--ink-muted))]">
                        {a.status === "PUBLISHED" ? `${a.chunks ?? 0} chunks indexed` : "Draft: not searchable"}
                    </span>
                )}
                {!isNew && (
                    <button onClick={remove} disabled={saving !== null} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-600 dark:text-red-400 border-2 border-red-300 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20">
                        <Trash2 size={12} /> Delete
                    </button>
                )}
            </div>
        </div>
    );
}
