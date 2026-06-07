export type ISODateString = string;

export type LifeArea =
  | "health"
  | "career"
  | "finance"
  | "relationships"
  | "personal-growth"
  | "home";

export type Priority = "low" | "medium" | "high";

export type AuthProvider = "mock" | "cognito" | "google" | "apple";

export type UserRole = "user" | "admin";

export type ContractCategory =
  | "internet"
  | "mobile"
  | "electricity"
  | "gas"
  | "insurance"
  | "rent"
  | "banking"
  | "loan"
  | "subscription"
  | "authority"
  | "healthcare"
  | "tax"
  | "other";

export type FactConfidence = "high" | "medium" | "low";

export type FactVerificationStatus =
  | "extracted"
  | "user-confirmed"
  | "user-corrected"
  | "missing"
  | "not-applicable";

export type ContractLifecycleStatus =
  | "draft"
  | "needs-review"
  | "active"
  | "cancellable-now"
  | "cancellation-window-upcoming"
  | "cancellation-deadline-missed"
  | "ended"
  | "unknown";

export type SuggestedContractAction =
  | "missing-info-needed"
  | "reminder-needed"
  | "cancellation-draft-ready"
  | "offer-comparison-planned"
  | "contract-review-needed";

export type RequiredFactKey =
  | "provider"
  | "category"
  | "customerNumber"
  | "contractNumber"
  | "invoiceNumber"
  | "fileNumber"
  | "policyNumber"
  | "insuranceType"
  | "authorityName"
  | "requestedAction"
  | "amount"
  | "monthlyPrice"
  | "monthlyPayment"
  | "yearlyEstimate"
  | "monthlyRent"
  | "paymentInterval"
  | "startDate"
  | "contractDate"
  | "endDate"
  | "minimumTerm"
  | "termMonths"
  | "cancellationPeriod"
  | "cancellationDate"
  | "renewalDate"
  | "dueDate"
  | "appointmentDate"
  | "relatedPersonProfileId";

export type ManagedPersonProfileType =
  | "me"
  | "partner"
  | "child"
  | "household"
  | "parent";

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

export type DocumentUploadStatus =
  | "metadata-only"
  | "upload-pending"
  | "uploaded"
  | "failed";

export type AnalysisStatus =
  | "not-started"
  | "extracting"
  | "completed"
  | "unsupported"
  | "failed";

export type ExtractedTextSource =
  | "browser-text-file"
  | "browser-pdf-text"
  | "browser-pdf-placeholder"
  | "ocr-placeholder"
  | "ai-provider-placeholder";

export type DetectedDeadlineKind =
  | "frist"
  | "zahlung"
  | "kuendigung"
  | "termin"
  | "datum";

export type DetectedDocumentActionType =
  | "appointment"
  | "payment_deadline"
  | "cancellation_deadline"
  | "response_deadline"
  | "contract_review"
  | "general_reminder";

export type ReminderSource =
  | "manual"
  | "document-deadline"
  | "contract"
  | "system";

export type PersistenceStatus =
  | "local-dev"
  | "backend-prepared"
  | "backend-saved"
  | "backend-failed";

export type DocumentIntent =
  | "employment_termination"
  | "invoice"
  | "contract"
  | "insurance"
  | "authority_letter"
  | "identity_document"
  | "general_document";

export type BrainRiskLevel = "low" | "medium" | "high";

export type BrainConfidence = "low" | "medium" | "high";

export type BrainProviderStatus =
  | "active"
  | "fallback"
  | "not_configured"
  | "error"
  | "invalid_output";

export type BrainProvider = "deterministic" | "openai";

export type BrainActionType =
  | "create_reminder"
  | "create_task"
  | "save_document"
  | "save_contract"
  | "review_details";

export type ContractSource =
  | "document-analysis"
  | "manual"
  | "import"
  | "system";

export type ReminderStatus = "open" | "done" | "overdue" | "cancelled";

export type ReminderPriority = "low" | "medium" | "high";

export type ReminderSourceType =
  | "manual"
  | "document-deadline"
  | "contract-deadline"
  | "system";

export interface UserScopedRecord {
  createdAt: ISODateString;
  id: string;
  sourceDocumentId?: string;
  updatedAt: ISODateString;
  userId: string;
}

export interface DocumentFact<Value = string> {
  confidence: FactConfidence;
  key: RequiredFactKey;
  label: string;
  sourceSnippet?: string;
  updatedAt: ISODateString;
  value?: Value;
  verificationStatus: FactVerificationStatus;
}

export type ContractFact<Value = string> = DocumentFact<Value>;

export interface ConfirmedContractFact<Value = string>
  extends DocumentFact<Value> {
  confirmedAt: ISODateString;
  verificationStatus: "user-confirmed" | "user-corrected";
}

export interface ExtractedDocumentFacts {
  category?: ContractCategory;
  createdAt: ISODateString;
  documentId: string;
  documentName?: string;
  facts: Partial<Record<RequiredFactKey, DocumentFact>>;
  updatedAt: ISODateString;
}

