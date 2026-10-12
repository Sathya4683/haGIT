import { cn } from "@/lib/utils";

/** Section heading in the dashboard's git/terminal voice, e.g. "~/habits". */
export function SectionTitle({ prefix = "~/", title, meta, action, className }: {
    prefix?: string;
    title: string;
    meta?: React.ReactNode;
    action?: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn("flex items-end justify-between gap-3 mb-3", className)}>
            <div className="min-w-0">
                <h2 className="font-mono text-[13px] font-bold tracking-tight">
                    <span className="text-brand-600 dark:text-brand-400">{prefix}</span>
                    {title}
                </h2>
                {meta && <p className="text-xs text-[rgb(var(--ink-muted))] mt-0.5 truncate">{meta}</p>}
            </div>
            {action}
        </div>
    );
}

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLElement> & { as?: "section" | "div" | "article" }) {
    return (
        <section className={cn("card p-4 sm:p-5", className)} {...rest}>
            {children}
        </section>
    );
}
