import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { paletteBootScript, paletteCss } from "@/lib/palettes";
import { Providers } from "./providers";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
    title: { default: "haGIT — Habit Tracker", template: "%s · haGIT" },
    description: "A Git-inspired habit tracker",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

const css = paletteCss();

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning className={`${sans.variable} ${mono.variable}`}>
            <head>
                <style id="hagit-palettes" dangerouslySetInnerHTML={{ __html: css }} />
                <script dangerouslySetInnerHTML={{ __html: paletteBootScript }} />
            </head>
            <body>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
