"use client";
import { Fragment, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, Bot, Check, Copy, Send, X } from "lucide-react";
import { toast } from "sonner";
import { coachApi } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";
import { cn } from "@/lib/utils";
import type { CoachResponse, CoachSource, CoachTurn } from "@/types";

// Floating habit-coach chat. Questions carry the last few turns as context; reviews follow up
// on the last saved review. Runs happen only on demand because each one spends shared
// free-tier Gemini quota.
const STORAGE_KEY = "hagit_coach_last";

const SUGGESTIONS = [
    "Why do I keep missing my habits on weekends?",
    "Which habit needs the most attention?",
    "I broke my streak. How do I get back on track?",
    "How can I make my newest habit easier?",
];

const LOADING_STAGES = ["Reading your stats…", "Searching the library…", "Thinking it through…"];

interface SavedReview extends CoachResponse { createdAt: string; }

interface Message {
    id: number;
    role: "user" | "coach";
    text: string;
    tools?: string[];
    sources?: CoachSource[];
    /** Small label above a coach message. */
    note?: string;
}

function loadSavedReview(): SavedReview | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
}

function saveReview(review: SavedReview) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(review)); }
    catch { /* storage unavailable, the review still shows */ }
}

const toolNames = (r: CoachResponse) =>
    Array.from(new Set(r.toolCalls.map((t) => t.name).filter((n) => n !== "search_knowledge_base")));

/** Renders a reply, turning [KB12] tags into links to the cited article. */
function CoachText({ text, sources }: { text: string; sources?: CoachSource[] }) {
    const byId = new Map(sources?.map((s) => [s.articleId, s]));
    const parts = text.split(/(\[KB\d+\])/g);
    return (
        <>
            {parts.map((part, i) => {
                const match = part.match(/^\[KB(\d+)\]$/);
                const source = match && byId.get(Number(match[1]));
                if (!source) return <Fragment key={i}>{part}</Fragment>;
                return (
                    <a
                        key={i}
                        href={`/kb/${source.slug}`}
                        target="_blank"
                        rel="noopener"
                        title={source.title}
                        className="inline-flex items-center align-baseline mx-0.5 px-1 py-px text-[10px] leading-none font-black font-mono border-2 border-[rgb(var(--border))] bg-[rgb(var(--paper))] hover:bg-brand-500 hover:text-white hover:border-ink transition-colors no-underline"
                    >
                        KB{source.articleId}
                    </a>
                );
            })}
        </>
    );
}

