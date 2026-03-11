"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";

export default function SignupPage() {
    const router = useRouter();
    const setUser = useAuthStore((s) => s.setUser);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length < 6) { toast.error("Password must be at least 6 characters."); return; }
        setLoading(true);
        try {
            const user = await authApi.signup(email, password);
            setUser(user);
            router.push("/dashboard");
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || "Signup failed.";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-slide-up space-y-8">
            <div className="lg:hidden flex items-center gap-2">
                <div className="w-7 h-7 border-2 border-ink dark:border-white flex items-center justify-center">
                    <span className="font-black text-[10px] font-mono">hG</span>
                </div>
                <span className="font-black text-base tracking-tight">haGIT</span>
            </div>

            <div>
                <h1 className="font-black text-3xl tracking-tight">Create account</h1>
                <div className="mt-1.5 h-1 w-10 bg-brand-500" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-[rgb(var(--ink-muted))]">
                        Email
                    </label>
                    <input
                        type="email" required value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="input-brutal w-full px-4 py-3 text-sm rounded-none"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-[rgb(var(--ink-muted))]">
                        Password
                    </label>
                    <input
                        type="password" required value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        className="input-brutal w-full px-4 py-3 text-sm rounded-none"
                    />
                </div>
                <div className="pt-2">
                    <button
                        type="submit" disabled={loading}
                        className="btn-press w-full py-3 bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm border-2 border-ink shadow-brutal transition-all disabled:opacity-60"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Creating
                            </span>
                        ) : "Create account →"}
                    </button>
                </div>
            </form>

            <p className="text-sm text-[rgb(var(--ink-muted))]">
                Already have one?{" "}
                <Link href="/auth/login" className="font-bold text-[rgb(var(--ink))] underline underline-offset-2 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                    Sign in
                </Link>
            </p>
        </div>
    );
}
