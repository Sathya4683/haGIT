import { cn } from "@/lib/utils";
import type { Role } from "@/lib/permissions";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
    return (
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
            <div>
                <div className="h-1 w-8 bg-brand-500 mb-3" />
                <h1 className="text-2xl font-black tracking-tight">{title}</h1>
                {description && <p className="text-sm text-[rgb(var(--ink-muted))] mt-1">{description}</p>}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
    );
}

export function StatTile({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
    return (
        <div className="card p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-[rgb(var(--ink-muted))]">{label}</p>
            <p className="mt-1 text-3xl font-black font-mono tabular-nums leading-none">{value}</p>
            {hint && <p className="mt-1.5 text-xs text-[rgb(var(--ink-muted))]">{hint}</p>}
        </div>
    );
}

const ROLE_STYLES: Record<Role, string> = {
    ADMIN: "bg-ink dark:bg-white text-white dark:text-ink border-ink dark:border-white",
    EDITOR: "bg-brand-500 text-white border-ink",
    USER: "border-[rgb(var(--border))] text-[rgb(var(--ink-muted))]",
};

export function RoleBadge({ role }: { role: Role }) {
    return (
        <span className={cn("inline-block text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 border-2", ROLE_STYLES[role])}>
            {role}
        </span>
    );
}

export function Forbidden() {
    return (
        <div className="card p-8 text-center">
            <p className="text-lg font-black">No access</p>
            <p className="text-sm text-[rgb(var(--ink-muted))] mt-1">Your role doesn&apos;t include this section.</p>
        </div>
    );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
    return <div className="card-flat p-6 text-center text-sm text-[rgb(var(--ink-muted))]">{children}</div>;
}

export function formatDateTime(d: Date) {
    return d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) + " UTC";
}
