// Turns a coach reply (plain text with "Section:" headings, "- " bullets, "1." steps and
// [KB<id>] citation tags) into blocks the chat can render.

export type SectionTone = "summary" | "wins" | "watch" | "next" | "other";

export type Block =
    | { kind: "heading"; title: string; tone: SectionTone }
    | { kind: "paragraph"; text: string }
    | { kind: "bullets"; items: string[] }
    | { kind: "steps"; items: string[] };

export type Inline = { kind: "text"; text: string } | { kind: "cite"; articleId: number; n: number };

const KNOWN: [RegExp, SectionTone, string][] = [
    [/^summary$/i, "summary", "Summary"],
    [/^wins?$/i, "wins", "Wins"],
    [/^watch[- ]?outs?$/i, "watch", "Watch-outs"],
    [/^next steps?$/i, "next", "Next steps"],
];

function headingOf(label: string): { title: string; tone: SectionTone } {
    for (const [re, tone, title] of KNOWN) if (re.test(label)) return { title, tone };
    return { title: label, tone: "other" };
}

/** Strips markdown the model sometimes adds despite the plain-text instruction. */
const demarkdown = (line: string) => line.replace(/\*\*(.+?)\*\*/g, "$1").replace(/__(.+?)__/g, "$1");

export function parseReply(text: string): Block[] {
    const blocks: Block[] = [];
    let gap = true; // a blank line separates paragraphs and ends list continuations

    for (const raw of text.replace(/\r\n?/g, "\n").split("\n")) {
        const line = demarkdown(raw.trim());
        if (!line) { gap = true; continue; }
        const last = blocks[blocks.length - 1];

        const md = /^#{1,6}\s+(.+?):?$/.exec(line);
        const labelled = /^([A-Za-z][A-Za-z -]{1,30}):\s*(.*)$/.exec(line);
        const bullet = /^[-*•]\s+(.*)$/.exec(line);
        const step = /^\d+[.)]\s+(.*)$/.exec(line);

        if (md) {
            blocks.push({ kind: "heading", ...headingOf(md[1]) });
        } else if (labelled && (KNOWN.some(([re]) => re.test(labelled[1])) || (!labelled[2] && labelled[1].length <= 30))) {
            blocks.push({ kind: "heading", ...headingOf(labelled[1]) });
            if (labelled[2]) blocks.push({ kind: "paragraph", text: labelled[2] });
        } else if (bullet) {
            if (last?.kind === "bullets") last.items.push(bullet[1]);
            else blocks.push({ kind: "bullets", items: [bullet[1]] });
        } else if (step) {
            if (last?.kind === "steps") last.items.push(step[1]);
            else blocks.push({ kind: "steps", items: [step[1]] });
        } else if (!gap && (last?.kind === "bullets" || last?.kind === "steps")) {
            last.items[last.items.length - 1] += ` ${line}`;
        } else if (!gap && last?.kind === "paragraph") {
            last.text += ` ${line}`;
        } else {
            blocks.push({ kind: "paragraph", text: line });
        }
        gap = false;
    }
    return blocks;
}

/**
 * Numbers citations by first appearance across the whole reply, so the markers in the text
 * match the numbered source list. Tags for unknown articles are dropped.
 */
export function citationOrder(text: string, known: Set<number>): Map<number, number> {
    const order = new Map<number, number>();
    const re = /\[KB(\d+)\]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
        const id = Number(m[1]);
        if (known.has(id) && !order.has(id)) order.set(id, order.size + 1);
    }
    return order;
}

/** Splits a line into text and citation markers. */
export function splitCitations(text: string, order: Map<number, number>): Inline[] {
    const out: Inline[] = [];
    for (const part of text.split(/\s*(\[KB\d+\])/g)) {
        const m = /^\[KB(\d+)\]$/.exec(part);
        if (m) {
            const n = order.get(Number(m[1]));
            if (n) out.push({ kind: "cite", articleId: Number(m[1]), n });
        } else if (part) {
            out.push({ kind: "text", text: part });
        }
    }
    return out;
}
