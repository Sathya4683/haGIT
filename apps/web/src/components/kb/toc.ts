import GithubSlugger from "github-slugger";

/** H2 headings with the same ids rehype-slug assigns. */
export function tableOfContents(markdown: string) {
    const slugger = new GithubSlugger();
    const items: { id: string; text: string; level: number }[] = [];
    for (const line of markdown.split("\n")) {
        const m = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
        if (!m) continue;
        const text = m[2].replace(/[*_`]/g, "");
        const id = slugger.slug(text);
        if (m[1].length === 2) items.push({ id, text, level: 2 });
    }
    return items;
}
