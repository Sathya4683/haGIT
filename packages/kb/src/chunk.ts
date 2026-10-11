import type { Chunk } from "./types";

export interface ChunkOptions {
    /** Target maximum words per chunk (bge-small has a 512-token window). */
    maxWords?: number;
    /** Words carried over from the previous chunk of the same section. */
    overlapWords?: number;
}

interface Section {
    path: string[];
    blocks: string[];
}

const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length;
// Rough English token estimate for budgeting (bge's WordPiece averages ~1.3 tokens/word).
const tokenEstimate = (s: string) => Math.ceil(wordCount(s) * 1.3);

function lastWords(text: string, n: number) {
    const words = text.split(/\s+/).filter(Boolean);
    return words.length <= n ? text : words.slice(-n).join(" ");
}

/** Splits markdown into sections by H2/H3 headings and paragraphs into blocks. */
function sections(markdown: string): Section[] {
    const out: Section[] = [];
    let h2: string | null = null;
    let current: Section = { path: [], blocks: [] };
    let buffer: string[] = [];

    const flushBlock = () => {
        const text = buffer.join("\n").trim();
        if (text) current.blocks.push(text);
        buffer = [];
    };
    const startSection = (path: string[]) => {
        flushBlock();
        if (current.blocks.length) out.push(current);
        current = { path, blocks: [] };
    };

    for (const line of markdown.split("\n")) {
        const heading = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
        if (heading) {
            const level = heading[1].length;
            const text = heading[2].trim();
            if (level === 1) {
                startSection([]); // the article title is added as context separately
            } else if (level === 2) {
                h2 = text;
                startSection([text]);
            } else {
                startSection(h2 ? [h2, text] : [text]);
            }
            continue;
        }
        if (line.trim() === "") {
            flushBlock();
        } else {
            buffer.push(line);
        }
    }
    startSection([]);
    return out;
}

function splitLongBlock(block: string, maxWords: number): string[] {
    if (wordCount(block) <= maxWords) return [block];
    const sentences = block.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) ?? [block];
    const parts: string[] = [];
    let current = "";
    for (const sentence of sentences) {
        if (current && wordCount(current) + wordCount(sentence) > maxWords) {
            parts.push(current.trim());
            current = "";
        }
        current += sentence;
    }
    if (current.trim()) parts.push(current.trim());
    return parts;
}

/**
 * Markdown-aware chunking: one or more chunks per section, never crossing a heading, with a
 * small overlap between consecutive chunks of the same section. Each chunk carries a contextual
 * header ("Title > Section") that is embedded with it.
 */
export function chunkArticle(title: string, markdown: string, opts: ChunkOptions = {}): Chunk[] {
    const maxWords = opts.maxWords ?? 220;
    const overlapWords = opts.overlapWords ?? 40;
    const chunks: Chunk[] = [];

    for (const section of sections(markdown)) {
        const heading = [title, ...section.path].join(" > ");
        const blocks = section.blocks.flatMap((b) => splitLongBlock(b, maxWords));
        let current: string[] = [];
        let carried = "";

        const emit = () => {
            const body = current.join("\n\n").trim();
            if (!body) return;
            const content = carried ? `${carried} ${body}` : body;
            chunks.push({
                ordinal: chunks.length,
                heading,
                content,
                tokenCount: tokenEstimate(`${heading}\n\n${content}`),
                embedText: `${heading}\n\n${content}`,
            });
            carried = overlapWords > 0 ? `…${lastWords(body, overlapWords)}` : "";
            current = [];
        };

        for (const block of blocks) {
            const size = wordCount(current.join(" ")) + wordCount(block);
            if (current.length && size > maxWords) emit();
            current.push(block);
        }
        emit();
    }
    return chunks;
}
