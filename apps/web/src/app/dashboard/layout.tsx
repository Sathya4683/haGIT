"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useAuthStore } from "@/store/authStore";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { user, isLoading } = useAuthStore();
    const { data: nextAuthSession } = useSession();
    const setUser = useAuthStore((s) => s.setUser);

    // Tracks whether the bridge request is currently in flight, so the redirect
    // effect below doesn't bounce an OAuth user back to /auth/login while the
    // JWT is still being fetched.
    const bridgingRef = useRef(false);

    // OAuth bridge: fires once when the authStore has finished hydrating with
    // no user (covers the case where someone lands on /dashboard right after
    // Google/GitHub sign-in, where the Auth.js session cookie is set
    // but the localStorage `hagit_user` blob is empty). The route returns 401
    // if there's no session, in which case the redirect effect below kicks in.
    //
    // Deliberately does NOT depend on `nextAuthSession` — useSession() polls and
    // would re-trigger this effect on every poll, hammering the bridge route.
    useEffect(() => {
        if (isLoading || user) return;
        if (bridgingRef.current) return;

        bridgingRef.current = true;
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch("/api/auth/session-token");
                if (!res.ok || cancelled) {
                    bridgingRef.current = false;
                    return;
                }
                const data = await res.json();
                if (cancelled) return;
                setUser({ userId: data.userId, email: data.email, token: data.token });
                bridgingRef.current = false;
            } catch {
                bridgingRef.current = false;
            }
        })();
        return () => { cancelled = true; };
    }, [isLoading, user, setUser]);

    // Redirect to /auth/login only when the authStore has no user AND there is
    // no in-flight OAuth bridge AND no Auth.js session to bridge from. The
    // session check is what makes OAuth return-URLs land on /dashboard rather
    // than bouncing back to /auth/login while the bridge is still fetching.
    useEffect(() => {
        if (isLoading) return;
        if (user) return;
        if (bridgingRef.current) return;
        if (nextAuthSession?.user) return;
        router.replace("/auth/login");
    }, [user, isLoading, nextAuthSession, router]);

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
