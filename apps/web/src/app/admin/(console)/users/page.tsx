import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { Forbidden, PageHeader } from "@/components/admin/ui";
import { UsersTable } from "@/components/admin/UsersTable";
import { getAdminActor } from "@/server/admin/session";

export default async function AdminUsersPage() {
    const actor = (await getAdminActor())!;
    if (!can(actor.role, "ops:view")) return <Forbidden />;

    const users = await prisma.user.findMany({
        orderBy: { createdAt: "asc" },
        select: {
            id: true,
            email: true,
            role: true,
            createdAt: true,
            password: true,
            _count: { select: { habits: true, commits: true, accounts: true } },
        },
    });

    return (
        <>
            <PageHeader title="Users" description={`${users.length} account${users.length === 1 ? "" : "s"}. Habit contents are never shown here.`} />
            <UsersTable
                currentUserId={actor.userId}
                canManage={can(actor.role, "users:manage")}
                users={users.map((u) => ({
                    id: u.id,
                    email: u.email,
                    role: u.role,
                    createdAt: u.createdAt.toISOString(),
                    habits: u._count.habits,
                    commits: u._count.commits,
                    signIn: [u.password ? "password" : null, u._count.accounts ? "oauth" : null].filter(Boolean).join(" + ") || "—",
                }))}
            />
        </>
    );
}
