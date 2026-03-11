export interface AuthUser {
  userId: number;
  email: string;
  token: string;
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

export type View = "commit" | "habits" | "recent" | "settings";
