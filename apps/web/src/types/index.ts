export interface VerifyResponse {
    userId: number;
    email: string;
}

export interface AggregatedCommit {
    date: string;
    count: number;
}

export interface CommitByHabit {
    habitId: number;
    habitName: string;
    createdAt: string;
    commitCount: number;
    currentStreak: number;
    longestStreak: number;
    committedToday: boolean;
    lastCommitAt: string | null;
    /** Commit counts for the last 14 local days, oldest first (today last). */
    recent: number[];
}

export interface NtfySubscription {
    topic: string;
    webUrl: string;
    appUrl: string;
}

export interface Preferences {
    email: string;
    timezone: string;
    palette: string;
    nudgeEnabled: boolean;
    nudgeHour: number;
    weeklyReportEnabled: boolean;
    ntfy: NtfySubscription | null;
}

export interface CoachSource {
    articleId: number;
    slug: string;
    title: string;
}

export interface CoachResponse {
    reply: string;
    toolCalls: { name: string; args: Record<string, unknown> }[];
    model: string;
    /** Knowledge-base articles cited inline as [KB<articleId>]. */
    sources?: CoachSource[];
}

export interface CoachTurn {
    role: "user" | "coach";
    text: string;
}
