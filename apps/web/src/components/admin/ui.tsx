import { cn } from "@/lib/utils";
import type { Role } from "@/lib/permissions";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: React.ReactNode; actions?: React.ReactNode }) {
    return (
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6 sm:mb-8">
            <div className="min-w-0">
                {eyebrow && <p className="font-mono text-xs text-brand-600 dark:text-brand-400 mb-1.5">{eyebrow}</p>}
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{title}</h1>
                {description && <p className="text-sm text-[rgb(var(--ink-muted))] mt-1.5 max-w-2xl">{description}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
    );
}

/** A card with a title row. */
export function Panel({ title, meta, action, className, children }: { title: string; meta?: React.ReactNode; action?: React.ReactNode; className?: string; children: React.ReactNode }) {
    return (
        <section className={cn("card p-4 sm:p-5 min-w-0", className)}>
            <div className="flex items-start justify-between gap-3 mb-4">
                <div className="min-w-0">
                    <h2 className="text-sm font-black">{title}</h2>
                    {meta && <p className="text-xs text-[rgb(var(--ink-muted))] mt-0.5">{meta}</p>}
                </div>
                {action}
            </div>
            {children}
        </section>
    );
}

export function StatTile({ label, value, hint, icon, tint = "var(--brand-500)", children }: {
    label: string;
    value: string | number;
    hint?: React.ReactNode;
    icon?: React.ReactNode;
    /** RGB triplet var for the icon chip. */
    tint?: string;
    children?: React.ReactNode;
}) {
    return (
        <div className="card p-4 min-w-0 flex flex-col">
            <div className="flex items-center gap-2">
                {icon && (
                    <span className="w-7 h-7 flex items-center justify-center" style={{ background: `rgb(${tint} / 0.14)`, color: `rgb(${tint})` }}>
                        {icon}
                    </span>
                )}
                <p className="text-[11px] font-bold uppercase tracking-wider text-[rgb(var(--ink-muted))]">{label}</p>
            </div>
            <p className="mt-3 text-3xl font-black font-mono tabular-nums leading-none">{value}</p>
            {hint && <p className="mt-1.5 text-xs text-[rgb(var(--ink-muted))]">{hint}</p>}
            {children && <div className="mt-auto pt-3">{children}</div>}
        </div>
    );
}

export type Tone = "good" | "bad" | "warn" | "idle";

const TONE_STYLES: Record<Tone, string> = {
    good: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    bad: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    warn: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    idle: "bg-[rgb(var(--paper-alt))] text-[rgb(var(--ink-muted))]",
};

/** Status label with a dot; never colour alone. */
export function StatusPill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
    return (
        <span className={cn("inline-flex items-center gap-1.5 h-5 px-2 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap", TONE_STYLES[tone])}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {children}
        </span>
    );
}

const ROLE_STYLES: Record<Role, string> = {
    ADMIN: "bg-ink dark:bg-white text-white dark:text-ink",
    EDITOR: "bg-brand-500 text-white",
    USER: "bg-[rgb(var(--paper-alt))] text-[rgb(var(--ink-muted))]",
};

export function RoleBadge({ role }: { role: Role }) {
    return (
        <span className={cn("inline-flex items-center h-5 px-2 rounded-full text-[10px] font-black uppercase tracking-widest", ROLE_STYLES[role])}>
            {role}
        </span>
    );
}

export function Forbidden() {
    return (
        <div className="card p-10 text-center">
            <p className="font-mono text-sm text-[rgb(var(--ink-muted))]">403</p>
            <p className="text-lg font-black mt-1">No access</p>
            <p className="text-sm text-[rgb(var(--ink-muted))] mt-1">Your role doesn&apos;t include this section.</p>
        </div>
    );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
    return <div className="border-2 border-dashed border-[rgb(var(--border))]/40 p-8 text-center text-sm text-[rgb(var(--ink-muted))]">{children}</div>;
}

export function formatDateTime(d: Date) {
    return d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) + " UTC";
}

/** "5m ago", "3h ago", "2d ago". */
export function timeAgo(d: Date, now = Date.now()) {
    const s = Math.max(0, Math.round((now - d.getTime()) / 1000));
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
}

/** Human labels for audit actions ("kb.article_published" → "Published article"). */
export function describeAction(action: string) {
    const [area, verb] = action.split(".");
    const words = (verb ?? area).split("_");
    const noun = words.slice(0, -1).join(" ");
    const past = words[words.length - 1];
    const label = `${past.charAt(0).toUpperCase()}${past.slice(1)} ${noun}`.trim();
    return { area, label };
}
