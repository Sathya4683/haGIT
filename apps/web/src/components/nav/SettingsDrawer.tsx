"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { usePrefsStore } from "@/store/prefsStore";
import { accountApi } from "@/lib/api";
import { getUserTimezone } from "@/lib/datetime";
import { LogOut, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Section } from "@/components/settings/Section";
import { AppearanceSection } from "@/components/settings/AppearanceSection";
import { TokenSection } from "@/components/settings/TokenSection";

interface Props { open: boolean; onClose: () => void; }

export function SettingsDrawer({ open, onClose }: Props) {
    const { user, logout } = useAuthStore();
    const prefs = usePrefsStore((s) => s.prefs);
    const router = useRouter();
    const [showDeleteAccount, setShowDeleteAccount] = useState(false);
    const [deletingAccount, setDeletingAccount] = useState(false);

    useEffect(() => {
        if (!open) return;
        const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [open, onClose]);

    const handleLogout = async () => { await logout(); router.push("/auth/login"); };

    const handleDeleteAccount = async () => {
        setDeletingAccount(true);
        try {
            await accountApi.delete();
            await logout();
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
                aria-label="Settings"
                aria-hidden={!open}
                className={cn(
                    "fixed top-0 right-0 z-50 h-full w-[22rem] max-w-[92vw] flex flex-col bg-[rgb(var(--paper))] border-l-2 border-[rgb(var(--border))] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
                    open ? "translate-x-0 shadow-[-6px_0_0_rgb(var(--border))]" : "translate-x-full"
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 h-12 border-b-2 border-[rgb(var(--border))] flex-shrink-0">
                    <span className="text-xs font-black uppercase tracking-widest">Settings</span>
                    <button
                        onClick={onClose} aria-label="Close settings"
                        className="w-7 h-7 flex items-center justify-center border-2 border-[rgb(var(--border))] hover:bg-[rgb(var(--paper-alt))] transition-colors"
                    >
                        <X size={13} strokeWidth={2.5} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-thin p-5 space-y-8">
                    <Section title="Account">
                        <div className="space-y-1">
                            <p className="text-sm font-mono font-medium break-all">{user?.email || "—"}</p>
                            <p className="text-[11px] text-[rgb(var(--ink-muted))]">
                                Timezone <span className="font-mono">{prefs?.timezone ?? getUserTimezone()}</span> · follows this device
                            </p>
                        </div>
                    </Section>

                    <AppearanceSection />

                    <TokenSection />
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
