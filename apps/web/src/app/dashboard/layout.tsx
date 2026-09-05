"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useAuthStore } from "@/store/authStore";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { user, isLoading } = useAuthStore();
    const { data: nextAuthSession } = useSession();
    const setUser = useAuthStore((s) => s.setUser);

    // OAuth bridge: if we have an Auth.js session but no local user yet
    // (e.g., just landed here after Google/GitHub/Microsoft sign-in), fetch
    // the legacy JWT from /api/auth/session-token and populate authStore so the
    // SettingsDrawer CLI Token panel + every Bearer-protected API call works.
    useEffect(() => {
        if (isLoading || user) return;
        if (!nextAuthSession?.user) return;

        let cancelled = false;
        (async () => {
            try {
                const res = await fetch("/api/auth/session-token");
                if (!res.ok || cancelled) return;
                const data = await res.json();
                if (cancelled) return;
                setUser({ userId: data.userId, email: data.email, token: data.token });
            } catch {
                // Network error or no session — fall through to the existing
                // unauthenticated redirect below.
            }
        })();
        return () => { cancelled = true; };
    }, [isLoading, user, nextAuthSession, setUser]);

    useEffect(() => {
        if (!isLoading && !user) router.replace("/auth/login");
    }, [user, isLoading, router]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--paper))]">
                <div className="space-y-3 text-center">
                    <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent animate-spin mx-auto" />
                    <p className="text-xs font-bold uppercase tracking-widest text-[rgb(var(--ink-muted))]">Loading</p>
                </div>
            </div>
        );
    }

    if (!user) return null;
    return <>{children}</>;
}
