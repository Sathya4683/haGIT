export interface AuthUser {
  userId: number;
  email: string;
  token: string;
}

export interface VerifyResponse {
  userId: number;
  email: string;
}

export interface Habit {
  id: number;
  name: string;
  createdAt: string;
  commitCount: number;
}

export interface HabitDetail extends Habit {
  commits: CommitDetail[];
}

export interface CommitDetail {
  id: number;
  message: string;
  timestamp: string;
  createdAt: string;
}

export interface Commit {
  id: string;
  habitName: string;
  message: string;
  timestamp: string;
  synced: boolean;
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
