import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import { cn } from "@/lib/utils";

/**
 * Renders knowledge-base markdown. HTML is sanitised (articles are written by editors, but an
 * editor account is still not trusted to inject scripts), and headings get stable ids.
 */
export function Markdown({ source, className }: { source: string; className?: string }) {
    return (
        <div className={cn("prose prose-kb max-w-none", className)}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeSanitize, rehypeSlug]}
                components={{
                    a: ({ href, children }) => {
                        const external = href?.startsWith("http");
                        return (
                            <a href={href} {...(external && { target: "_blank", rel: "noopener noreferrer" })}>
                                {children}
                            </a>
                        );
                    },
                }}
            >
                {source}
            </ReactMarkdown>
        </div>
    );
}

/** Drops a leading "# Title" line that duplicates the page heading. */
export function stripLeadingTitle(body: string, title: string) {
    const match = body.match(/^#\s+(.+)\n+/);
    return match && match[1].trim().toLowerCase() === title.trim().toLowerCase() ? body.slice(match[0].length) : body;
}
