"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { ROLES, type Role } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { initialsOf } from "@/components/ui/Avatar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState, RoleBadge } from "./ui";

interface Row {
    id: number;
    email: string;
    role: Role;
    createdAt: string;
    habits: number;
    commits: number;
    signIn: string;
}

interface Props {
    users: Row[];
    currentUserId: number;
    canManage: boolean;
}

const AVATAR_TINTS = ["--series-1", "--series-2", "--series-3", "--series-4", "--series-5", "--series-7"];

function UserAvatar({ user }: { user: Row }) {
    const tint = AVATAR_TINTS[user.id % AVATAR_TINTS.length];
    return (
        <span className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full text-[11px] font-black font-mono" style={{ background: `rgb(var(${tint}) / 0.16)`, color: `rgb(var(${tint}))` }}>
            {initialsOf(user.email)}
        </span>
    );
}

export function UsersTable({ users, currentUserId, canManage }: Props) {
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [pending, setPending] = useState<{ user: Row; role: Role } | null>(null);
    const [saving, setSaving] = useState(false);

    const shown = useMemo(() => {
        const q = query.trim().toLowerCase();
        return q ? users.filter((u) => u.email.includes(q) || u.role.toLowerCase().includes(q)) : users;
    }, [users, query]);

    const changeRole = async () => {
        if (!pending) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/admin/users/${pending.user.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role: pending.role }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error ?? "Failed to change role.");
            toast.success(`${pending.user.email} is now ${pending.role}.`);
            setPending(null);
            router.refresh();
        } catch (e) {
            toast.error((e as Error).message);
        } finally {
            setSaving(false);
        }
    };

    const roleControl = (u: Row) =>
        canManage && u.id !== currentUserId ? (
            <select
                value={u.role}
                onChange={(e) => e.target.value !== u.role && setPending({ user: u, role: e.target.value as Role })}
                className="input-brutal h-8 px-2 text-xs font-bold"
                aria-label={`Role for ${u.email}`}
            >
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
        ) : (
            <RoleBadge role={u.role} />
        );

    const signIn = (u: Row) => (
        <span className="inline-flex items-center gap-1 text-[11px] text-[rgb(var(--ink-muted))]">
            {u.signIn.includes("oauth") ? <ShieldCheck size={12} /> : <KeyRound size={12} />} {u.signIn}
        </span>
    );

    return (
        <div className="space-y-4">
            <label className="relative block sm:w-72">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--ink-muted))]" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by email or role" aria-label="Search users" className="input-brutal w-full h-9 pl-9 pr-3 text-sm" />
            </label>

            {shown.length === 0 ? <EmptyState>No users match.</EmptyState> : (
                <>
                    {/* Phones: cards */}
                    <ul className="md:hidden space-y-3">
                        {shown.map((u) => (
                            <li key={u.id} className="card p-4">
                                <div className="flex items-center gap-3">
                                    <UserAvatar user={u} />
                                    <div className="min-w-0 flex-1">
                                        <p className="font-mono text-sm font-bold truncate">{u.email}{u.id === currentUserId && <span className="font-sans font-normal text-[rgb(var(--ink-muted))]"> (you)</span>}</p>
                                        {signIn(u)}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between mt-3 pt-3 border-t-2 border-dashed border-[rgb(var(--border))]/25">
                                    {roleControl(u)}
                                    <p className="text-xs text-[rgb(var(--ink-muted))]"><b className="font-mono text-[rgb(var(--ink))]">{u.habits}</b> habits · <b className="font-mono text-[rgb(var(--ink))]">{u.commits}</b> commits</p>
                                </div>
                            </li>
                        ))}
                    </ul>

                    {/* Desktop: table */}
                    <div className="hidden md:block card overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b-2 border-[rgb(var(--border))] text-left text-[10px] font-black uppercase tracking-widest text-[rgb(var(--ink-muted))]">
                                    <th className="px-4 py-3">User</th>
                                    <th className="px-4 py-3">Role</th>
                                    <th className="px-4 py-3 text-right">Habits</th>
                                    <th className="px-4 py-3 text-right">Commits</th>
                                    <th className="px-4 py-3 text-right">Joined</th>
                                </tr>
                            </thead>
                            <tbody>
                                {shown.map((u) => (
                                    <tr key={u.id} className={cn("border-b border-dashed border-[rgb(var(--border))]/30 last:border-0 hover:bg-[rgb(var(--paper-alt))]", u.id === currentUserId && "bg-brand-50/50 dark:bg-brand-950/20")}>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <UserAvatar user={u} />
                                                <div className="min-w-0">
                                                    <p className="font-mono text-xs font-bold truncate max-w-[18rem]">
                                                        {u.email}{u.id === currentUserId && <span className="font-sans font-normal text-[rgb(var(--ink-muted))]"> (you)</span>}
                                                    </p>
                                                    {signIn(u)}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">{roleControl(u)}</td>
                                        <td className="px-4 py-3 text-right font-mono tabular-nums">{u.habits}</td>
                                        <td className="px-4 py-3 text-right font-mono tabular-nums">{u.commits}</td>
                                        <td className="px-4 py-3 text-right text-xs whitespace-nowrap text-[rgb(var(--ink-muted))]">{new Date(u.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {pending && (
                <ConfirmDialog
                    title={`Make ${pending.user.email} ${pending.role === "USER" ? "a" : "an"} ${pending.role}?`}
                    description={
                        pending.role === "ADMIN" ? "Admins can manage users and roles, run jobs and read the audit log."
                            : pending.role === "EDITOR" ? "Editors can write, publish and re-index knowledge-base articles."
                                : "This removes their access to the admin console."
                    }
                    confirmLabel="Change role"
                    confirmClassName="bg-brand-500 hover:bg-brand-600 border-2 border-ink shadow-brutal"
                    loading={saving}
                    onConfirm={changeRole}
                    onCancel={() => setPending(null)}
                />
            )}
        </div>
    );
}
