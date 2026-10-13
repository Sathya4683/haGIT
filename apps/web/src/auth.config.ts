// Edge-safe Auth.js configuration (no database adapter). Used directly by middleware.ts;
// auth.ts extends it with the Prisma adapter, the admin credentials provider and the
// database-backed jwt callback.

import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import type { Role } from "@/lib/permissions";

/** Fields the Node jwt callback (auth.ts) stores on the Auth.js token. */
export interface AppToken {
    userId?: number;
    /** User.tokenVersion at sign-in; a mismatch means the session was revoked. */
    tv?: number;
    role?: Role;
    /** Epoch ms of the last role refresh from the database. */
    roleCheckedAt?: number;
}

const githubOptions = {
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
};

export const authConfig = {
    session: { strategy: "jwt" },
    // Derive callback URLs from the request host (main and admin hosts). Safe behind Vercel's
    // proxy, and avoids Auth.js treating an empty AUTH_URL as "untrusted host".
    trustHost: true,
    providers: [
        Google({ allowDangerousEmailAccountLinking: true }),
        GitHub(githubOptions),
        // A GitHub OAuth App accepts a single callback host, so the admin console signs in
        // through a second app registered for ADMIN_HOST, with the callback URL
        // https://<admin host>/api/auth/callback/github-admin.
        ...(process.env.AUTH_GITHUB_ADMIN_ID
            ? [GitHub({
                ...githubOptions,
                id: "github-admin",
                clientId: process.env.AUTH_GITHUB_ADMIN_ID,
                clientSecret: process.env.AUTH_GITHUB_ADMIN_SECRET,
            })]
            : []),
    ],
    callbacks: {
        session({ session, token }) {
            const { userId, tv, role } = token as AppToken;
            if (typeof userId === "number" && Number.isFinite(userId)) {
                session.user.userId = userId;
            }
            session.user.role = role ?? "USER";
            session.tokenVersion = tv ?? 0;
            return session;
        },
    },
} satisfies NextAuthConfig;
