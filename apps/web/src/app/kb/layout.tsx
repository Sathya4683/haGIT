import { PublicHeader } from "@/components/kb/PublicHeader";

export default function KbLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-[rgb(var(--paper))]">
            <PublicHeader />
            {children}
            <footer className="border-t-2 border-[rgb(var(--border))] mt-16">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 text-xs text-[rgb(var(--ink-muted))]">
                    Articles summarise published research for general guidance. They are not medical advice.
                </div>
            </footer>
        </div>
    );
}
