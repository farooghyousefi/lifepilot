export type ISODateString = string;

export type LifeArea =
  | "health"
  | "career"
  | "finance"
  | "relationships"
  | "personal-growth"
  | "home";

export type Priority = "low" | "medium" | "high";

export interface LifeGoal {
  id: string;
  title: string;
  area: LifeArea;
  priority: Priority;
  targetDate?: ISODateString;
  progress: number;
}

export interface Reminder {
  id: string;
  title: string;
  dueAt: ISODateString;
  completed: boolean;
  linkedGoalId?: string;
}

export interface DocumentSummary {
  id: string;
  title: string;
  category: "contract" | "medical" | "finance" | "identity" | "other";
  uploadedAt: ISODateString;
  storageKey: string;
}

export interface LifePilotSnapshot {
  userDisplayName: string;
  goals: LifeGoal[];
  reminders: Reminder[];
  documents: DocumentSummary[];
}

export interface ApiResult<T> {
  data: T;
  requestId: string;
  source: "mock" | "aws";
}

