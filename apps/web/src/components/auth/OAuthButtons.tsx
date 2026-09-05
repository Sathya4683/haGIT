"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Inline SVG icons — no extra package. Stroked at currentColor so the
// surrounding text color drives them.
function GoogleIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
            <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
            />
            <path
                fill="#FBBC05"
                d="M5.84 14.1A6.6 6.6 0 0 1 5.49 12c0-.73.13-1.44.35-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z"
            />
            <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
            />
        </svg>
    );
}

function GitHubIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
            <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.92.57.1.78-.25.78-.55 0-.27-.01-1-.01-1.95-3.2.69-3.88-1.54-3.88-1.54-.52-1.33-1.27-1.69-1.27-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.69 1.25 3.34.95.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.15 1.18a10.9 10.9 0 0 1 5.74 0c2.19-1.49 3.15-1.18 3.15-1.18.62 1.59.23 2.76.11 3.05.74.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.4-5.25 5.68.41.36.78 1.06.78 2.14 0 1.55-.01 2.8-.01 3.18 0 .31.21.66.79.55C20.21 21.38 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
        </svg>
    );
}

const providers = [
    { id: "google", label: "Continue with Google", Icon: GoogleIcon },
    { id: "github", label: "Continue with GitHub", Icon: GitHubIcon },
] as const;

interface Props {
    callbackUrl?: string;
}

export function OAuthButtons({ callbackUrl = "/dashboard" }: Props) {
    const [busy, setBusy] = useState<string | null>(null);

    const onClick = async (providerId: string) => {
        setBusy(providerId);
        try {
            await signIn(providerId, { callbackUrl });
        } catch {
            toast.error("Sign-in failed. Try again.");
            setBusy(null);
        }
    };

    return (
        <div className="space-y-2">
            {providers.map(({ id, label, Icon }) => (
                <button
                    key={id}
                    type="button"
                    disabled={busy !== null}
                    onClick={() => onClick(id)}
                    className={cn(
                        "btn-press-sm w-full flex items-center justify-center gap-2 py-2.5",
                        "font-bold text-sm border-2 border-[rgb(var(--border))]",
                        "hover:bg-[rgb(var(--paper-alt))] transition-all",
                        "disabled:opacity-60"
                    )}
                >
                    <Icon className="w-4 h-4" />
                    {busy === id ? "Redirecting…" : label}
                </button>
            ))}
        </div>
    );
}
