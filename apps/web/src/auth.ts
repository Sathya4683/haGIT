import NextAuth, { type DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

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
    adapter: PrismaAdapter(prisma),
    session: { strategy: "jwt" },
    providers: [
        Google({ allowDangerousEmailAccountLinking: true }),
        GitHub({ allowDangerousEmailAccountLinking: true }),
        MicrosoftEntraID({ allowDangerousEmailAccountLinking: true }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            // `user` is only present on first sign-in (from the adapter).
            // The adapter passes user.id as a string; coerce to our Int schema.
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
