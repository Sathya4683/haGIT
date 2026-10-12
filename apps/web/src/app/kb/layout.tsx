import { Suspense } from "react";
import { AppHeader } from "@/components/home/AppHeader";
import { AppChrome } from "@/components/home/AppChrome";
import { CelebrateProvider } from "@/components/ui/Celebrate";

export default function KbLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-[rgb(var(--paper))] pb-20 md:pb-0">
            <AppHeader />
            {children}
            <footer className="border-t-2 border-[rgb(var(--border))] mt-16">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 text-xs text-[rgb(var(--ink-muted))]">
                    Articles summarise published research for general guidance. They are not medical advice.
                </div>
            </footer>
            <Suspense fallback={null}>
                <CelebrateProvider>
                    <AppChrome />
                </CelebrateProvider>
            </Suspense>
        </div>
    );
}
