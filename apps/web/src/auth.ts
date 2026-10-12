import NextAuth, { type DefaultSession } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/auth";
import { can, isAdminHost, type Role } from "@/lib/permissions";
import { checkPolicy, rateLimits } from "@/lib/rate-limit";
import { authConfig, type AppToken } from "./auth.config";

/** How long a role read from the database is trusted before it is checked again. */
const ROLE_REFRESH_MS = 5 * 60 * 1000;

function prismaUserId(id: string) {
    const value = Number(id);
    if (!Number.isSafeInteger(value) || value < 1) {
        throw new TypeError("Auth.js supplied an invalid user ID");
    }
    return value;
}

function adapterIdAsPrismaInt(id: string) {
    // PrismaAdapter's public type assumes string IDs, but Prisma must receive
    // an actual number for this schema. The cast changes only the TS view.
    return prismaUserId(id) as unknown as string;
}

function withStringUserId<T extends { id: unknown }>(user: T) {
    return { ...user, id: String(user.id) };
}

function withStringUserIdOrNull<T extends { id: unknown }>(user: T | null) {
    return user ? withStringUserId(user) : null;
}

function intIdPrismaAdapter(): Adapter {
    const adapter = PrismaAdapter(prisma);

    // Auth.js represents adapter user IDs as strings, while this app's Prisma
    // schema stores them as Int. Translate IDs at the adapter boundary so all
    // OAuth providers (and existing JWT sessions) use the same conversion.
    return {
        ...adapter,
        async createUser(data) {
            return withStringUserId(await adapter.createUser!({ ...data, email: normalizeEmail(data.email) }));
        },
        async getUser(id) {
            return withStringUserIdOrNull(await adapter.getUser!(adapterIdAsPrismaInt(id)));
        },
        async getUserByEmail(email) {
            return withStringUserIdOrNull(await adapter.getUserByEmail!(normalizeEmail(email)));
        },
        async getUserByAccount(account) {
            return withStringUserIdOrNull(await adapter.getUserByAccount!(account));
        },
        async updateUser({ id, ...data }) {
            return withStringUserId(await adapter.updateUser!({
                ...data,
                id: adapterIdAsPrismaInt(id),
            }));
        },
        async deleteUser(id) {
            await adapter.deleteUser!(adapterIdAsPrismaInt(id));
        },
        async linkAccount(account) {
            await adapter.linkAccount!({
                ...account,
                userId: adapterIdAsPrismaInt(account.userId),
            });
        },
    };
}

// Augment NextAuth's Session so consumers can read `session.user.userId` as a
// strongly-typed number. We only ADD fields here — we do NOT redeclare `id`
// (the base User.id is `string | undefined`; redeclaring it as `number` would
// produce an incompatible intersection and TypeScript narrows it to `never`).
declare module "next-auth" {
    interface Session {
        user: {
            userId: number;
            role: Role;
        } & DefaultSession["user"];
        /** User.tokenVersion at sign-in; a mismatch means the session was revoked. */
        tokenVersion: number;
    }
}

const adminCredentials = z.object({
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(1).max(128),
});

function requestHost(request: Request) {
    return request.headers.get("x-forwarded-host") ?? request.headers.get("host");
}

/**
 * Password sign-in for the admin console only. Regular users authenticate through
 * /api/auth/login (API tokens); this provider accepts EDITOR/ADMIN accounts, and only on the
 * admin host when one is configured.
 */
const AdminCredentials = Credentials({
    id: "admin-credentials",
    name: "Admin",
    credentials: { email: {}, password: {} },
    async authorize(raw, request) {
        if (process.env.ADMIN_HOST && !isAdminHost(requestHost(request))) return null;

        const parsed = adminCredentials.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const policies = [rateLimits.ip(request, "admin-login", rateLimits.perMinute(10)), rateLimits.loginEmail(email)];
        for (const policy of policies) {
            if (!(await checkPolicy({ ...policy, failClosed: true })).allowed) return null;
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.password || !can(user.role, "admin:access")) return null;
        if (!(await bcrypt.compare(password, user.password))) return null;

        return { id: String(user.id), email: user.email, name: user.name, image: user.image };
    },
});

export const { handlers, signIn, signOut, auth } = NextAuth({
    ...authConfig,
    adapter: intIdPrismaAdapter(),
    providers: [...authConfig.providers, AdminCredentials],
    events: {
        // Email/password signup does not verify the address, and OAuth providers are allowed to
        // link to an existing account by email. Without this, someone could register a victim's
        // email with a password before the victim ever signs in with Google/GitHub, and keep
        // access afterwards. The first successful OAuth link proves ownership of the address, so
        // drop any unverified password and revoke previously issued API tokens.
        async linkAccount({ user }) {
            const id = Number(user.id);
            if (!Number.isSafeInteger(id)) return;
            await prisma.user.updateMany({
                where: { id, emailVerified: null, password: { not: null } },
                data: { password: null, emailVerified: new Date(), tokenVersion: { increment: 1 } },
            });
            await prisma.user.updateMany({
                where: { id, emailVerified: null },
                data: { emailVerified: new Date() },
            });
        },
    },
    callbacks: {
        ...authConfig.callbacks,
        async jwt({ token, user }) {
            const t = token as AppToken;
            // The adapter exposes Auth.js IDs as strings; the app uses Int IDs.
            if (user) t.userId = Number(user.id);
            if (!t.userId) return token;

            if (user || Date.now() - (t.roleCheckedAt ?? 0) > ROLE_REFRESH_MS) {
                // Read after the linkAccount event, which may have just bumped the version.
                const row = await prisma.user.findUnique({
                    where: { id: t.userId },
                    select: { role: true, tokenVersion: true },
                });
                if (!row) return null; // account deleted: end the session
                if (user) t.tv = row.tokenVersion;
                t.role = row.role;
                t.roleCheckedAt = Date.now();
            }
            return token;
        },
    },
});