export function CoachChat() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [lastReview, setLastReview] = useState<SavedReview | null>(null);
    const [question, setQuestion] = useState("");
    const [loading, setLoading] = useState(false);
    const [stage, setStage] = useState(0);
    const [disabled, setDisabled] = useState(false);
    const [copied, setCopied] = useState<number | null>(null);
    const nextId = useRef(0);
    const endRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const saved = loadSavedReview();
        setLastReview(saved);
        if (saved) {
            setMessages([{
                id: nextId.current++, role: "coach", text: saved.reply, tools: toolNames(saved), sources: saved.sources,
                note: `Last review · ${new Date(saved.createdAt).toLocaleDateString()}`,
            }]);
        }
    }, []);

    // "Ask the coach" links from the library open the chat with a prefilled question.
    useEffect(() => {
        const prefill = searchParams.get("coach");
        if (!prefill) return;
        setQuestion(prefill.slice(0, 500));
        setOpen(true);
        router.replace("/dashboard", { scroll: false });
    }, [searchParams, router]);

    useEffect(() => { if (open) endRef.current?.scrollIntoView({ block: "end" }); }, [open, messages, loading]);
    useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open]);
    useEffect(() => {
        if (!loading) { setStage(0); return; }
        const t = setInterval(() => setStage((s) => Math.min(s + 1, LOADING_STAGES.length - 1)), 1800);
        return () => clearInterval(t);
    }, [loading]);

    const push = (m: Omit<Message, "id">) => setMessages((prev) => [...prev, { ...m, id: nextId.current++ }]);

    const run = async (mode: "review" | "ask", preset?: string) => {
        const q = (preset ?? question).trim();
        if (loading || (mode === "ask" && !q)) return;
        const history: CoachTurn[] = messages.filter((m) => !m.note).slice(-6).map(({ role, text }) => ({ role, text }));
        push({ role: "user", text: mode === "review" ? "Weekly review, please." : q });
        if (mode === "ask") setQuestion("");
        setLoading(true);
        try {
            const response = mode === "review"
                ? await coachApi.run({ mode, previousReview: lastReview?.reply })
                : await coachApi.run({ mode, question: q, history });
            push({ role: "coach", text: response.reply, tools: toolNames(response), sources: response.sources });
            if (mode === "review") {
                const saved = { ...response, createdAt: new Date().toISOString() };
                saveReview(saved);
                setLastReview(saved);
            }
        } catch (error) {
            if ((error as { response?: { status?: number } }).response?.status === 503) {
                setDisabled(true);
                push({ role: "coach", text: "The coach isn't enabled on this server." });
            } else {
                toast.error(apiErrorMessage(error, "The coach couldn't answer. Try again."));
                if (mode === "ask") setQuestion(q); // keep the question for a retry
            }
        } finally { setLoading(false); }
    };

    const copy = async (m: Message) => {
        try {
            await navigator.clipboard.writeText(m.text);
            setCopied(m.id);
            setTimeout(() => setCopied(null), 1500);
        } catch { /* clipboard unavailable */ }
    };

    const showSuggestions = messages.length === 0 || (messages.length === 1 && messages[0].note);

    return (
        <>
            {open && (
                <div
                    role="dialog" aria-label="haGIT Coach"
                    className="fixed z-40 inset-0 sm:inset-auto sm:bottom-24 sm:right-6 sm:w-[26rem] sm:h-[min(36rem,calc(100vh_-_8rem))] flex flex-col bg-[rgb(var(--paper))] sm:border-2 border-[rgb(var(--border))] sm:shadow-brutal-lg dark:sm:shadow-brutal-dark animate-bounce-in"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between gap-3 px-4 py-3 border-b-2 border-[rgb(var(--border))]">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 flex items-center justify-center bg-brand-500 text-white border-2 border-ink">
                                <Bot size={16} strokeWidth={2.5} />
                            </div>
                            <div>
                                <p className="text-sm font-black leading-tight">haGIT Coach</p>
                                <p className="text-[10px] font-bold text-[rgb(var(--ink-muted))]">Your data + the habit library · Gemini</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setOpen(false)} aria-label="Close coach"
                            className="w-7 h-7 flex items-center justify-center border-2 border-[rgb(var(--border))] hover:bg-[rgb(var(--paper-alt))] transition-colors"
                        >
                            <X size={13} strokeWidth={2.5} />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                        {messages.length === 0 && (
                            <p className="text-sm text-[rgb(var(--ink-muted))]">
                                Ask about your habits, or get a weekly review with your wins, watch-outs and a few small next steps.
                                Advice from the habit library is cited with <span className="font-mono font-black text-[10px] px-1 border-2 border-[rgb(var(--border))]">KB</span> tags.
                            </p>
                        )}
                        {messages.map((m) => m.role === "user" ? (
                            <div key={m.id} className="flex justify-end animate-fade-in">
                                <p className="max-w-[85%] px-3 py-2 text-sm font-medium whitespace-pre-line bg-brand-500 text-white border-2 border-ink">
                                    {m.text}
                                </p>
                            </div>
                        ) : (
                            <div key={m.id} className="group max-w-[94%] space-y-1.5 animate-fade-in">
                                {m.note && (
                                    <p className="text-[10px] font-black uppercase tracking-widest text-[rgb(var(--ink-muted))]">{m.note}</p>
                                )}
                                <div className="relative">
                                    <p className="px-3 py-2 pr-8 text-sm leading-relaxed whitespace-pre-line bg-[rgb(var(--card-bg))] border-2 border-[rgb(var(--border))]">
                                        <CoachText text={m.text} sources={m.sources} />
                                    </p>
                                    <button
                                        onClick={() => copy(m)} aria-label="Copy answer"
                                        className="absolute top-1.5 right-1.5 p-1 opacity-0 group-hover:opacity-100 focus:opacity-100 text-[rgb(var(--ink-muted))] hover:text-[rgb(var(--ink))] transition-opacity"
                                    >
                                        {copied === m.id ? <Check size={12} /> : <Copy size={12} />}
                                    </button>
                                </div>
                                {m.sources && m.sources.length > 0 && (
                                    <div className="flex flex-wrap items-center gap-1">
                                        <BookOpen size={11} className="text-[rgb(var(--ink-muted))]" />
                                        {m.sources.map((s) => (
                                            <a
                                                key={s.articleId} href={`/kb/${s.slug}`} target="_blank" rel="noopener"
                                                className="text-[10px] font-bold px-1.5 py-0.5 border-2 border-[rgb(var(--border))] hover:bg-[rgb(var(--paper-alt))]"
                                            >
                                                <span className="font-mono font-black">KB{s.articleId}</span> · {s.title}
                                            </a>
                                        ))}
                                    </div>
                                )}
                                {m.tools && m.tools.length > 0 && (
                                    <div className="flex flex-wrap items-center gap-1">
                                        <span className="text-[10px] font-bold text-[rgb(var(--ink-muted))]">Looked at</span>
                                        {m.tools.map((t) => (
                                            <span key={t} className="text-[10px] font-mono font-bold px-1.5 py-0.5 border-2 border-[rgb(var(--border))]">{t}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                        {loading && (
                            <div className="flex items-center gap-2 text-xs font-bold text-[rgb(var(--ink-muted))]">
                                <span className="w-3 h-3 border-2 border-[rgb(var(--border))] border-t-brand-500 rounded-full animate-spin" />
                                {LOADING_STAGES[stage]}
                            </div>
                        )}
                        {showSuggestions && !loading && !disabled && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                                {SUGGESTIONS.map((s) => (
                                    <button
                                        key={s} onClick={() => run("ask", s)}
                                        className="text-left text-xs font-bold px-2.5 py-1.5 border-2 border-dashed border-[rgb(var(--border))] hover:border-solid hover:bg-[rgb(var(--paper-alt))] transition-colors"
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        )}
                        <div ref={endRef} />
                    </div>

                    {/* Composer */}
                    <div className="border-t-2 border-[rgb(var(--border))] p-3 space-y-2">
                        <button
                            onClick={() => run("review")} disabled={loading || disabled}
                            className="px-2.5 py-1 text-xs font-bold border-2 border-[rgb(var(--border))] hover:bg-[rgb(var(--paper-alt))] transition-all disabled:opacity-50"
                        >
                            {lastReview ? "New weekly review" : "Weekly review"}
                        </button>
                        <form onSubmit={(e) => { e.preventDefault(); run("ask"); }} className="flex gap-2">
                            <input
                                ref={inputRef} value={question} onChange={(e) => setQuestion(e.target.value)}
                                maxLength={500} disabled={disabled} placeholder="Why do I keep missing gym?"
                                className="input-brutal flex-1 min-w-0 px-3 py-2 text-sm"
                            />
                            <button
                                type="submit" aria-label="Send" disabled={loading || disabled || !question.trim()}
                                className="btn-press-sm w-10 flex-shrink-0 flex items-center justify-center bg-brand-500 hover:bg-brand-600 text-white border-2 border-ink shadow-brutal-sm transition-all disabled:opacity-50"
                            >
                                <Send size={14} strokeWidth={2.5} />
                            </button>
                        </form>
                        <p className="text-[10px] text-[rgb(var(--ink-muted))]">Answers come from your haGIT data and the habit library, and can be wrong.</p>
                    </div>
                </div>
            )}

            <button
                onClick={() => setOpen((o) => !o)}
                aria-label={open ? "Close coach" : "Open coach"} aria-expanded={open}
                className={cn(
                    "btn-press fixed z-40 bottom-6 right-4 sm:right-6 w-14 h-14 items-center justify-center bg-brand-500 hover:bg-brand-600 text-white border-2 border-ink shadow-brutal dark:shadow-brutal-dark transition-all",
                    open ? "hidden sm:flex" : "flex",
                )}
            >
                {open ? <X size={22} strokeWidth={2.5} /> : <Bot size={22} strokeWidth={2.5} />}
            </button>
        </>
    );
}
