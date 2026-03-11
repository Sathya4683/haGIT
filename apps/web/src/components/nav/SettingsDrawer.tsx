"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { accountApi } from "@/lib/api";
import { Copy, Check, LogOut, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface Props { open: boolean; onClose: () => void; }

export function SettingsDrawer({ open, onClose }: Props) {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  const copyToken = () => {
    if (user?.token) {
      navigator.clipboard.writeText(user.token);
      setCopied(true);
      toast.success("Token copied");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLogout = () => { logout(); router.push("/auth/login"); };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      await accountApi.delete();
      logout();
      toast.success("Account deleted.");
      router.push("/auth/signup");
    } catch {
      toast.error("Failed to delete account.");
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      )}

      <aside
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-80 max-w-[90vw] flex flex-col bg-[rgb(var(--paper))] border-l-2 border-[rgb(var(--border))] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
          open ? "translate-x-0 shadow-[-6px_0_0_rgb(var(--border))]" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 h-12 border-b-2 border-[rgb(var(--border))] flex-shrink-0">
          <span className="text-xs font-black uppercase tracking-widest">Settings</span>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center border-2 border-[rgb(var(--border))] hover:bg-[rgb(var(--paper-alt))] transition-colors"
          >
            <X size={13} strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-5 space-y-7">
          {/* Account */}
          <section className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-[rgb(var(--ink-muted))]">
              Account
            </p>
            <p className="text-sm font-mono font-medium break-all">{user?.email || "—"}</p>
          </section>

          {/* CLI Token */}
          <section className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-[rgb(var(--ink-muted))]">
              CLI Token
            </p>
            <div className="card-flat p-3 space-y-2">
              <div className="flex items-center gap-2">
                <code className="text-[11px] font-mono truncate flex-1 select-all text-[rgb(var(--ink-muted))]">
                  {user?.token || "—"}
                </code>
                <button
                  onClick={copyToken}
                  className="btn-press-sm flex-shrink-0 w-7 h-7 flex items-center justify-center border-2 border-[rgb(var(--border))] hover:bg-[rgb(var(--paper-alt))] transition-all"
                  title="Copy token"
                >
                  {copied ? <Check size={11} className="text-brand-500" /> : <Copy size={11} />}
                </button>
              </div>
              <div className="border-t-2 border-dashed border-[rgb(var(--border))] pt-2">
                <code className="text-[10px] font-mono text-[rgb(var(--ink-muted))]">
                  hagit login -t &lt;your-token&gt;
                </code>
              </div>
            </div>
          </section>
        </div>

        {/* Footer actions */}
        <div className="flex-shrink-0 border-t-2 border-[rgb(var(--border))] p-4 space-y-2">
          <button
            onClick={handleLogout}
            className="btn-press-sm w-full flex items-center justify-center gap-2 py-2.5 font-bold text-sm border-2 border-[rgb(var(--border))] hover:bg-[rgb(var(--paper-alt))] transition-all"
          >
            <LogOut size={13} />
            Sign out
          </button>
          <button
            onClick={() => setShowDeleteAccount(true)}
            className="btn-press-sm w-full flex items-center justify-center gap-2 py-2.5 font-bold text-sm text-red-600 dark:text-red-400 border-2 border-red-300 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
          >
            <Trash2 size={13} />
            Delete account
          </button>
        </div>
      </aside>

      {showDeleteAccount && (
        <ConfirmDialog
          title="Delete your account?"
          description="This permanently deletes your account, all habits, and all commits. There is no undo."
          confirmLabel="Delete account"
          confirmClassName="bg-red-600 hover:bg-red-700 border-2 border-ink shadow-brutal"
          loading={deletingAccount}
          onConfirm={handleDeleteAccount}
          onCancel={() => setShowDeleteAccount(false)}
        />
      )}
    </>
  );
}
