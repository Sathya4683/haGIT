// The one thing the coach tools need from the outside world: read access to a
// single user's habits. The web app implements this with Prisma (bound to the
// authenticated user), the MCP server with the REST API. Tests use a fake.

export interface HabitSummary {
    name: string;
    createdAt: string; // ISO
    commitCount: number;
}

export interface CheckIn {
    habit: string;
    message: string;
    timestamp: string; // ISO
}

export interface HabitData {
    listHabits(): Promise<HabitSummary[]>;
    /** Every check-in, optionally scoped to one habit (exact name). Any order. */
    getCheckIns(habit?: string): Promise<CheckIn[]>;
    /** Write access is optional — only the MCP server provides it. */
    logCheckIn?(habit: string, message: string): Promise<CheckIn>;
    createHabit?(name: string): Promise<HabitSummary>;
}

/** A passage from haGIT's curated knowledge base (shared by all users, not personal data). */
export interface KbSnippet {
    articleId: number;
    slug: string;
    title: string;
    /** Section path, e.g. "Never miss twice > Getting back on track". */
    heading: string;
    content: string;
    url?: string;
}

/** Read-only search over the knowledge base. */
export interface KnowledgeBase {
    search(query: string, opts?: { limit?: number }): Promise<KbSnippet[]>;
}
