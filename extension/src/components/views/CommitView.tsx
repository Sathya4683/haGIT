import { useState, useRef, useEffect } from "react";
import { useHabitsStore } from "@/stores/habitsStore";
import { useCommitsStore } from "@/stores/commitsStore";
import { GitCommitHorizontal, ChevronDown, Check } from "lucide-react";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

export function CommitView() {
  const { habits, selectedHabit, select } = useHabitsStore();
  const { push, pushing } = useCommitsStore();
  const [message, setMessage] = useState("");
  const [dropOpen, setDropOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropOpen(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleSubmit = async () => {
    if (!selectedHabit || !message.trim() || pushing) return;
    try {
      await push(selectedHabit.name, message.trim());
      toast.success("Commit pushed.");
      setMessage("");
      textareaRef.current?.focus();
    } catch {
      toast.error("Failed to push commit.");
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleSubmit();
  };

  if (habits.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
        <div className="w-10 h-10 border-2 border-[rgb(var(--border))] flex items-center justify-center mb-4 shadow-brutal-sm">
          <GitCommitHorizontal size={18} strokeWidth={2.5} className="text-[rgb(var(--ink-muted))]" />
        </div>
        <p className="font-black text-sm">No habits yet.</p>
        <p className="text-xs text-[rgb(var(--ink-muted))] mt-1">
          Create a habit in the Habits tab first.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0 animate-fade-in">

      {/* Habit selector - compact in-view version for quick switching */}
      <div className="border-b-2 border-[rgb(var(--border))] bg-[rgb(var(--card-bg))] p-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-[rgb(var(--ink-muted))] mb-2">Habit</p>
        <div ref={dropRef} className="relative">
          <button
            onClick={() => setDropOpen(!dropOpen)}
            className={cn(
              "w-full flex items-center justify-between gap-2 px-3 py-2",
              "border-2 border-[rgb(var(--border))] text-sm font-bold",
              "hover:bg-[rgb(var(--paper-alt))] transition-colors text-left",
              dropOpen && "bg-[rgb(var(--paper-alt))]"
            )}
          >
            <span className="truncate">{selectedHabit?.name ?? "Choose habit"}</span>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {selectedHabit && (
                <span className="font-mono text-[10px] text-[rgb(var(--ink-muted))]">
                  {selectedHabit.commitCount}
                </span>
              )}
              <ChevronDown size={12} strokeWidth={2.5} className={cn("transition-transform", dropOpen && "rotate-180")} />
            </div>
          </button>

          {dropOpen && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-[rgb(var(--card-bg))] border-2 border-[rgb(var(--border))] shadow-brutal z-40 max-h-36 overflow-y-auto scrollbar-thin animate-fade-in">
              {habits.map((h) => (
                <button
                  key={h.id}
                  onClick={() => { select(h); setDropOpen(false); }}
                  className={cn(
                    "w-full text-left flex items-center justify-between gap-2 px-3 py-2 text-xs font-bold",
                    "hover:bg-[rgb(var(--paper-alt))] transition-colors border-b border-[rgb(var(--paper-alt))] last:border-0",
                    selectedHabit?.id === h.id && "text-brand-700"
                  )}
                >
                  <span className="truncate">{h.name}</span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="font-mono text-[10px] text-[rgb(var(--ink-muted))]">{h.commitCount}</span>
                    {selectedHabit?.id === h.id && <Check size={10} className="text-brand-500" />}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Message input */}
      <div className="border-b-2 border-[rgb(var(--border))] p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-[rgb(var(--ink-muted))]">Message</p>
          <span className="text-[9px] font-mono text-[rgb(var(--ink-muted))] opacity-60">⌘↵ to push</span>
        </div>
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Describe what you did..."
          rows={4}
          className="input-brutal w-full px-3 py-2.5 text-sm resize-none leading-relaxed font-sans"
        />
      </div>

      {/* Submit */}
      <div className="p-3">
        <button
          onClick={handleSubmit}
          disabled={pushing || !message.trim() || !selectedHabit}
          className={cn(
            "btn-press w-full flex items-center justify-center gap-2 py-2.5",
            "text-sm font-black uppercase tracking-wide",
            "bg-brand-500 hover:bg-brand-600 text-white",
            "border-2 border-[rgb(var(--border))] shadow-brutal",
            "transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {pushing ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Pushing
            </>
          ) : (
            <>
              <GitCommitHorizontal size={14} strokeWidth={2.5} />
              Push Commit
            </>
          )}
        </button>
      </div>

      {/* Char count / hint */}
      {message.length > 0 && (
        <div className="px-3 pb-2 animate-fade-in">
          <div className="border-t border-dashed border-[rgb(var(--border))] pt-2">
            <p className="text-[10px] font-mono text-[rgb(var(--ink-muted))]">
              <span className="font-black text-[rgb(var(--ink))]">{selectedHabit?.name ?? "—"}</span>
              {" · "}
              {message.length} chars
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
