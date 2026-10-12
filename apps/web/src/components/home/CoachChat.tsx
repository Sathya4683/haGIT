"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
    AlertTriangle, ArrowUp, Bot, CalendarRange, Check, ClipboardList, Copy, Footprints, HeartPulse, Search, Sparkles, Target, Trophy, X,
} from "lucide-react";
import { toast } from "sonner";
import { coachApi } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";
import { citationOrder, parseReply, splitCitations, type SectionTone } from "@/lib/coach-format";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { useUiStore } from "@/store/uiStore";
import { displayName } from "@/components/ui/Avatar";
import type { CoachResponse, CoachSource, CoachTurn } from "@/types";

// Habit-coach chat. Questions carry the last few turns as context; reviews follow up on the
// last saved review. Runs happen only on demand because each one spends shared free-tier
// Gemini quota.
const STORAGE_KEY = "hagit_coach_last";

const SUGGESTIONS = [
    { text: "Why do I keep missing my habits on weekends?", icon: CalendarRange },
    { text: "Which habit needs the most attention?", icon: Target },
    { text: "I broke my streak. How do I get back on track?", icon: HeartPulse },
];

const LOADING_STAGES = ["Reading your stats", "Searching the library", "Thinking it through"];

const TOOL_LABELS: Record<string, string> = {
    list_habits: "your habits",
    get_habit_stats: "your stats",
    get_checkins: "recent commits",
    search_checkins: "your commit notes",
};

const TONES: Record<SectionTone, { icon: typeof Sparkles; color: string }> = {
    summary: { icon: Sparkles, color: "var(--brand-500)" },
    wins: { icon: Trophy, color: "var(--series-3)" },
    watch: { icon: AlertTriangle, color: "var(--series-4)" },
    next: { icon: Footprints, color: "var(--series-1)" },
    other: { icon: Sparkles, color: "var(--ink-muted)" },
};

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

const toolNames = (r: CoachResponse) => Array.from(new Set(r.toolCalls.map((t) => t.name)));

