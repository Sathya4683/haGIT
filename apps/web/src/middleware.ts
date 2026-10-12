// Host-based routing for the admin console.
//
// With ADMIN_HOST set (e.g. hagithub-admin.vercel.app):
//   admin host:  /x  → rewritten to /admin/x, signed-out visitors are sent to /login
//   other hosts: /admin/* and /api/admin/* → 404, so the console is invisible to users
// Without ADMIN_HOST the console is served at /admin on the main host.
//
// This is a coarse gate based on the session token; pages and APIs re-check the role in the
// database before doing anything.

import NextAuth from "next-auth";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { authConfig } from "./auth.config";
import { can, isAdminHost } from "./lib/permissions";

const { auth } = NextAuth(authConfig);

const LOGIN = "/admin/login";

function route(request: NextRequest, hasAccess: boolean) {
    const { pathname, search } = request.nextUrl;
    const at = (path: string) => new URL(path, request.url);

    if (isAdminHost(request.headers.get("host"))) {
        if (pathname.startsWith("/api/")) return NextResponse.next();

        const target = pathname.startsWith("/admin") ? pathname : `/admin${pathname === "/" ? "" : pathname}`;
        if (target === LOGIN) {
            return hasAccess ? NextResponse.redirect(at("/")) : NextResponse.rewrite(at(LOGIN + search));
        }
        if (!hasAccess) return NextResponse.redirect(at("/login"));
        return NextResponse.rewrite(at(target + search));
    }

    const isAdminPath = pathname === "/admin" || pathname.startsWith("/admin/") || pathname.startsWith("/api/admin");
    if (!isAdminPath) return NextResponse.next();
    if (process.env.ADMIN_HOST) return NextResponse.rewrite(at("/404"), { status: 404 });

    // Path mode: the console lives at /admin on this host.
    if (pathname.startsWith("/api/admin") || pathname === LOGIN) return NextResponse.next();
    if (!hasAccess) return NextResponse.redirect(at(LOGIN));
    return NextResponse.next();
}

export default function middleware(request: NextRequest, event: NextFetchEvent) {
    // Auth.js may rebase the request it hands to the callback onto AUTH_URL; routing decisions
    // use the original request so the admin host is recognised either way.
    const withSession = auth((req) => route(request, can(req.auth?.user?.role, "admin:access")));
    return withSession(request, event as never);
}

export const config = {
    // Everything except static assets and Auth.js's own endpoints.
    matcher: ["/((?!_next/static|_next/image|api/auth|favicon.ico|icon.png|.*\\.(?:png|jpg|jpeg|svg|ico|webp|woff2?|ttf)$).*)"],
};