export interface VerifiedDocumentFacts {
  contractId?: string;
  documentId?: string;
  facts: Partial<Record<RequiredFactKey, DocumentFact>>;
  updatedAt: ISODateString;
}

export interface MissingFact {
  isRequired: boolean;
  key: RequiredFactKey;
  label: string;
  reason: string;
}

export interface MissingContractFact extends MissingFact {
  source?: ContractSource;
}

export interface BrainSourceEvidence {
  dateIso?: ISODateString;
  field?: string;
  label: string;
  snippet?: string;
}

export interface BrainFinding {
  label: string;
  sourceEvidence?: BrainSourceEvidence;
  value: string;
}

export interface BrainAction {
  explanation: string;
  label: string;
  requiresConfirmation: true;
  sourceEvidence?: BrainSourceEvidence;
  suggestedDate?: ISODateString;
  type: BrainActionType;
}

export interface BrainQuestion {
  id: string;
  label: string;
  placeholder?: string;
  question: string;
  required: boolean;
  sourceEvidence?: BrainSourceEvidence;
}

export interface HiddenDocumentDetail {
  label: string;
  section:
    | "raw_text"
    | "all_dates"
    | "all_facts"
    | "technical"
    | "source_evidence";
  value: string;
}

export interface DocumentBrainInput {
  deterministicDates: DetectedDeadline[];
  deterministicFacts?: ExtractedDocumentFacts;
  extractedText?: string;
  filename?: string;
  locale: "de-DE";
  mimeType?: string;
}

export interface DocumentBrainResult {
  confidence: BrainConfidence;
  hiddenDetails: HiddenDocumentDetail[];
  importantFindings: BrainFinding[];
  intent: DocumentIntent;
  needsUserConfirmation: boolean;
  optionalQuestion?: BrainQuestion;
  primaryButtons: BrainAction[];
  provider: BrainProvider;
  providerStatus: BrainProviderStatus;
  recommendedAction: BrainAction;
  riskLevel: BrainRiskLevel;
  simpleSummary: string;
  sourceEvidence: BrainSourceEvidence[];
  title: string;
}

export interface ManagedPersonProfile {
  id: string;
  label: string;
  type: ManagedPersonProfileType;
}

export interface PaymentSourceReference {
  id: string;
  label: string;
  type: "bank-account" | "card" | "manual" | "unknown";
}

export interface ContractIdentifier {
  customerNumber?: string;
  contractNumber?: string;
  fileNumber?: string;
  invoiceNumber?: string;
  policyNumber?: string;
}

export interface ContractCost {
  amount?: number;
  currency: "EUR";
  interval?: "monthly" | "yearly" | "one-time" | "unknown";
  sourceFactKey?: RequiredFactKey;
}

export interface ContractDates {
  appointmentDate?: ISODateString;
  cancellationDate?: ISODateString;
  contractDate?: ISODateString;
  dueDate?: ISODateString;
  endDate?: ISODateString;
  renewalDate?: ISODateString;
  startDate?: ISODateString;
}

export interface CancellationInfo {
  cancellationDate?: ISODateString;
  cancellationPeriod?: string;
  canPrepareCancellation: boolean;
}

export interface ContractBrainSummary {
  isCancellationDeadlineMissed: boolean;
  isCancellationPossibleNow: boolean;
  isCancellationWindowUpcoming: boolean;
  lifecycleStatus: ContractLifecycleStatus;
  missingFacts: MissingFact[];
  nextImportantDate?: ISODateString;
  recommendedAction: SuggestedContractAction;
}

export interface OfferComparisonIntent {
  category: ContractCategory;
  currentPrice?: number;
  currentProvider?: string;
  neededData: RequiredFactKey[];
  status: "planned" | "missing-data";
}

export interface ContractActionDraft {
  body: string;
  createdAt: ISODateString;
  id: string;
  status: "draft" | "prepared";
  title: string;
  type: "cancellation";
  updatedAt: ISODateString;
}

export interface ContractRecord {
  actionDraft?: ContractActionDraft;
  brain: ContractBrainSummary;
  cancellation: CancellationInfo;
  category: ContractCategory;
  company?: string;
  confirmedFacts?: Partial<Record<RequiredFactKey, ConfirmedContractFact>>;
  cost: ContractCost;
  createdAt: ISODateString;
  dates: ContractDates;
  documentId?: string;
  facts: Partial<Record<RequiredFactKey, DocumentFact>>;
  id: string;
  identifiers: ContractIdentifier;
  lifecycleStatus: ContractLifecycleStatus;
  missingFacts: MissingFact[];
  name: string;
  offerComparisonIntent?: OfferComparisonIntent;
  persistenceStatus?: PersistenceStatus;
  provider?: string;
  relatedPersonProfileId?: string;
  source?: ContractSource;
  sourceDocumentId?: string;
  updatedAt: ISODateString;
  userId?: string;
}