/** "Checked your stats and recent commits" from the tools a run used. */
function lookedAt(tools: string[] = []) {
    const parts = tools.map((t) => TOOL_LABELS[t]).filter(Boolean);
    if (tools.includes("search_knowledge_base")) parts.push("the library");
    if (parts.length === 0) return null;
    return parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

export function CoachChat() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { coachOpen: open, coachDraft, setCoachOpen, openCoachWith } = useUiStore();
    const email = useAuthStore((s) => s.user?.email);
    const [messages, setMessages] = useState<Message[]>([]);
    const [lastReview, setLastReview] = useState<SavedReview | null>(null);
    const [question, setQuestion] = useState("");
    const [loading, setLoading] = useState(false);
    const [stage, setStage] = useState(0);
    const [disabled, setDisabled] = useState(false);
    const nextId = useRef(0);
    const endRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const saved = loadSavedReview();
        setLastReview(saved);
        if (saved) {
            setMessages([{
                id: nextId.current++, role: "coach", text: saved.reply, tools: toolNames(saved), sources: saved.sources,
                note: `Last review · ${new Date(saved.createdAt).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}`,
            }]);
        }
    }, []);

    // "Ask the coach" links from the library open the chat with a prefilled question.
    useEffect(() => {
        const prefill = searchParams.get("coach");
        if (!prefill) return;
        openCoachWith(prefill.slice(0, 500));
        const rest = new URLSearchParams(searchParams);
        rest.delete("coach");
        const query = rest.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }, [searchParams, router, pathname, openCoachWith]);

    useEffect(() => {
        if (!coachDraft) return;
        setQuestion(coachDraft);
        useUiStore.setState({ coachDraft: "" });
    }, [coachDraft]);

    useEffect(() => { if (open) endRef.current?.scrollIntoView({ block: "end" }); }, [open, messages, loading]);
    useEffect(() => {
        if (!open) return;
        // Don't pop the keyboard over the conversation on phones.
        if (window.matchMedia("(min-width: 768px)").matches) inputRef.current?.focus();
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setCoachOpen(false); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, setCoachOpen]);
    useEffect(() => {
        if (!loading) { setStage(0); return; }
        const t = setInterval(() => setStage((s) => Math.min(s + 1, LOADING_STAGES.length - 1)), 1800);
        return () => clearInterval(t);
    }, [loading]);

    // Auto-grow the composer up to ~5 lines.
    useEffect(() => {
        const el = inputRef.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    }, [question, open]);

    const push = (m: Omit<Message, "id">) => setMessages((prev) => [...prev, { ...m, id: nextId.current++ }]);

    const run = async (mode: "review" | "ask", preset?: string) => {
        const q = (preset ?? question).trim();
        if (loading || disabled || (mode === "ask" && !q)) return;
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

    const empty = messages.length === 0 || (messages.length === 1 && Boolean(messages[0].note));

    return (
        <>
            <div
                role="dialog" aria-label="haGIT Coach" aria-hidden={!open}
                className={cn(
                    "fixed z-50 flex flex-col bg-[rgb(var(--paper))] transition-[transform,opacity,visibility] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
                    // Phones: full width above the tab bar. Desktop: floating panel by the button.
                    "inset-x-0 top-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))]",
                    "md:inset-auto md:bottom-24 md:right-6 md:w-[27rem] md:h-[min(40rem,calc(100vh-8rem))] md:border-2 md:border-[rgb(var(--border))] md:shadow-brutal-lg md:dark:shadow-brutal-dark md:origin-bottom-right",
                    open ? "visible translate-y-0 md:scale-100 opacity-100" : "invisible translate-y-[110%] md:translate-y-2 md:scale-95 md:opacity-0",
                )}
            >
                {/* Header */}
                <div className="relative flex items-center gap-3 px-4 h-16 flex-shrink-0 bg-ink text-white overflow-hidden">
                    <div className="absolute inset-0 dot-grid opacity-20 pointer-events-none" aria-hidden />
                    <CoachAvatar className="relative w-9 h-9" />
                    <div className="relative min-w-0 flex-1">
                        <p className="text-sm font-black leading-tight">haGIT Coach</p>
                        <p className="text-[11px] text-white/60 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-400" /> Reads your stats and the habit library
                        </p>
                    </div>
                    <button
                        onClick={() => run("review")} disabled={loading || disabled}
                        title={lastReview ? "New weekly review" : "Weekly review"}
                        className="relative hidden sm:flex items-center gap-1.5 h-8 px-2.5 text-[11px] font-bold border-2 border-white/30 hover:bg-white/10 disabled:opacity-40"
                    >
                        <ClipboardList size={13} /> Review
                    </button>
                    <button onClick={() => setCoachOpen(false)} aria-label="Close coach" className="relative w-8 h-8 flex items-center justify-center border-2 border-white/30 hover:bg-white/10">
                        <X size={14} strokeWidth={2.5} />
                    </button>
                </div>

                {/* Conversation */}
                <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-5 space-y-5">
                    {empty && (
                        <div className="text-center pt-2 pb-1 animate-fade-in">
                            <CoachAvatar className="w-14 h-14 mx-auto" big />
                            <p className="mt-3 font-black text-lg">Hi {displayName(email)}!</p>
                            <p className="text-sm text-[rgb(var(--ink-muted))] max-w-[19rem] mx-auto mt-1">
                                Ask me about your habits, or get a weekly review with wins, watch-outs and small next steps.
                            </p>
                        </div>
                    )}

                    {messages.map((m) => m.role === "user"
                        ? <UserBubble key={m.id} text={m.text} />
                        : <CoachMessage key={m.id} message={m} />)}

                    {loading && (
                        <div className="flex items-end gap-2 animate-fade-in" aria-live="polite">
                            <CoachAvatar className="w-7 h-7" />
                            <div className="px-3.5 py-2.5 bg-[rgb(var(--card-bg))] border-2 border-[rgb(var(--border))] flex items-center gap-2.5">
                                <span className="flex gap-1" aria-hidden>
                                    {[0, 1, 2].map((i) => (
                                        <span key={i} className="w-1.5 h-1.5 rounded-full bg-brand-500" style={{ animation: `dot-bounce 1.2s ${i * 0.15}s infinite ease-in-out` }} />
                                    ))}
                                </span>
                                <span className="text-xs text-[rgb(var(--ink-muted))]">{LOADING_STAGES[stage]}…</span>
                            </div>
                        </div>
                    )}

                    {empty && !loading && !disabled && (
                        <div className="grid gap-2 animate-fade-in">
                            <button
                                onClick={() => run("review")}
                                className="lift flex items-center gap-3 text-left p-3 bg-brand-500 text-white border-2 border-ink"
                            >
                                <ClipboardList size={18} className="flex-shrink-0" />
                                <span>
                                    <span className="block text-sm font-black">{lastReview ? "New weekly review" : "Weekly review"}</span>
                                    <span className="block text-xs text-white/80">Wins, watch-outs and three next steps</span>
                                </span>
                            </button>
                            {SUGGESTIONS.map(({ text, icon: Icon }) => (
                                <button
                                    key={text} onClick={() => run("ask", text)}
                                    className="flex items-center gap-3 text-left p-3 text-sm font-bold border-2 border-dashed border-[rgb(var(--border))] hover:border-solid hover:bg-[rgb(var(--card-bg))] transition-colors"
                                >
                                    <Icon size={16} className="flex-shrink-0 text-[rgb(var(--ink-muted))]" />
                                    {text}
                                </button>
                            ))}
                        </div>
                    )}
                    <div ref={endRef} />
                </div>

                {/* Composer */}
                <div className="flex-shrink-0 border-t-2 border-[rgb(var(--border))] p-3 bg-[rgb(var(--paper))]">
                    <form
                        onSubmit={(e) => { e.preventDefault(); run("ask"); }}
                        className="flex items-end gap-2 p-1.5 pl-3 bg-[rgb(var(--card-bg))] border-2 border-[rgb(var(--border))] focus-within:shadow-brutal-sm dark:focus-within:shadow-brutal-sm-dark transition-shadow"
                    >
                        <textarea
                            ref={inputRef}
                            rows={1}
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); run("ask"); }
                            }}
                            maxLength={500}
                            disabled={disabled}
                            placeholder="Ask about your habits…"
                            aria-label="Message the coach"
                            className="flex-1 min-w-0 resize-none bg-transparent py-1.5 text-base md:text-sm leading-snug outline-none placeholder:text-[rgb(var(--ink-muted))]"
                        />
                        <button
                            type="submit" aria-label="Send" disabled={loading || disabled || !question.trim()}
                            className="w-9 h-9 flex-shrink-0 flex items-center justify-center bg-brand-500 hover:bg-brand-600 text-white border-2 border-ink disabled:opacity-40 transition-colors"
                        >
                            <ArrowUp size={16} strokeWidth={3} />
                        </button>
                    </form>
                    <p className="mt-1.5 text-[10px] text-[rgb(var(--ink-muted))] text-center">Based on your haGIT data and the habit library. It can be wrong.</p>
                </div>
            </div>

            {/* Desktop launcher; phones use the tab bar. */}
            <button
                onClick={() => setCoachOpen(!open)}
                aria-label={open ? "Close coach" : "Open coach"} aria-expanded={open}
                className="btn-press hidden md:flex fixed z-40 bottom-6 right-6 w-14 h-14 items-center justify-center bg-brand-500 hover:bg-brand-600 text-white border-2 border-ink shadow-brutal dark:shadow-brutal-dark"
            >
                <span className={cn("transition-transform duration-300", open && "rotate-90")}>
                    {open ? <X size={22} strokeWidth={2.5} /> : <Bot size={24} strokeWidth={2.25} />}
                </span>
            </button>
        </>
    );
}

