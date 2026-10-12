"use client";

import { useState } from "react";
import { signIn, signOut } from "next-auth/react";

interface Props {
    base: "" | "/admin";
    googleEnabled: boolean;
    /** Email of a signed-in account that lacks console access, if any. */
    signedInWithoutAccess: string | null;
}

export function AdminLoginForm({ base, googleEnabled, signedInWithoutAccess }: Props) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const home = base || "/";

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        const res = await signIn("admin-credentials", { email, password, redirect: false });
        setLoading(false);
        if (res?.error) {
            setError("Invalid credentials, or this account doesn't have console access.");
            return;
        }
        window.location.assign(home);
    };

    if (signedInWithoutAccess) {
        return (
            <div className="space-y-4">
                <p className="text-sm">
                    <span className="font-mono font-bold">{signedInWithoutAccess}</span> doesn&apos;t have access to the admin
                    console.
                </p>
                <button
                    onClick={() => signOut({ callbackUrl: `${base}/login` })}
                    className="btn-press-sm w-full py-2.5 text-sm font-bold border-2 border-[rgb(var(--border))] hover:bg-[rgb(var(--paper-alt))]"
                >
                    Use a different account
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <form onSubmit={submit} className="space-y-3">
                <input
                    type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@example.com" aria-label="Email"
                    className="input-brutal w-full px-4 py-3 text-sm"
                />
                <input
                    type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password" aria-label="Password"
                    className="input-brutal w-full px-4 py-3 text-sm"
                />
                {error && <p className="text-xs font-bold text-red-600 dark:text-red-400">{error}</p>}
                <button
                    type="submit" disabled={loading}
                    className="btn-press w-full py-3 bg-ink dark:bg-white text-white dark:text-ink font-bold text-sm border-2 border-ink dark:border-white shadow-brutal dark:shadow-brutal-dark disabled:opacity-60"
                >
                    {loading ? "Signing in…" : "Sign in →"}
                </button>
            </form>
            {googleEnabled && (
                <button
                    onClick={() => signIn("google", { callbackUrl: home })}
                    className="btn-press-sm w-full py-2.5 text-sm font-bold border-2 border-[rgb(var(--border))] hover:bg-[rgb(var(--paper-alt))]"
                >
                    Continue with Google
                </button>
            )}
        </div>
    );
}
