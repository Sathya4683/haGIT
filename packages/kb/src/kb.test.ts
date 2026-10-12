import { describe, expect, it } from "vitest";
import { chunkArticle } from "./chunk";
import { parseArticle, readingMinutes, slugify } from "./parse";
import { applyCutoff, diversify, fuse, rank, toOrTsQuery } from "./rank";

const md = `---
title: Never miss twice
slug: never-miss-twice
summary: One missed day does not ruin a habit; the second miss is the danger.
tags: [Setbacks, streaks]
sources:
  - title: Lally et al. (2010)
    url: https://doi.org/10.1002/ejsp.674
---

# Never miss twice

Intro paragraph about missing days.

## What the research says

${"Habits are built by repetition in a stable context. ".repeat(40)}

## Getting back on track

- Do the smallest version today.
- Don't double up.
`;

describe("parseArticle", () => {
    it("validates frontmatter and normalises tags", () => {
        const a = parseArticle(md);
        expect(a.slug).toBe("never-miss-twice");
        expect(a.tags).toEqual(["setbacks", "streaks"]);
        expect(a.sources[0].url).toBe("https://doi.org/10.1002/ejsp.674");
        expect(a.body.startsWith("# Never miss twice")).toBe(true);
    });

    it("derives title, slug and summary when frontmatter is missing", () => {
        const a = parseArticle("# Sleep Better, Train Better!\n\nA short guide to resting so your habits stick.\n");
        expect(a.title).toBe("Sleep Better, Train Better!");
        expect(a.slug).toBe("sleep-better-train-better");
        expect(a.summary).toBe("A short guide to resting so your habits stick.");
    });

    it("rejects invalid slugs", () => {
        expect(() => parseArticle("---\ntitle: Valid title\nslug: Bad Slug\nsummary: long enough summary\n---\nbody")).toThrow();
    });

    it("slugifies and estimates reading time", () => {
        expect(slugify("Café & Crème: 2 Habits")).toBe("cafe-creme-2-habits");
        expect(readingMinutes("word ".repeat(660))).toBe(3);
    });
});

describe("chunkArticle", () => {
    const chunks = chunkArticle("Never miss twice", parseArticle(md).body, { maxWords: 120, overlapWords: 10 });

    it("never crosses headings and prefixes the heading path", () => {
        expect(chunks[0].heading).toBe("Never miss twice");
        expect(chunks.some((c) => c.heading === "Never miss twice > What the research says")).toBe(true);
        expect(chunks.at(-1)!.heading).toBe("Never miss twice > Getting back on track");
        expect(chunks.at(-1)!.embedText.startsWith("Never miss twice > Getting back on track\n\n")).toBe(true);
    });

    it("splits long sections with overlap and keeps ordinals dense", () => {
        const research = chunks.filter((c) => c.heading.endsWith("What the research says"));
        expect(research.length).toBeGreaterThan(1);
        expect(research[1].content.startsWith("…")).toBe(true);
        expect(chunks.map((c) => c.ordinal)).toEqual(chunks.map((_, i) => i));
        expect(chunks.every((c) => c.tokenCount < 512)).toBe(true);
    });
});

describe("ranking", () => {
    const dense = [
        { chunkId: 1, articleId: 10, similarity: 0.8 },
        { chunkId: 2, articleId: 10, similarity: 0.78 },
        { chunkId: 3, articleId: 20, similarity: 0.74 },
        { chunkId: 4, articleId: 30, similarity: 0.5 },
    ];
    const lexical = [{ chunkId: 3, articleId: 20 }, { chunkId: 4, articleId: 30 }];

    it("fuses with reciprocal rank fusion", () => {
        const fused = fuse(dense, lexical);
        expect(fused[0].chunkId).toBe(3); // ranked by both retrievers
        expect(fused[0].score).toBeCloseTo(1 / 63 + 1 / 61);
    });

    it("drops weak and lexical-only matches", () => {
        const kept = applyCutoff(fuse(dense, [...lexical, { chunkId: 9, articleId: 90 }])).map((c) => c.chunkId);
        expect(kept).not.toContain(4); // 0.5 is below both floors
        expect(kept).not.toContain(9); // lexical-only: no similarity
    });

    it("prefers distinct articles before second chunks", () => {
        const order = diversify(fuse(dense, lexical), { limit: 3 }).map((c) => c.articleId);
        expect(order).toEqual([20, 30, 10]); // chunk 4 fuses high before the cutoff is applied
        expect(rank(dense, lexical, { perArticle: 1 }).map((c) => c.articleId)).toEqual([20, 10]);
    });

    it("builds OR queries without stopwords or punctuation", () => {
        expect(toOrTsQuery("Why do I keep skipping the gym on weekends?!")).toBe("keep | skipping | gym | weekends");
        expect(toOrTsQuery("a an the")).toBeNull();
    });
});
