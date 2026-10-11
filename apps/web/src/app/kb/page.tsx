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
        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
            <div className="mb-8">
                <div className="h-1 w-10 bg-brand-500 mb-3" />
                <h1 className="text-3xl font-black tracking-tight">Habit library</h1>
                <p className="text-sm text-[rgb(var(--ink-muted))] mt-1.5 max-w-xl">
                    Short, research-backed guides on building habits that stick. The haGIT coach cites these when it answers
                    your questions.
                </p>
            </div>
            <KbLibrary articles={articles} />
        </main>
    );
}
