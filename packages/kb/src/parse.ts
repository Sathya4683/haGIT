import matter from "gray-matter";
import { z } from "zod";
import type { ParsedArticle } from "./types";

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const articleMetaSchema = z.object({
    title: z.string().trim().min(3, "Title must be at least 3 characters.").max(140),
    slug: z
        .string()
        .trim()
        .min(3)
        .max(80)
        .regex(SLUG_PATTERN, "Slug may only contain lowercase letters, digits and single hyphens."),
    summary: z.string().trim().min(10, "Summary must be at least 10 characters.").max(400),
    tags: z.array(z.string().trim().toLowerCase().min(1).max(32)).max(12).default([]),
    sources: z
        .array(z.object({ title: z.string().trim().min(1).max(400), url: z.string().url().optional() }))
        .max(20)
        .default([]),
});

export function slugify(title: string): string {
    return title
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80)
        .replace(/-+$/g, "");
}

/** Parses a markdown file with YAML frontmatter into a validated article. */
export function parseArticle(markdown: string, fallback: Partial<ParsedArticle> = {}): ParsedArticle {
    const { data, content } = matter(markdown);
    const title = (data.title as string | undefined) ?? fallback.title ?? firstHeading(content) ?? "";
    const meta = articleMetaSchema.parse({
        ...fallback,
        ...data,
        title,
        slug: (data.slug as string | undefined) ?? fallback.slug ?? slugify(title),
        summary: (data.summary as string | undefined) ?? fallback.summary ?? firstParagraph(content),
    });
    return { ...meta, body: content.trim() };
}

function firstHeading(markdown: string): string | undefined {
    return markdown.match(/^#\s+(.+)$/m)?.[1]?.trim();
}

function firstParagraph(markdown: string): string {
    const para = markdown
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .find((p) => p && !p.startsWith("#") && !p.startsWith(">") && !p.startsWith("|"));
    return (para ?? "").replace(/\s+/g, " ").slice(0, 300);
}

export function readingMinutes(body: string): number {
    const words = body.split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 220));
}
