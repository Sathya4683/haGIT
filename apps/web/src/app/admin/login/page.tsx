import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { can } from "@/lib/permissions";
import { adminBasePath } from "@/server/admin/session";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
    const base = adminBasePath();
    const session = await auth();
    if (session?.user && can(session.user.role, "admin:access")) redirect(base || "/");

    return (
        <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--paper))] p-6">
            <div className="w-full max-w-sm card p-8 space-y-6">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 border-2 border-[rgb(var(--border))] flex items-center justify-center bg-brand-500">
                        <span className="text-white font-black text-xs font-mono">hG</span>
                    </div>
                    <span className="font-black tracking-tight">haGIT</span>
                    <span className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 border-2 border-[rgb(var(--border))]">
                        Admin
                    </span>
                </div>
                <div>
                    <h1 className="text-2xl font-black tracking-tight">Console sign-in</h1>
                    <div className="mt-1.5 h-1 w-10 bg-brand-500" />
                </div>
                <AdminLoginForm
                    base={base}
                    googleEnabled={Boolean(process.env.AUTH_GOOGLE_ID)}
                    signedInWithoutAccess={session?.user?.email ?? null}
                />
            </div>
        </div>
    );
}
