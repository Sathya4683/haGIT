import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { can } from "@/lib/permissions";
import { adminBasePath } from "@/server/admin/session";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export const dynamic = "force-dynamic";

// Decorative contribution graph for the brand panel (deterministic, no data).
const CELLS = Array.from({ length: 7 * 22 }, (_, i) => {
    const v = (Math.sin(i * 12.9898) * 43758.5453) % 1;
    const x = Math.abs(v);
    return x > 0.82 ? 4 : x > 0.62 ? 3 : x > 0.42 ? 2 : x > 0.25 ? 1 : 0;
});

export default async function AdminLoginPage() {
    const base = adminBasePath();
    const session = await auth();
    if (session?.user && can(session.user.role, "admin:access")) redirect(base || "/");
    // On its own host the console needs its own GitHub OAuth App (see auth.config.ts); at /admin
    // on the main host the regular one works.
    const githubProvider = base
        ? (process.env.AUTH_GITHUB_ID ? "github" : null)
        : (process.env.AUTH_GITHUB_ADMIN_ID ? "github-admin" : null);

    return (
        <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr] bg-[rgb(var(--paper))]">
            <section className="relative hidden lg:flex flex-col justify-between p-12 bg-[#111113] text-white overflow-hidden">
                <div className="absolute inset-0 dot-grid opacity-20 pointer-events-none" aria-hidden />
                <div className="relative flex items-center gap-2.5">
                    <span className="w-9 h-9 flex items-center justify-center bg-brand-500 border-2 border-white/80">
                        <span className="text-white font-black text-xs font-mono">hG</span>
                    </span>
                    <span className="font-black tracking-tight text-lg">haGIT</span>
                    <span className="font-mono text-xs text-white/50">admin console</span>
                </div>

                <div className="relative space-y-8">
                    <div className="inline-grid grid-flow-col grid-rows-7 gap-[5px]" aria-hidden>
                        {CELLS.map((level, i) => (
                            <span key={i} className="w-3.5 h-3.5 rounded-[3px]" style={{ background: level ? `rgb(var(--brand-${[0, 800, 600, 500, 400][level]}))` : "rgba(255,255,255,0.06)" }} />
                        ))}
                    </div>
                    <div>
                        <h2 className="text-4xl font-black tracking-tight leading-tight">Keep the library sharp<br />and the jobs green.</h2>
                        <p className="mt-3 text-white/60 max-w-md">Write and publish articles the coach cites, tune retrieval, manage roles and keep an eye on reminders and reports.</p>
                    </div>
                </div>

                <p className="relative font-mono text-xs text-white/40">$ git log --author=you --since=today</p>
            </section>

            <section className="flex items-center justify-center p-6 sm:p-12">
                <div className="w-full max-w-sm space-y-7">
                    <div className="lg:hidden flex items-center gap-2">
                        <span className="w-8 h-8 border-2 border-[rgb(var(--border))] flex items-center justify-center bg-brand-500">
                            <span className="text-white font-black text-xs font-mono">hG</span>
                        </span>
                        <span className="font-black tracking-tight">haGIT</span>
                        <span className="font-mono text-xs text-[rgb(var(--ink-muted))]">admin console</span>
                    </div>
                    <div>
                        <p className="font-mono text-xs text-brand-600 dark:text-brand-400">$ hagit admin login</p>
                        <h1 className="text-3xl font-black tracking-tight mt-1.5">Welcome back</h1>
                        <p className="text-sm text-[rgb(var(--ink-muted))] mt-1">Sign in with an editor or admin account.</p>
                    </div>
                    <AdminLoginForm
                        base={base}
                        googleEnabled={Boolean(process.env.AUTH_GOOGLE_ID)}
                        githubProvider={githubProvider}
                        signedInWithoutAccess={session?.user?.email ?? null}
                    />
                </div>
            </section>
        </div>
    );
}
