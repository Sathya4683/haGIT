import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { EmptyState, Forbidden, PageHeader, formatDateTime } from "@/components/admin/ui";
import { getAdminActor } from "@/server/admin/session";

export default async function AdminAuditPage() {
    const actor = (await getAdminActor())!;
    if (!can(actor.role, "audit:view")) return <Forbidden />;

    const entries = await prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
        include: { actor: { select: { email: true } } },
    });

    return (
        <>
            <PageHeader title="Audit log" description="Privileged actions taken in the admin console (latest 200)." />
            {entries.length === 0 ? (
                <EmptyState>Nothing recorded yet.</EmptyState>
            ) : (
                <div className="card overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b-2 border-[rgb(var(--border))] text-left text-[10px] font-black uppercase tracking-widest text-[rgb(var(--ink-muted))]">
                                <th className="px-4 py-3">When</th>
                                <th className="px-4 py-3">Who</th>
                                <th className="px-4 py-3">Action</th>
                                <th className="px-4 py-3">Target</th>
                                <th className="px-4 py-3">Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map((e) => (
                                <tr key={e.id} className="border-b border-dashed border-[rgb(var(--border))] last:border-0 align-top">
                                    <td className="px-4 py-2.5 whitespace-nowrap text-xs">{formatDateTime(e.createdAt)}</td>
                                    <td className="px-4 py-2.5 font-mono text-xs">{e.actor?.email ?? "deleted user"}</td>
                                    <td className="px-4 py-2.5 font-mono font-bold text-xs">{e.action}</td>
                                    <td className="px-4 py-2.5 text-xs">{e.target ?? "—"}</td>
                                    <td className="px-4 py-2.5 font-mono text-[11px] text-[rgb(var(--ink-muted))] break-all">
                                        {e.meta ? JSON.stringify(e.meta) : ""}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </>
    );
}
