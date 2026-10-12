export const runtime = "nodejs";

import { timingSafeEqual } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { KB_CACHE_TAG } from "@/server/kb/queries";
import { withRoute } from "@/server/http/withRoute";
import { unauthorizedError } from "@/server/http/errors";

function secretMatches(provided: string | null) {
    const expected = process.env.REVALIDATE_SECRET;
    if (!expected || !provided) return false;
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
}

// POST /api/revalidate  (Authorization: Bearer REVALIDATE_SECRET)
// Refreshes the cached knowledge-base pages after CI syncs content/kb.
export const POST = withRoute({ name: "POST /api/revalidate" }, async ({ req }) => {
    const auth = req.headers.get("authorization");
    if (!secretMatches(auth?.startsWith("Bearer ") ? auth.slice(7) : null)) throw unauthorizedError();
    revalidateTag(KB_CACHE_TAG);
    revalidatePath("/kb", "layout");
    return Response.json({ revalidated: true });
});
