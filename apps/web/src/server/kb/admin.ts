import { z } from "zod";
import { revalidatePath, revalidateTag } from "next/cache";
import { articleMetaSchema } from "@hagit/kb";
import { KB_CACHE_TAG } from "./queries";

export const articleInput = articleMetaSchema.extend({
    body: z.string().trim().min(50, "Write at least a few sentences.").max(100_000, "Articles are limited to 100,000 characters."),
    status: z.enum(["DRAFT", "PUBLISHED"]),
});

export type ArticleInput = z.infer<typeof articleInput>;

/** Refresh public pages after a change. */
export function revalidateKb(slug?: string) {
    revalidateTag(KB_CACHE_TAG);
    revalidatePath("/kb");
    if (slug) revalidatePath(`/kb/${slug}`);
}
