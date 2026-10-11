"use client";

import { useEffect } from "react";
import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { PaletteProvider } from "@/components/theme/PaletteProvider";
import { WebTelemetry } from "@/components/telemetry/WebTelemetry";

function AuthHydrator({ children }: { children: React.ReactNode }) {
    const hydrate = useAuthStore((s) => s.hydrate);
    useEffect(() => {
        hydrate();
    }, [hydrate]);
    return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <PaletteProvider>
                <SessionProvider>
                    <AuthHydrator>
                        {children}
                        <Toaster position="top-right" richColors closeButton />
                        <WebTelemetry />
                    </AuthHydrator>
                </SessionProvider>
            </PaletteProvider>
        </ThemeProvider>
    );
}
