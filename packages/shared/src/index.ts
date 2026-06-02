export type ISODateString = string;

export type LifeArea =
  | "health"
  | "career"
  | "finance"
  | "relationships"
  | "personal-growth"
  | "home";

export type Priority = "low" | "medium" | "high";

export type ContractCategory =
  | "internet"
  | "fitness"
  | "energy"
  | "mobile"
  | "insurance"
  | "subscription"
  | "other";

export type RiskLevel = "low" | "medium" | "high";

export type ContractStatus =
  | "active"
  | "action-needed"
  | "cancellation-window"
  | "unused"
  | "alternative-found"
  | "draft";

export type DocumentCategory =
  | "contracts"
  | "insurance"
  | "finance"
  | "identity"
  | "bills"
  | "other";

export type DocumentStatus =
  | "needs-review"
  | "protected"
  | "linked-to-contract"
  | "expiring-soon";

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

export interface Document {
  id: string;
  name: string;
  category: DocumentCategory;
  status: DocumentStatus;
  addedAt: ISODateString;
  linkedContract?: string;
  securityNote: string;
  recommendedAction: string;
  notes?: string;
}

export interface CreateDocumentInput {
  name: string;
  category: DocumentCategory;
  status: DocumentStatus;
  notes?: string;
}

export interface VaultItem {
  id: string;
  documentId: string;
  name: string;
  category: DocumentCategory;
  protectedAt: ISODateString;
  securityLevel: "demo" | "encryption-ready";
}

export interface Contract {
  id: string;
  contractId: string;
  userId?: string;
  provider: string;
  category: ContractCategory;
  monthlyCost: number;
  contractEnd?: ISODateString;
  cancellationDeadlineDays: number;
  status: ContractStatus;
  statusLabel: string;
  riskLevel: RiskLevel;
  annualSavingsPotential: number;
  createdAt?: ISODateString;
  updatedAt?: ISODateString;
}

export interface CreateContractInput {
  provider: string;
  category: ContractCategory;
  monthlyCost: number;
  contractEnd?: ISODateString;
  cancellationDeadlineDays: number;
  status?: ContractStatus;
  statusLabel?: string;
  riskLevel?: RiskLevel;
  annualSavingsPotential?: number;
}

export interface ContractSummary {
  monthlyFixedCosts: number;
  activeContracts: number;
  criticalDeadlines: number;
  annualSavingsPotential: number;
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
