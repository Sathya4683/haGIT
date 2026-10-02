import NextAuth, { type DefaultSession } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

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
            return withStringUserId(await adapter.createUser!(data));
        },
        async getUser(id) {
            return withStringUserIdOrNull(await adapter.getUser!(adapterIdAsPrismaInt(id)));
        },
        async getUserByEmail(email) {
            return withStringUserIdOrNull(await adapter.getUserByEmail!(email));
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
// strongly-typed number. We only ADD userId here — we do NOT redeclare `id`
// (the base User.id is `string | undefined`; redeclaring it as `number` would
// produce an incompatible intersection and TypeScript narrows it to `never`).
declare module "next-auth" {
    interface Session {
        user: {
            userId: number;
        } & DefaultSession["user"];
    }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
    adapter: intIdPrismaAdapter(),
    session: { strategy: "jwt" },
    providers: [
        Google({ allowDangerousEmailAccountLinking: true }),
        GitHub({
            allowDangerousEmailAccountLinking: true,
            // GitHub began sending the `iss` parameter on OAuth callbacks
            // (RFC 9207) in 2026. Auth.js's oauth4webapi strictly validates
            // it against the provider's `issuer` config, falling back to
            // "https://authjs.dev" if not set explicitly — which then fails
            // every GitHub sign-in with `Configuration`. Pin it here so the
            // validator matches what GitHub actually sends.
            // Refs: https://datatracker.ietf.org/doc/html/rfc9207
            //       https://github.com/nextauthjs/next-auth/issues/13409
            issuer: "https://github.com/login/oauth",
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            // The adapter exposes Auth.js IDs as strings; the app JWT uses Int IDs.
            if (user) {
                (token as unknown as { userId: number }).userId = Number(user.id);
            }
            return token;
        },
        async session({ session, token }) {
            const userId = (token as unknown as { userId?: number }).userId;
            if (typeof userId === "number" && Number.isFinite(userId)) {
                session.user.userId = userId;
            }
            return session;
        },
    },
});
