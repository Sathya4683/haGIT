export const runtime = "nodejs";

import { z } from "zod";
import { ZodError } from "zod";
import { parseArticle } from "@hagit/kb";
import { withRoute } from "@/server/http/withRoute";
import { HttpError } from "@/server/http/errors";

// POST /api/admin/kb/parse { markdown } — reads frontmatter from an uploaded .md file so the
// editor can pre-fill its fields. Missing fields are derived (title from the first heading,
// slug from the title, summary from the first paragraph).
export const POST = withRoute<"admin", { markdown: string }>(
    {
        name: "POST /api/admin/kb/parse",
        auth: "admin",
        permission: "kb:write",
        body: z.object({ markdown: z.string().min(1).max(200_000, "Files are limited to 200 KB.") }),
    },
    async ({ body }) => {
        try {
            return Response.json(parseArticle(body.markdown));
        } catch (e) {
            if (e instanceof ZodError) throw new HttpError(400, `Couldn't read the file: ${e.issues[0]?.message ?? "invalid frontmatter"}`);
            throw new HttpError(400, "Couldn't read the file's frontmatter.");
        }
    },
);
