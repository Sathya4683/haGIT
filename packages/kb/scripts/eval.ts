// Retrieval quality check against a small golden set.
//   npm run kb:eval            prints per-query results and Recall@4 / MRR / negative accuracy
// Exits non-zero below the thresholds so CI catches ranking regressions.

import "./_env";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { articlesFromHits, searchKnowledgeBase } from "../src/search";

interface Case {
    query: string;
    /** Any of these slugs in the top results counts as a hit. Empty = expect no results. */
    expected: string[];
}

const RECALL_THRESHOLD = Number(process.env.KB_EVAL_MIN_RECALL ?? 0.85);
// Off-topic questions are also filtered by the coach prompt; retrieval only needs to reject most.
const NEGATIVE_THRESHOLD = Number(process.env.KB_EVAL_MIN_NEGATIVE ?? 0.6);
const K = 4;

const here = path.dirname(fileURLToPath(import.meta.url));
const cases: Case[] = JSON.parse(readFileSync(path.join(here, "../eval/golden.json"), "utf8"));
const prisma = new PrismaClient();

async function main() {
    let hits = 0;
    let rr = 0;
    let positives = 0;
    let negativesOk = 0;
    let negatives = 0;
    const latencies: number[] = [];

    for (const c of cases) {
        const { hits: results, timings } = await searchKnowledgeBase(prisma, c.query, { limit: K });
        latencies.push(timings.embedMs + timings.retrieveMs);
        const slugs = articlesFromHits(results).map((a) => a.slug).slice(0, K);

        if (c.expected.length === 0) {
            negatives++;
            const ok = slugs.length === 0;
            if (ok) negativesOk++;
            console.log(`${ok ? "PASS" : "FAIL"}  [neg] ${c.query}${ok ? "" : `  → ${slugs.join(", ")}`}`);
            continue;
        }

        positives++;
        const rank = slugs.findIndex((s) => c.expected.includes(s));
        if (rank >= 0) {
            hits++;
            rr += 1 / (rank + 1);
        }
        console.log(`${rank >= 0 ? "PASS" : "FAIL"}  #${rank >= 0 ? rank + 1 : "-"} ${c.query}  → ${slugs.join(", ") || "(none)"}`);
    }

    const recall = hits / positives;
    const mrr = rr / positives;
    const negAcc = negatives ? negativesOk / negatives : 1;
    latencies.sort((a, b) => a - b);
    const p50 = latencies[Math.floor(latencies.length / 2)];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];

    console.log(`\nRecall@${K} ${recall.toFixed(3)} · MRR ${mrr.toFixed(3)} · negatives ${negativesOk}/${negatives} · latency p50 ${p50} ms, p95 ${p95} ms`);
    if (recall < RECALL_THRESHOLD || negAcc < NEGATIVE_THRESHOLD) {
        console.error(`Below threshold (recall ≥ ${RECALL_THRESHOLD}, negatives ≥ ${NEGATIVE_THRESHOLD}).`);
        process.exitCode = 1;
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
