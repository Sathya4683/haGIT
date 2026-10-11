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
    commitCount: number;
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
