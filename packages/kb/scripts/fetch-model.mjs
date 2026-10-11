#!/usr/bin/env node
// Downloads the quantised bge-small-en-v1.5 ONNX model used for local embeddings.
//   node packages/kb/scripts/fetch-model.mjs [targetDir]   (default: apps/web/models)
// Skipped when EMBEDDINGS_PROVIDER=cloudflare. Existing files are kept.

import { createWriteStream, existsSync, mkdirSync, statSync, renameSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const MODEL = "Xenova/bge-small-en-v1.5";
const FILES = ["config.json", "tokenizer.json", "tokenizer_config.json", "special_tokens_map.json", "onnx/model_quantized.onnx"];
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

export async function fetchModel(target = resolve(repoRoot, "apps/web/models")) {
    for (const file of FILES) {
        const dest = join(target, MODEL, file);
        if (existsSync(dest) && statSync(dest).size > 0) continue;
        mkdirSync(dirname(dest), { recursive: true });
        const url = `https://huggingface.co/${MODEL}/resolve/main/${file}`;
        const res = await fetch(url);
        if (!res.ok || !res.body) throw new Error(`Download failed (${res.status}): ${url}`);
        const tmp = `${dest}.part`;
        await pipeline(Readable.fromWeb(res.body), createWriteStream(tmp));
        renameSync(tmp, dest);
        console.log(`fetched ${MODEL}/${file}`);
    }
    return target;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    if (process.env.EMBEDDINGS_PROVIDER === "cloudflare") {
        console.log("EMBEDDINGS_PROVIDER=cloudflare: skipping local model download");
    } else {
        const dir = await fetchModel(process.argv[2] ? resolve(process.argv[2]) : undefined);
        console.log(`embedding model ready in ${dir}`);
    }
}
