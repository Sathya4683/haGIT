import type { Metadata } from "next";
import { KbLibrary } from "@/components/kb/KbLibrary";
import { listPublishedArticles } from "@/server/kb/queries";

// Rendered per request from cached data (see server/kb/queries.ts), so builds need no database.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Habit library",
    description: "Short, research-backed articles on building habits that stick.",
};

export default async function KbIndexPage() {
    const articles = await listPublishedArticles();
    return (
        <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-5 sm:pt-8">
            <div className="mb-8">
                <p className="font-mono text-xs text-brand-600 dark:text-brand-400 mb-1.5">~/library</p>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Habit library</h1>
                <p className="text-sm sm:text-[15px] text-[rgb(var(--ink-muted))] mt-1.5 max-w-xl">
                    Short, research-backed guides on building habits that stick. The haGIT coach cites these when it answers
                    your questions.
                </p>
            </div>
            <KbLibrary articles={articles} />
        </main>
    );
}
