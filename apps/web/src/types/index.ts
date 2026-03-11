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
