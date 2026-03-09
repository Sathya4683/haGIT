"use client";
import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import type { Commit } from "@/types";
import { commitsApi } from "@/lib/api";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Props { commits: Commit[]; loading?: boolean; title?: string; onDeleted?: (id: string) => void; }

export function CommitList({ commits, loading, title = "Recent commits", onDeleted }: Props) {
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

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-3 w-28 shimmer-bg" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="border-b-2 border-dashed border-[rgb(var(--border))] pb-3 space-y-1.5" style={{ opacity: 1 - i * 0.15 }}>
            <div className="h-3 shimmer-bg" style={{ width: `${65 + i * 5}%` }} />
            <div className="h-2.5 shimmer-bg w-36" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-[rgb(var(--ink-muted))] mb-4">
          {title}
        </p>

        {commits.length === 0 ? (
          <div className="card-flat p-6 text-center">
            <p className="text-sm text-[rgb(var(--ink-muted))] font-medium">No commits yet.</p>
            <p className="text-xs text-[rgb(var(--ink-muted))] mt-1 opacity-60">Push your first commit to get started.</p>
          </div>
        ) : (
          <div className="space-y-0">
            {commits.map((commit, i) => (
              <div
                key={commit.id}
                className="group flex items-start gap-3 py-3 border-b border-dashed border-[rgb(var(--border))] animate-fade-in"
                style={{ animationDelay: `${i * 20}ms` }}
              >
                {/* Dot */}
                <div className="w-2 h-2 border-2 border-brand-500 bg-brand-500 flex-shrink-0 mt-[5px]" />

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-sm font-medium leading-snug">{commit.message}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold text-[rgb(var(--ink-muted))] border border-[rgb(var(--border))] px-1.5 py-px">
                      {commit.habitName}
                    </span>
                    <span className="text-[11px] text-[rgb(var(--ink-muted))]">
                      {formatDistanceToNow(new Date(commit.timestamp), { addSuffix: true })}
                    </span>
                  </div>
                </div>

                <div className="flex-shrink-0 flex items-center gap-1.5 pt-0.5">
                  <span className="text-[11px] font-mono text-[rgb(var(--ink-muted))]">
                    {format(new Date(commit.timestamp), "MMM d")}
                  </span>
                  {onDeleted && (
                    <button
                      onClick={() => setPendingDelete(commit)}
                      className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center border border-[rgb(var(--border))] hover:border-red-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all"
                      title="Delete"
                    >
                      <Trash2 size={10} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
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
