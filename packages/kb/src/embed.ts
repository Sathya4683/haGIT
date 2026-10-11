// Sentence embeddings with BAAI bge-small-en-v1.5: English-only, 384 dimensions, ~33M
// parameters, so query embedding takes milliseconds on a CPU.
//
// Providers (EMBEDDINGS_PROVIDER):
//   local       in-process ONNX via transformers.js; model files from `npm run fetch-model`
//   cloudflare  Workers AI (@cf/baai/bge-small-en-v1.5), the same model, for hosts where the
//               ONNX runtime is too large to ship (e.g. serverless bundle limits)
// Both use CLS pooling and L2 normalisation, so vectors are interchangeable.

import path from "node:path";

export const EMBEDDING_MODEL = "Xenova/bge-small-en-v1.5";
export const EMBEDDING_DIMENSIONS = 384;
/** BGE's recommended instruction for short queries against passages. */
export const QUERY_INSTRUCTION = "Represent this sentence for searching relevant passages: ";

export interface Embedder {
    /** Identifies model + provider; stored with indexed content. */
    readonly id: string;
    embedDocuments(texts: string[]): Promise<number[][]>;
    embedQuery(text: string): Promise<number[]>;
}

function normalize(v: number[]): number[] {
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
    return v.map((x) => x / norm);
}

/** Small LRU so repeated questions skip the model entirely. */
class QueryCache {
    private map = new Map<string, number[]>();
    constructor(private readonly size = 256) {}
    get(key: string) {
        const v = this.map.get(key);
        if (v) {
            this.map.delete(key);
            this.map.set(key, v);
        }
        return v;
    }
    set(key: string, value: number[]) {
        this.map.set(key, value);
        if (this.map.size > this.size) this.map.delete(this.map.keys().next().value!);
    }
}

type Extractor = (texts: string[], opts: { pooling: "cls"; normalize: boolean }) => Promise<{ tolist(): number[][] }>;

export class LocalEmbedder implements Embedder {
    readonly id = `local:${EMBEDDING_MODEL}`;
    private extractor: Promise<Extractor> | null = null;
    private cache = new QueryCache();

    constructor(private readonly modelDir = process.env.KB_MODEL_DIR ?? path.join(process.cwd(), "models")) {}

    private load(): Promise<Extractor> {
        this.extractor ??= (async () => {
            const transformers = await import("@huggingface/transformers");
            const allowDownload = process.env.KB_ALLOW_MODEL_DOWNLOAD === "true";
            transformers.env.localModelPath = this.modelDir;
            transformers.env.allowLocalModels = true;
            transformers.env.allowRemoteModels = allowDownload;
            if (allowDownload) transformers.env.cacheDir = this.modelDir;
            const pipe = await transformers.pipeline("feature-extraction", EMBEDDING_MODEL, { dtype: "q8" });
            return pipe as unknown as Extractor;
        })().catch((e) => {
            this.extractor = null; // retry on the next call
            throw new Error(
                `Could not load the embedding model from ${this.modelDir}. Run \`npm run fetch-model\` first. (${(e as Error).message})`,
            );
        });
        return this.extractor;
    }

    async embedDocuments(texts: string[]): Promise<number[][]> {
        if (texts.length === 0) return [];
        const extractor = await this.load();
        const out: number[][] = [];
        for (let i = 0; i < texts.length; i += 16) {
            const batch = await extractor(texts.slice(i, i + 16), { pooling: "cls", normalize: true });
            out.push(...batch.tolist());
        }
        return out;
    }

    async embedQuery(text: string): Promise<number[]> {
        const cached = this.cache.get(text);
        if (cached) return cached;
        const [vector] = await this.embedDocuments([QUERY_INSTRUCTION + text]);
        this.cache.set(text, vector);
        return vector;
    }
}

export class CloudflareEmbedder implements Embedder {
    readonly id = "cloudflare:@cf/baai/bge-small-en-v1.5";
    private cache = new QueryCache();

    constructor(
        private readonly accountId = process.env.CLOUDFLARE_ACCOUNT_ID,
        private readonly token = process.env.CLOUDFLARE_AI_TOKEN,
    ) {}

    private async run(texts: string[]): Promise<number[][]> {
        if (!this.accountId || !this.token) {
            throw new Error("CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_AI_TOKEN are required for the cloudflare embeddings provider");
        }
        const url = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run/@cf/baai/bge-small-en-v1.5`;
        const res = await fetch(url, {
            method: "POST",
            headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ text: texts, pooling: "cls" }),
            signal: AbortSignal.timeout(10_000),
        });
        const json = (await res.json().catch(() => ({}))) as { success?: boolean; result?: { data?: number[][] }; errors?: unknown };
        if (!res.ok || !json.success || !json.result?.data) {
            throw new Error(`Workers AI embedding request failed (${res.status}): ${JSON.stringify(json.errors ?? {})}`);
        }
        return json.result.data.map(normalize);
    }

    async embedDocuments(texts: string[]): Promise<number[][]> {
        const out: number[][] = [];
        for (let i = 0; i < texts.length; i += 50) out.push(...(await this.run(texts.slice(i, i + 50))));
        return out;
    }

    async embedQuery(text: string): Promise<number[]> {
        const cached = this.cache.get(text);
        if (cached) return cached;
        const [vector] = await this.run([QUERY_INSTRUCTION + text]);
        this.cache.set(text, vector);
        return vector;
    }
}

let shared: Embedder | null = null;

/** Process-wide embedder for the configured provider (the model loads once per instance). */
export function getEmbedder(): Embedder {
    if (!shared) {
        shared = process.env.EMBEDDINGS_PROVIDER === "cloudflare" ? new CloudflareEmbedder() : new LocalEmbedder();
    }
    return shared;
}

/** pgvector literal, e.g. "[0.1,0.2,...]". */
export function toVectorLiteral(v: number[]): string {
    if (v.length !== EMBEDDING_DIMENSIONS) throw new Error(`Expected ${EMBEDDING_DIMENSIONS} dimensions, got ${v.length}`);
    return `[${v.map((x) => (Number.isFinite(x) ? x.toFixed(7) : "0")).join(",")}]`;
}
