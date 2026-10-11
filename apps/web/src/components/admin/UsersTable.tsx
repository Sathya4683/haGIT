"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ROLES, type Role } from "@/lib/permissions";
import { RoleBadge } from "./ui";

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

export function UsersTable({ users, currentUserId, canManage }: Props) {
    const router = useRouter();
    const [pending, setPending] = useState<number | null>(null);

    const changeRole = async (user: Row, role: Role) => {
        if (role === user.role) return;
        if (!confirm(`Change ${user.email} from ${user.role} to ${role}?`)) return;
        setPending(user.id);
        try {
            const res = await fetch(`/api/admin/users/${user.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error ?? "Failed to change role.");
            toast.success(`${user.email} is now ${role}.`);
            router.refresh();
        } catch (e) {
            toast.error((e as Error).message);
        } finally {
            setPending(null);
        }
    };

    return (
        <div className="card overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b-2 border-[rgb(var(--border))] text-left text-[10px] font-black uppercase tracking-widest text-[rgb(var(--ink-muted))]">
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Role</th>
                        <th className="px-4 py-3">Sign-in</th>
                        <th className="px-4 py-3 text-right">Habits</th>
                        <th className="px-4 py-3 text-right">Commits</th>
                        <th className="px-4 py-3">Joined</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map((u) => (
                        <tr key={u.id} className="border-b border-dashed border-[rgb(var(--border))] last:border-0">
                            <td className="px-4 py-2.5 font-mono text-xs">
                                {u.email}
                                {u.id === currentUserId && <span className="ml-2 text-[rgb(var(--ink-muted))]">(you)</span>}
                            </td>
                            <td className="px-4 py-2.5">
                                {canManage && u.id !== currentUserId ? (
                                    <select
                                        value={u.role}
                                        disabled={pending === u.id}
                                        onChange={(e) => changeRole(u, e.target.value as Role)}
                                        className="input-brutal px-2 py-1 text-xs font-bold"
                                        aria-label={`Role for ${u.email}`}
                                    >
                                        {ROLES.map((r) => (
                                            <option key={r} value={r}>{r}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <RoleBadge role={u.role} />
                                )}
                            </td>
                            <td className="px-4 py-2.5 text-xs text-[rgb(var(--ink-muted))]">{u.signIn}</td>
                            <td className="px-4 py-2.5 text-right font-mono tabular-nums">{u.habits}</td>
                            <td className="px-4 py-2.5 text-right font-mono tabular-nums">{u.commits}</td>
                            <td className="px-4 py-2.5 text-xs whitespace-nowrap">{new Date(u.createdAt).toLocaleDateString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
