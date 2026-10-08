"use client";
import { useEffect, useRef, useState } from "react";
import { Bot, Send, X } from "lucide-react";
import { toast } from "sonner";
import { coachApi } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";
import type { CoachResponse } from "@/types";

// Floating habit-coach chat. Each question is answered on its own (the API
// keeps no chat history); reviews follow up on the last saved review. Runs
// happen only on demand because each one spends shared free-tier Gemini quota.
const STORAGE_KEY = "hagit_coach_last";

interface SavedReview extends CoachResponse { createdAt: string; }

interface Message {
    id: number;
    role: "user" | "coach";
    text: string;
    tools?: string[];
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

export function CoachChat() {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [lastReview, setLastReview] = useState<SavedReview | null>(null);
    const [question, setQuestion] = useState("");
    const [loading, setLoading] = useState(false);
    const [disabled, setDisabled] = useState(false);
    const nextId = useRef(0);
    const endRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const saved = loadSavedReview();
        setLastReview(saved);
        if (saved) {
            setMessages([{
                id: nextId.current++, role: "coach", text: saved.reply, tools: toolNames(saved),
                note: `Last review · ${new Date(saved.createdAt).toLocaleDateString()}`,
            }]);
        }
    }, []);

    useEffect(() => { if (open) endRef.current?.scrollIntoView({ block: "end" }); }, [open, messages, loading]);
    useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open]);

    const push = (m: Omit<Message, "id">) => setMessages((prev) => [...prev, { ...m, id: nextId.current++ }]);

    const run = async (mode: "review" | "ask") => {
        const q = question.trim();
        if (loading || (mode === "ask" && !q)) return;
        push({ role: "user", text: mode === "review" ? "Weekly review, please." : q });
        if (mode === "ask") setQuestion("");
        setLoading(true);
        try {
            const response = mode === "review"
                ? await coachApi.run({ mode, previousReview: lastReview?.reply })
                : await coachApi.run({ mode, question: q });
            push({ role: "coach", text: response.reply, tools: toolNames(response) });
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

    return (
        <>
            {open && (
                <div
                    role="dialog" aria-label="haGIT Coach"
                    className="fixed z-40 bottom-24 right-4 sm:right-6 w-[calc(100vw_-_2rem)] sm:w-96 h-[min(34rem,calc(100vh_-_8rem))] flex flex-col bg-[rgb(var(--paper))] border-2 border-[rgb(var(--border))] shadow-brutal-lg dark:shadow-brutal-dark animate-bounce-in"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between gap-3 px-4 py-3 border-b-2 border-[rgb(var(--border))]">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 flex items-center justify-center bg-brand-500 text-white border-2 border-ink">
                                <Bot size={16} strokeWidth={2.5} />
                            </div>
                            <div>
                                <p className="text-sm font-black leading-tight">haGIT Coach</p>
                                <p className="text-[10px] font-bold text-[rgb(var(--ink-muted))]">Powered by Google Gemini</p>
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
                            </p>
                        )}
                        {messages.map((m) => m.role === "user" ? (
                            <div key={m.id} className="flex justify-end animate-fade-in">
                                <p className="max-w-[85%] px-3 py-2 text-sm font-medium whitespace-pre-line bg-brand-500 text-white border-2 border-ink">
                                    {m.text}
                                </p>
                            </div>
                        ) : (
                            <div key={m.id} className="max-w-[92%] space-y-1.5 animate-fade-in">
                                {m.note && (
                                    <p className="text-[10px] font-black uppercase tracking-widest text-[rgb(var(--ink-muted))]">{m.note}</p>
                                )}
                                <p className="px-3 py-2 text-sm leading-relaxed whitespace-pre-line bg-[rgb(var(--card-bg))] border-2 border-[rgb(var(--border))]">
                                    {m.text}
                                </p>
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
                                Looking at your habits...
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
                        <p className="text-[10px] text-[rgb(var(--ink-muted))]">Answers come from your haGIT data and can be wrong.</p>
                    </div>
                </div>
            )}

            <button
                onClick={() => setOpen((o) => !o)}
                aria-label={open ? "Close coach" : "Open coach"} aria-expanded={open}
                className="btn-press fixed z-40 bottom-6 right-4 sm:right-6 w-14 h-14 flex items-center justify-center bg-brand-500 hover:bg-brand-600 text-white border-2 border-ink shadow-brutal dark:shadow-brutal-dark transition-all"
            >
                {open ? <X size={22} strokeWidth={2.5} /> : <Bot size={22} strokeWidth={2.5} />}
            </button>
        </>
    );
}
