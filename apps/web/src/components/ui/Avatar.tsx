import { cn } from "@/lib/utils";

export function initialsOf(email: string | null | undefined) {
    const local = (email ?? "?").split("@")[0].replace(/[^a-zA-Z0-9]+/g, " ").trim();
    const parts = local.split(" ").filter(Boolean);
    return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function displayName(email: string | null | undefined) {
    // "sathya.n2548@…" → "Sathya", "sathyanarayanan2548@…" → "Sathyanarayanan"
    const first = (email ?? "").split("@")[0].split(/[._+-]/)[0];
    const local = first.replace(/\d+$/, "") || first;
    return local ? local.charAt(0).toUpperCase() + local.slice(1) : "there";
}

export function Avatar({ email, className }: { email: string | null | undefined; className?: string }) {
    return (
        <span
            className={cn(
                "inline-flex items-center justify-center w-8 h-8 border-2 border-[rgb(var(--border))] bg-brand-200 dark:bg-brand-800 text-[11px] font-black font-mono text-ink dark:text-white",
                className,
            )}
            aria-hidden
        >
            {initialsOf(email)}
        </span>
    );
}
