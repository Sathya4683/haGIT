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

export interface CoachResponse {
    reply: string;
    toolCalls: { name: string; args: Record<string, unknown> }[];
    model: string;
}
