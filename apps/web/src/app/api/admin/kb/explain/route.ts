export const runtime = "nodejs";

import { z } from "zod";
import { explainSearch } from "@hagit/kb/search";
import { prisma } from "@/lib/prisma";
import { withRoute } from "@/server/http/withRoute";

// GET /api/admin/kb/explain?q= — ranking breakdown for the retrieval playground.
export const GET = withRoute<"admin", undefined, { q: string }>(
    {
        name: "GET /api/admin/kb/explain",
        auth: "admin",
        permission: "kb:write",
        query: z.object({ q: z.string().trim().min(2).max(300) }),
    },
    async ({ query }) => Response.json(await explainSearch(prisma, query.q)),
);
