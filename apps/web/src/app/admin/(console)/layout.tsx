import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { can } from "@/lib/permissions";
import { adminBasePath, getAdminActor } from "@/server/admin/session";
import { ADMIN_NAV } from "./nav";

export const dynamic = "force-dynamic";

export default async function AdminConsoleLayout({ children }: { children: React.ReactNode }) {
    const base = adminBasePath();
    const actor = await getAdminActor();
    if (!actor) redirect(`${base}/login`);

    const nav = ADMIN_NAV.filter((item) => can(actor.role, item.permission));
    return (
        <AdminShell
            base={base} email={actor.email} role={actor.role} nav={nav}
            grafanaUrl={can(actor.role, "ops:view") ? process.env.GRAFANA_URL || undefined : undefined}
            appUrl={process.env.APP_URL || undefined}
        >
            {children}
        </AdminShell>
    );
}
