"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, LogOut, Palette, Trash2, User, X } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { usePrefsStore } from "@/store/prefsStore";
import { useUiStore, type SettingsTab } from "@/store/uiStore";
import { accountApi } from "@/lib/api";
import { getUserTimezone } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import { Avatar, displayName } from "@/components/ui/Avatar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { AppearanceSection } from "@/components/settings/AppearanceSection";
import { TokenSection } from "@/components/settings/TokenSection";
import { ConnectSection } from "@/components/settings/ConnectSection";
import { NotificationsSection } from "@/components/settings/NotificationsSection";
import { ReportSection } from "@/components/settings/ReportSection";

const TABS: { id: SettingsTab; label: string; icon: typeof Palette }[] = [
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "reminders", label: "Reminders", icon: Bell },
    { id: "account", label: "Account", icon: User },
];

/** Settings: a right-hand drawer on desktop, a full-height sheet above the tab bar on phones. */
export function SettingsDrawer() {
    const { settingsOpen: open, settingsTab: tab, setSettingsOpen, setSettingsTab } = useUiStore();
    const { user, logout } = useAuthStore();
    const prefs = usePrefsStore((s) => s.prefs);
    const router = useRouter();
    const [showDeleteAccount, setShowDeleteAccount] = useState(false);
    const [deletingAccount, setDeletingAccount] = useState(false);
    const close = () => setSettingsOpen(false);

    useEffect(() => {
        if (!open) return;
        const h = (e: KeyboardEvent) => { if (e.key === "Escape") setSettingsOpen(false); };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [open, setSettingsOpen]);

    const handleLogout = async () => {
        await logout();
        close();
        router.push("/auth/login");
    };

    const handleDeleteAccount = async () => {
        setDeletingAccount(true);
        try {
            await accountApi.delete();
            await logout();
            toast.success("Account deleted.");
            close();
            router.push("/auth/signup");
        } catch {
            toast.error("Failed to delete account.");
        } finally {
            setDeletingAccount(false);
        }
    };

    return (
        <>
            <div
                className={cn("fixed inset-0 z-40 bg-black/30 transition-opacity hidden md:block", open ? "opacity-100" : "opacity-0 pointer-events-none")}
                onClick={close}
                aria-hidden
            />

            <aside
                aria-label="Settings"
                aria-hidden={!open}
                className={cn(
                    "fixed z-50 flex flex-col bg-[rgb(var(--paper))] transition-[transform,visibility] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
                    // Phones: full width above the bottom tab bar. Desktop: right drawer.
                    "inset-x-0 top-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] md:bottom-0 md:left-auto md:w-[26rem] md:border-l-2 md:border-[rgb(var(--border))]",
                    open ? "visible translate-y-0 md:translate-x-0 md:shadow-[-6px_0_0_rgb(var(--border))]" : "invisible translate-y-[110%] md:translate-y-0 md:translate-x-full",
                )}
            >
                {/* Profile header */}
                <div className="relative flex-shrink-0 bg-ink text-white px-5 pt-5 pb-4 overflow-hidden">
                    <div className="absolute inset-0 dot-grid opacity-20 pointer-events-none" aria-hidden />
                    <div className="relative flex items-center gap-3">
                        <Avatar email={user?.email} className="w-12 h-12 text-sm border-white" />
                        <div className="min-w-0 flex-1">
                            <p className="font-black text-lg leading-tight truncate">{displayName(user?.email)}</p>
                            <p className="text-xs font-mono text-white/60 truncate">{user?.email ?? "—"}</p>
                        </div>
                        <button onClick={close} aria-label="Close settings" className="self-start w-8 h-8 flex items-center justify-center border-2 border-white/30 hover:bg-white/10">
                            <X size={14} strokeWidth={2.5} />
                        </button>
                    </div>
                    <p className="relative mt-3 font-mono text-[11px] text-white/50">
                        tz <span className="text-white/80">{prefs?.timezone ?? getUserTimezone()}</span> · follows this device
                    </p>
                </div>

                {/* Tabs */}
                <div className="flex-shrink-0 grid grid-cols-3 border-b-2 border-[rgb(var(--border))]" role="tablist" aria-label="Settings sections">
                    {TABS.map(({ id, label, icon: Icon }) => {
                        const active = tab === id;
                        return (
                            <button
                                key={id} role="tab" aria-selected={active} aria-controls={`settings-${id}`} id={`settings-tab-${id}`}
                                onClick={() => setSettingsTab(id)}
                                className={cn(
                                    "relative flex items-center justify-center gap-1.5 h-11 text-xs font-bold transition-colors",
                                    active ? "text-[rgb(var(--ink))] bg-[rgb(var(--card-bg))]" : "text-[rgb(var(--ink-muted))] hover:text-[rgb(var(--ink))]",
                                )}
                            >
                                <Icon size={13} strokeWidth={active ? 2.75 : 2} /> {label}
                                {active && <span className="absolute bottom-[-2px] inset-x-3 h-[3px] bg-brand-500" />}
                            </button>
                        );
                    })}
                </div>

                <div
                    key={tab}
                    id={`settings-${tab}`} role="tabpanel" aria-labelledby={`settings-tab-${tab}`}
                    className="flex-1 overflow-y-auto scrollbar-thin p-5 space-y-8 animate-fade-in"
                >
                    {tab === "appearance" && <AppearanceSection />}

                    {tab === "reminders" && (
                        <>
                            <NotificationsSection />
                            <ReportSection />
                        </>
                    )}

                    {tab === "account" && (
                        <>
                            <TokenSection />
                            <ConnectSection />
                            <section className="space-y-2">
                                <button
                                    onClick={handleLogout}
                                    className="btn-press-sm w-full flex items-center justify-center gap-2 py-2.5 font-bold text-sm border-2 border-[rgb(var(--border))] hover:bg-[rgb(var(--paper-alt))]"
                                >
                                    <LogOut size={14} /> Sign out
                                </button>
                            </section>
                            <section className="border-2 border-dashed border-red-300 dark:border-red-900 p-4 space-y-2">
                                <h3 className="text-sm font-black text-red-600 dark:text-red-400">Danger zone</h3>
                                <p className="text-xs text-[rgb(var(--ink-muted))]">Deleting your account removes every habit and commit. There is no undo.</p>
                                <button
                                    onClick={() => setShowDeleteAccount(true)}
                                    className="btn-press-sm flex items-center gap-2 px-3 py-2 font-bold text-xs text-red-600 dark:text-red-400 border-2 border-red-300 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                    <Trash2 size={13} /> Delete account
                                </button>
                            </section>
                        </>
                    )}
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
