export type LifeBrainInputType =
  | "document"
  | "email"
  | "message"
  | "conversation"
  | "manual_note"
  | "uploaded_file";

export type LifeBrainSource =
  | "pasted_text"
  | "uploaded_file"
  | "future_email_connector"
  | "future_calendar_connector";

export interface LifeBrainUserPreferences {
  archiveBankStatementsByDefault: boolean;
  askBeforeCreatingReminder: boolean;
  generateReplyDraftsForEmails: boolean;
  officialLettersHighPriority: boolean;
  paymentReminderDaysBefore: number;
  requireConfirmationForUnclearDeadlines: boolean;
}

export interface LifeBrainInput {
  inputType: LifeBrainInputType;
  metadata?: {
    fileName?: string;
    receivedAt?: string;
    recipient?: string;
    sender?: string;
    subject?: string;
    userLocale?: string;
    userTimezone?: string;
  };
  rawText: string;
  source: LifeBrainSource;
  userPreferences?: LifeBrainUserPreferences;
}

export type LifeBrainDetectedLanguage = "de" | "en" | "unknown";

export type LifeBrainDocumentType =
  | "invoice"
  | "contract"
  | "termination"
  | "bank_statement"
  | "official_letter"
  | "appointment_notice"
  | "payment_reminder"
  | "insurance"
  | "jobcenter_or_employment_agency"
  | "tax"
  | "rental"
  | "medical"
  | "legal_notice"
  | "email_request"
  | "email_thread"
  | "conversation"
  | "unknown";

export type LifeBrainImportance = "low" | "medium" | "high";

export type LifeBrainPriority = "low" | "medium" | "high" | "critical";

export type LifeBrainActionType =
  | "pay"
  | "reply"
  | "attend_appointment"
  | "cancel_contract"
  | "create_reminder"
  | "create_task"
  | "review_document"
  | "provide_missing_info"
  | "archive_only"
  | "call_someone"
  | "send_document"
  | "wait"
  | "no_action";

export type LifeBrainUrgency = "none" | "low" | "medium" | "high" | "critical";

export type LifeBrainRiskLevel =
  | "none"
  | "low"
  | "medium"
  | "high"
  | "critical";

export type LifeBrainAnalysisMode = "openai" | "fallback";

export interface LifeBrainImportantFact {
  importance: LifeBrainImportance;
  label: string;
  value: string;
}

export interface LifeBrainDetectedAmount {
  amount: number | null;
  context: string;
  currency: string;
  rawText: string;
}

export interface LifeBrainDetectedDate {
  context: string;
  isActionable: boolean;
  isoDate: string | null;
  rawText: string;
  reason: string;
  time?: string | null;
}

export interface LifeBrainAction {
  description: string;
  dueDate?: string | null;
  id: string;
  priority: LifeBrainPriority;
  requiresConfirmation: boolean;
  time?: string | null;
  title: string;
  type: LifeBrainActionType;
}

export interface LifeBrainDeadline {
  date: string;
  priority: LifeBrainPriority;
  reason: string;
  shouldCreateReminder: boolean;
  sourceText: string;
  time?: string | null;
  title: string;
}

export interface LifeBrainAppointment {
  date: string;
  description: string;
  location?: string | null;
  shouldGenerateIcs: boolean;
  time?: string | null;
  title: string;
}

export interface LifeBrainReminder {
  reason: string;
  remindAt: string;
  title: string;
}

export interface LifeBrainTask {
  description: string;
  dueDate?: string | null;
  priority: LifeBrainPriority;
  title: string;
}

export interface LifeBrainSuggestedReply {
  body: string;
  subject?: string;
  tone: "formal" | "neutral" | "friendly";
}

export interface LifeBrainRecommendedNextStep {
  actionType: string;
  description: string;
  title: string;
}

export interface LifeBrainResult {
  actions: LifeBrainAction[];
  analysisMode: LifeBrainAnalysisMode;
  appointments: LifeBrainAppointment[];
  brainVersion: string;
  category: string;
  clarificationQuestion?: string | null;
  confidence: number;
  deadlines: LifeBrainDeadline[];
  detectedAmounts: LifeBrainDetectedAmount[];
  detectedDates: LifeBrainDetectedDate[];
  detectedLanguage: LifeBrainDetectedLanguage;
  detectedOrganizations: string[];
  detectedPeople: string[];
  documentType: LifeBrainDocumentType;
  importantFacts: LifeBrainImportantFact[];
  inputType: string;
  fallbackReason?: string;
  modelUsed?: string;
  rawDetailsCollapsed: boolean;
  recommendedNextStep: LifeBrainRecommendedNextStep;
  reminders: LifeBrainReminder[];
  requiresUserConfirmation: boolean;
  riskLevel: LifeBrainRiskLevel;
  shouldArchiveOnly: boolean;
  shouldCreateReminder: boolean;
  shouldCreateTask: boolean;
  shouldGenerateIcs: boolean;
  shortSummary: string;
  source: string;
  suggestedReply?: LifeBrainSuggestedReply | null;
  tasks: LifeBrainTask[];
  title: string;
  urgency: LifeBrainUrgency;
  userFriendlyExplanation: string;
}

export const lifeBrainVersion = "life-brain-v1";

export const defaultLifeBrainUserPreferences: LifeBrainUserPreferences = {
  archiveBankStatementsByDefault: true,
  askBeforeCreatingReminder: true,
  generateReplyDraftsForEmails: true,
  officialLettersHighPriority: true,
  paymentReminderDaysBefore: 2,
  requireConfirmationForUnclearDeadlines: true,
};