export interface ContractRecordCreateInput {
  category?: ContractCategory;
  company?: string;
  confirmedFacts?: Partial<Record<RequiredFactKey, ConfirmedContractFact>>;
  cost?: Partial<ContractCost>;
  dates?: Partial<ContractDates>;
  facts?: Partial<Record<RequiredFactKey, DocumentFact>>;
  identifiers?: Partial<ContractIdentifier>;
  missingFacts?: MissingContractFact[];
  name?: string;
  provider?: string;
  source?: ContractSource;
  sourceDocumentId?: string;
}

export interface ContractRecordUpdateInput
  extends Partial<ContractRecordCreateInput> {
  actionDraft?: ContractActionDraft;
  lifecycleStatus?: ContractLifecycleStatus;
  persistenceStatus?: PersistenceStatus;
}

export interface LifeGoal {
  id: string;
  title: string;
  area: LifeArea;
  priority: Priority;
  targetDate?: ISODateString;
  progress: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  provider: AuthProvider;
}

export interface AuthSession {
  user: User;
  provider: AuthProvider;
  expiresAt?: ISODateString;
  accessToken?: string;
  loginMethod?: "email" | "google" | "apple" | "development";
}

export interface Reminder {
  id: string;
  title: string;
  dueAt: ISODateString;
  completed: boolean;
  linkedGoalId?: string;
  notes?: string;
  source?: ReminderSource;
  sourceDocumentId?: string;
  sourceLabel?: string;
  sourceOriginalText?: string;
  createdAt?: ISODateString;
  updatedAt?: ISODateString;
}

export interface ReminderRecord extends UserScopedRecord {
  description?: string;
  dueDate: ISODateString;
  priority: ReminderPriority;
  reminderDate?: ISODateString;
  sourceContractId?: string;
  sourceDocumentId?: string;
  sourceType: ReminderSourceType;
  status: ReminderStatus;
  title: string;
}

export interface ReminderCreateInput {
  description?: string;
  dueDate: ISODateString;
  priority?: ReminderPriority;
  reminderDate?: ISODateString;
  sourceContractId?: string;
  sourceDocumentId?: string;
  sourceType?: ReminderSourceType;
  title: string;
}

export interface ReminderUpdateInput {
  description?: string;
  dueDate?: ISODateString;
  priority?: ReminderPriority;
  reminderDate?: ISODateString;
  sourceContractId?: string;
  sourceDocumentId?: string;
  sourceType?: ReminderSourceType;
  status?: ReminderStatus;
  title?: string;
}

export interface CreateReminderInput {
  title: string;
  dueAt: ISODateString;
  notes?: string;
  source?: ReminderSource;
  sourceDocumentId?: string;
  sourceLabel?: string;
  sourceOriginalText?: string;
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
  fileName?: string;
  contentType?: string;
  sizeBytes?: number;
  s3Key?: string;
  uploadStatus?: DocumentUploadStatus;
  autoNamed?: boolean;
  namingConfidence?: FactConfidence;
}

export interface CreateDocumentInput {
  name: string;
  category: DocumentCategory;
  status: DocumentStatus;
  notes?: string;
  fileName?: string;
  contentType?: string;
  sizeBytes?: number;
  autoNamed?: boolean;
  namingConfidence?: FactConfidence;
}

export interface RequestDocumentUploadInput {
  name: string;
  category: DocumentCategory;
  status: DocumentStatus;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  notes?: string;
  autoNamed?: boolean;
  namingConfidence?: FactConfidence;
}

export interface RequestDocumentUploadResult {
  document: Document;
  uploadHeaders: Record<string, string>;
  uploadUrl: string;
}

export interface CompleteDocumentUploadInput {
  documentId: string;
}

export interface CompleteDocumentUploadResult {
  document: Document;
}

export interface ExtractedText {
  confidence: "high" | "medium" | "low";
  extractedAt: ISODateString;
  source: ExtractedTextSource;
  text: string;
}

export interface DetectedDeadline {
  confidence: "high" | "medium" | "low";
  dateIso?: ISODateString;
  kind: DetectedDeadlineKind;
  label: string;
  originalText: string;
}

export interface DetectedDocumentAction {
  confidence: "high" | "medium" | "low";
  dateIso?: ISODateString;
  description: string;
  id: string;
  requiresUserConfirmation: true;
  sourceSnippet: string;
  time?: string;
  title: string;
  type: DetectedDocumentActionType;
}

export interface DocumentAnalysis {
  analyzedAt?: ISODateString;
  contentType?: string;
  detectedActions?: DetectedDocumentAction[];
  detectedDeadlines: DetectedDeadline[];
  documentId: string;
  documentName?: string;
  errorMessage?: string;
  extractedFacts?: ExtractedDocumentFacts;
  extractedText?: ExtractedText;
  fileName?: string;
  status: AnalysisStatus;
  summary?: string;
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

export interface ApiErrorResult {
  error: {
    code: string;
    message: string;
  };
  requestId: string;
  source: "mock" | "aws";
}
