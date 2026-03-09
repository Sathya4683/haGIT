"use client";
import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import type { Commit } from "@/types";
import { commitsApi } from "@/lib/api";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { X, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Props { date: string; commits: Commit[]; loading: boolean; onClose: () => void; onDeleted?: (id: string) => void; }

export function DayCommitsPanel({ date, commits, loading, onClose, onDeleted }: Props) {
  const dateObj = new Date(date + "T00:00:00");
  const [pendingDelete, setPendingDelete] = useState<Commit | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await commitsApi.delete(pendingDelete.id);
      toast.success("Commit deleted.");
      onDeleted?.(pendingDelete.id);
      setPendingDelete(null);
    } catch { toast.error("Failed to delete commit."); }
    finally { setDeleting(false); }
  };

  return (
    <>
      <div className="card-flat animate-slide-up mt-4">
        <div className="flex items-center justify-between px-4 py-2.5 border-b-2 border-[rgb(var(--border))]">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-black">{format(dateObj, "MMMM d, yyyy")}</span>
            <span className="text-[11px] text-[rgb(var(--ink-muted))] font-mono">
              {loading ? "…" : `${commits.length} commit${commits.length !== 1 ? "s" : ""}`}
            </span>
          </div>
          <button onClick={onClose}
            className="w-6 h-6 flex items-center justify-center border border-[rgb(var(--border))] hover:bg-[rgb(var(--paper-alt))] transition-colors">
            <X size={11} strokeWidth={2.5} />
          </button>
        </div>

        <div className="max-h-52 overflow-y-auto scrollbar-thin">
          {loading ? (
            <div className="p-4 space-y-2">
              {[...Array(2)].map((_, i) => <div key={i} className="h-10 shimmer-bg" />)}
            </div>
          ) : commits.length === 0 ? (
            <p className="text-center py-5 text-sm text-[rgb(var(--ink-muted))]">No commits on this day.</p>
          ) : (
            <div>
              {commits.map((c) => (
                <div key={c.id} className="group flex items-start gap-3 px-4 py-2.5 border-b border-dashed border-[rgb(var(--border))] hover:bg-[rgb(var(--paper-alt))] transition-colors">
                  <div className="w-2 h-2 border-2 border-brand-500 bg-brand-500 flex-shrink-0 mt-[5px]" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{c.message}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-bold text-[rgb(var(--ink-muted))] border border-[rgb(var(--border))] px-1.5 py-px">{c.habitName}</span>
                      <span className="text-[10px] text-[rgb(var(--ink-muted))]">{formatDistanceToNow(new Date(c.timestamp), { addSuffix: true })}</span>
                    </div>
                  </div>
                  {onDeleted && (
                    <button onClick={() => setPendingDelete(c)}
                      className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center border border-[rgb(var(--border))] hover:border-red-500 hover:text-red-500 transition-all flex-shrink-0 mt-0.5">
                      <Trash2 size={9} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {pendingDelete && (
        <ConfirmDialog
          title="Delete this commit?"
          description={`"${pendingDelete.message}" will be permanently removed.`}
          confirmLabel="Delete"
          loading={deleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </>
  );
}