function CoachAvatar({ className, big }: { className?: string; big?: boolean }) {
    return (
        <span className={cn("flex-shrink-0 flex items-center justify-center bg-brand-500 text-white border-2 border-ink rounded-full", big && "shadow-brutal-sm dark:shadow-brutal-sm-dark", className)}>
            <Bot size={big ? 26 : 16} strokeWidth={2.25} />
        </span>
    );
}

function UserBubble({ text }: { text: string }) {
    return (
        <div className="flex justify-end animate-fade-in">
            <p className="max-w-[85%] px-3.5 py-2 text-sm font-medium whitespace-pre-line break-words bg-brand-500 text-white border-2 border-ink">
                {text}
            </p>
        </div>
    );
}

function CoachMessage({ message }: { message: Message }) {
    const [copied, setCopied] = useState(false);
    const sources = useMemo(() => message.sources ?? [], [message.sources]);
    const blocks = useMemo(() => parseReply(message.text), [message.text]);
    const order = useMemo(() => citationOrder(message.text, new Set(sources.map((s) => s.articleId))), [message.text, sources]);
    const cited = sources.filter((s) => order.has(s.articleId)).sort((a, b) => order.get(a.articleId)! - order.get(b.articleId)!);
    const looked = lookedAt(message.tools);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(message.text.replace(/\s*\[KB\d+\]/g, ""));
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch { /* clipboard unavailable */ }
    };

    const renderText = (text: string) => (
        <>
            {splitCitations(text, order).map((part, i) => {
                if (part.kind === "text") return <span key={i}>{part.text}</span>;
                const source = sources.find((s) => s.articleId === part.articleId)!;
                return (
                    <a
                        key={i} href={`/kb/${source.slug}`} target="_blank" rel="noopener" title={source.title}
                        aria-label={`Source ${part.n}: ${source.title}`}
                        className="relative -top-[0.45em] ml-0.5 inline-flex items-center justify-center min-w-[15px] h-[15px] px-[3px] rounded-full text-[9px] font-black font-mono leading-none bg-[rgb(var(--paper-alt))] text-[rgb(var(--ink-muted))] hover:bg-brand-500 hover:text-white no-underline transition-colors"
                    >
                        {part.n}
                    </a>
                );
            })}
        </>
    );

    let tone: SectionTone = "other";
    return (
        <div className="group flex items-start gap-2 animate-fade-in">
            <CoachAvatar className="w-7 h-7 mt-0.5" />
            <div className="min-w-0 flex-1 space-y-1.5">
                {message.note && (
                    <p className="text-[10px] font-black uppercase tracking-widest text-[rgb(var(--ink-muted))]">{message.note}</p>
                )}
                <div className="relative px-3.5 py-3 bg-[rgb(var(--card-bg))] border-2 border-[rgb(var(--border))] text-sm leading-relaxed space-y-2.5">
                    {blocks.map((b, i) => {
                        if (b.kind === "heading") {
                            tone = b.tone;
                            const { icon: Icon, color } = TONES[b.tone];
                            return (
                                <p key={i} className={cn("flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider", i > 0 && "pt-1")} style={{ color: `rgb(${color})` }}>
                                    <Icon size={13} strokeWidth={2.5} /> {b.title}
                                </p>
                            );
                        }
                        const dot = `rgb(${TONES[tone].color})`;
                        if (b.kind === "bullets") {
                            return (
                                <ul key={i} className="space-y-1.5">
                                    {b.items.map((item, j) => (
                                        <li key={j} className="flex gap-2.5">
                                            <span className="mt-[0.55em] w-1.5 h-1.5 flex-shrink-0 rounded-full" style={{ background: dot }} />
                                            <span className="min-w-0">{renderText(item)}</span>
                                        </li>
                                    ))}
                                </ul>
                            );
                        }
                        if (b.kind === "steps") {
                            return (
                                <ol key={i} className="space-y-2">
                                    {b.items.map((item, j) => (
                                        <li key={j} className="flex gap-2.5">
                                            <span className="mt-px w-5 h-5 flex-shrink-0 flex items-center justify-center rounded-full text-[10px] font-black text-white" style={{ background: dot }}>{j + 1}</span>
                                            <span className="min-w-0">{renderText(item)}</span>
                                        </li>
                                    ))}
                                </ol>
                            );
                        }
                        return <p key={i}>{renderText(b.text)}</p>;
                    })}
                    <button
                        onClick={copy} aria-label="Copy answer"
                        className="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 text-[rgb(var(--ink-muted))] hover:text-[rgb(var(--ink))] transition-opacity"
                    >
                        {copied ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                </div>

                {cited.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-bold text-[rgb(var(--ink-muted))]">Sources</span>
                        {cited.map((s) => (
                            <a
                                key={s.articleId} href={`/kb/${s.slug}`} target="_blank" rel="noopener" title={s.title}
                                className="inline-flex items-center gap-1 max-w-[14rem] h-6 pl-1 pr-2 text-[11px] font-bold bg-[rgb(var(--paper-alt))] hover:bg-brand-100 dark:hover:bg-brand-900 rounded-full transition-colors"
                            >
                                <span className="w-4 h-4 flex-shrink-0 flex items-center justify-center rounded-full bg-[rgb(var(--card-bg))] text-[9px] font-black font-mono">{order.get(s.articleId)}</span>
                                <span className="truncate">{s.title}</span>
                            </a>
                        ))}
                    </div>
                )}
                {looked && (
                    <p className="flex items-center gap-1.5 text-[11px] text-[rgb(var(--ink-muted))]">
                        <Search size={11} /> Checked {looked}
                    </p>
                )}
            </div>
        </div>
    );
}
