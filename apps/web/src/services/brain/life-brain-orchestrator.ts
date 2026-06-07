import { createLifeBrainFallbackResult } from "./brain-fallback-service";
import {
  defaultLifeBrainUserPreferences,
  lifeBrainVersion,
  type LifeBrainAction,
  type LifeBrainActionType,
  type LifeBrainAppointment,
  type LifeBrainDetectedAmount,
  type LifeBrainDetectedDate,
  type LifeBrainDetectedLanguage,
  type LifeBrainDocumentType,
  type LifeBrainInput,
  type LifeBrainInputType,
  type LifeBrainPriority,
  type LifeBrainRecommendedNextStep,
  type LifeBrainReminder,
  type LifeBrainResult,
  type LifeBrainRiskLevel,
  type LifeBrainSource,
  type LifeBrainTask,
  type LifeBrainUrgency,
} from "./brain-types";

const inputTypes: LifeBrainInputType[] = [
  "document",
  "email",
  "message",
  "conversation",
  "manual_note",
  "uploaded_file",
];
const sources: LifeBrainSource[] = [
  "pasted_text",
  "uploaded_file",
  "future_email_connector",
  "future_calendar_connector",
];
const documentTypes: LifeBrainDocumentType[] = [
  "invoice",
  "contract",
  "termination",
  "bank_statement",
  "official_letter",
  "appointment_notice",
  "payment_reminder",
  "insurance",
  "jobcenter_or_employment_agency",
  "tax",
  "rental",
  "medical",
  "legal_notice",
  "email_request",
  "email_thread",
  "conversation",
  "unknown",
];
const actionTypes: LifeBrainActionType[] = [
  "pay",
  "reply",
  "attend_appointment",
  "cancel_contract",
  "create_reminder",
  "create_task",
  "review_document",
  "provide_missing_info",
  "archive_only",
  "call_someone",
  "send_document",
  "wait",
  "no_action",
];
const priorities: LifeBrainPriority[] = ["low", "medium", "high", "critical"];
const urgencyLevels: LifeBrainUrgency[] = [
  "none",
  "low",
  "medium",
  "high",
  "critical",
];
const riskLevels: LifeBrainRiskLevel[] = [
  "none",
  "low",
  "medium",
  "high",
  "critical",
];
const languageValues: LifeBrainDetectedLanguage[] = ["de", "en", "unknown"];
const analysisModes = ["openai", "fallback"] as const;

export function analyzeLifeBrainLocally(input: LifeBrainInput): LifeBrainResult {
  return createLifeBrainFallbackResult(normalizeLifeBrainInput(input));
}

export function normalizeLifeBrainInput(value: unknown): LifeBrainInput {
  const candidate = isRecord(value) ? value : {};
  const metadata = isRecord(candidate.metadata) ? candidate.metadata : {};
  const userPreferences = isRecord(candidate.userPreferences)
    ? candidate.userPreferences
    : {};

  return {
    inputType: isOneOf(candidate.inputType, inputTypes)
      ? candidate.inputType
      : "manual_note",
    metadata: {
      fileName: asString(metadata.fileName, 300),
      receivedAt: asString(metadata.receivedAt, 80),
      recipient: asString(metadata.recipient, 300),
      sender: asString(metadata.sender, 300),
      subject: asString(metadata.subject, 300),
      userLocale: asString(metadata.userLocale, 40) ?? "de-DE",
      userTimezone: asString(metadata.userTimezone, 80) ?? "Europe/Berlin",
    },
    rawText: asString(candidate.rawText, 40_000) ?? "",
    source: isOneOf(candidate.source, sources) ? candidate.source : "pasted_text",
    userPreferences: {
      archiveBankStatementsByDefault: asBoolean(
        userPreferences.archiveBankStatementsByDefault,
        defaultLifeBrainUserPreferences.archiveBankStatementsByDefault,
      ),
      askBeforeCreatingReminder: asBoolean(
        userPreferences.askBeforeCreatingReminder,
        defaultLifeBrainUserPreferences.askBeforeCreatingReminder,
      ),
      generateReplyDraftsForEmails: asBoolean(
        userPreferences.generateReplyDraftsForEmails,
        defaultLifeBrainUserPreferences.generateReplyDraftsForEmails,
      ),
      officialLettersHighPriority: asBoolean(
        userPreferences.officialLettersHighPriority,
        defaultLifeBrainUserPreferences.officialLettersHighPriority,
      ),
      paymentReminderDaysBefore: asNumber(
        userPreferences.paymentReminderDaysBefore,
        defaultLifeBrainUserPreferences.paymentReminderDaysBefore,
      ),
      requireConfirmationForUnclearDeadlines: asBoolean(
        userPreferences.requireConfirmationForUnclearDeadlines,
        defaultLifeBrainUserPreferences.requireConfirmationForUnclearDeadlines,
      ),
    },
  };
}

export function isValidLifeBrainResultCandidate(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.title === "string" &&
    typeof value.shortSummary === "string" &&
    typeof value.userFriendlyExplanation === "string" &&
    isOneOf(value.documentType, documentTypes) &&
    Array.isArray(value.actions) &&
    Array.isArray(value.deadlines) &&
    Array.isArray(value.appointments) &&
    isRecord(value.recommendedNextStep)
  );
}

export function sanitizeLifeBrainResult(
  value: unknown,
  fallback: LifeBrainResult,
): LifeBrainResult {
  const candidate = isRecord(value) ? value : {};
  const actions = asArray(candidate.actions).map(sanitizeAction).slice(0, 8);
  const deadlines = asArray(candidate.deadlines)
    .map(sanitizeDeadline)
    .filter((deadline): deadline is LifeBrainResult["deadlines"][number] =>
      Boolean(deadline),
    )
    .slice(0, 8);
  const appointments = asArray(candidate.appointments)
    .map(sanitizeAppointment)
    .filter((appointment): appointment is LifeBrainAppointment =>
      Boolean(appointment),
    )
    .slice(0, 5);
  const tasks = asArray(candidate.tasks).map(sanitizeTask).slice(0, 8);
  const reminders = asArray(candidate.reminders)
    .map(sanitizeReminder)
    .filter((reminder): reminder is LifeBrainReminder => Boolean(reminder))
    .slice(0, 8);

  return {
    actions: actions.length > 0 ? actions : fallback.actions,
    analysisMode: isOneOf(candidate.analysisMode, analysisModes)
      ? candidate.analysisMode
      : fallback.analysisMode,
    appointments,
    brainVersion: lifeBrainVersion,
    category: asString(candidate.category, 120) ?? fallback.category,
    clarificationQuestion:
      asString(candidate.clarificationQuestion, 400) ??
      fallback.clarificationQuestion ??
      null,
    confidence: clamp(asNumber(candidate.confidence, fallback.confidence), 0, 1),
    deadlines,
    detectedAmounts: asArray(candidate.detectedAmounts)
      .map(sanitizeAmount)
      .slice(0, 8),
    detectedDates: asArray(candidate.detectedDates)
      .map(sanitizeDate)
      .slice(0, 16),
    detectedLanguage: isOneOf(candidate.detectedLanguage, languageValues)
      ? candidate.detectedLanguage
      : fallback.detectedLanguage,
    detectedOrganizations: asStringArray(candidate.detectedOrganizations, 8),
    detectedPeople: asStringArray(candidate.detectedPeople, 8),
    documentType: isOneOf(candidate.documentType, documentTypes)
      ? candidate.documentType
      : fallback.documentType,
    importantFacts: asArray(candidate.importantFacts)
      .map(sanitizeImportantFact)
      .slice(0, 6),
    fallbackReason: asString(candidate.fallbackReason, 300) ?? fallback.fallbackReason,
    inputType: asString(candidate.inputType, 80) ?? fallback.inputType,
    modelUsed: asString(candidate.modelUsed, 120) ?? fallback.modelUsed,
    rawDetailsCollapsed: true,
    recommendedNextStep: sanitizeRecommendedNextStep(
      candidate.recommendedNextStep,
      fallback.recommendedNextStep,
    ),
    reminders,
    requiresUserConfirmation:
      typeof candidate.requiresUserConfirmation === "boolean"
        ? candidate.requiresUserConfirmation
        : fallback.requiresUserConfirmation,
    riskLevel: isOneOf(candidate.riskLevel, riskLevels)
      ? candidate.riskLevel
      : fallback.riskLevel,
    shouldArchiveOnly: asBoolean(
      candidate.shouldArchiveOnly,
      fallback.shouldArchiveOnly,
    ),
    shouldCreateReminder: asBoolean(
      candidate.shouldCreateReminder,
      fallback.shouldCreateReminder,
    ),
    shouldCreateTask: asBoolean(candidate.shouldCreateTask, fallback.shouldCreateTask),
    shouldGenerateIcs: asBoolean(
      candidate.shouldGenerateIcs,
      fallback.shouldGenerateIcs,
    ),
    shortSummary: asString(candidate.shortSummary, 700) ?? fallback.shortSummary,
    source: asString(candidate.source, 80) ?? fallback.source,
    suggestedReply: sanitizeSuggestedReply(candidate.suggestedReply),
    tasks,
    title: asString(candidate.title, 160) ?? fallback.title,
    urgency: isOneOf(candidate.urgency, urgencyLevels)
      ? candidate.urgency
      : fallback.urgency,
    userFriendlyExplanation:
      asString(candidate.userFriendlyExplanation, 1200) ??
      fallback.userFriendlyExplanation,
  };
}

function sanitizeAction(value: unknown): LifeBrainAction {
  const candidate = isRecord(value) ? value : {};
  const type = isOneOf(candidate.type, actionTypes) ? candidate.type : "review_document";
  const priority = isOneOf(candidate.priority, priorities)
    ? candidate.priority
    : "medium";
  const title = asString(candidate.title, 180) ?? "Inhalt prüfen";

  return {
    description:
      asString(candidate.description, 900) ??
      "Bitte prüfe diese erkannte Handlung.",
    dueDate: asString(candidate.dueDate, 40) ?? null,
    id: asString(candidate.id, 120) ?? `life-action-${stableHash(title)}`,
    priority,
    requiresConfirmation:
      typeof candidate.requiresConfirmation === "boolean"
        ? candidate.requiresConfirmation
        : type !== "archive_only" && type !== "no_action",
    time: asString(candidate.time, 20) ?? null,
    title,
    type,
  };
}

function sanitizeDeadline(value: unknown): LifeBrainResult["deadlines"][number] | null {
  const candidate = isRecord(value) ? value : {};
  const date = asString(candidate.date, 40);

  if (!date) {
    return null;
  }

  return {
    date,
    priority: isOneOf(candidate.priority, priorities)
      ? candidate.priority
      : "medium",
    reason: asString(candidate.reason, 500) ?? "Frist erkannt.",
    shouldCreateReminder: asBoolean(candidate.shouldCreateReminder, true),
    sourceText: asString(candidate.sourceText, 700) ?? "",
    time: asString(candidate.time, 20) ?? null,
    title: asString(candidate.title, 180) ?? "Frist prüfen",
  };
}

function sanitizeAppointment(value: unknown): LifeBrainAppointment | null {
  const candidate = isRecord(value) ? value : {};
  const date = asString(candidate.date, 40);

  if (!date) {
    return null;
  }

  return {
    date,
    description:
      asString(candidate.description, 700) ?? "Termin aus dem Text erkannt.",
    location: asString(candidate.location, 180) ?? null,
    shouldGenerateIcs: asBoolean(candidate.shouldGenerateIcs, true),
    time: asString(candidate.time, 20) ?? null,
    title: asString(candidate.title, 180) ?? "Termin wahrnehmen",
  };
}

function sanitizeReminder(value: unknown): LifeBrainReminder | null {
  const candidate = isRecord(value) ? value : {};
  const remindAt = asString(candidate.remindAt, 40);

  if (!remindAt) {
    return null;
  }

  return {
    reason: asString(candidate.reason, 500) ?? "Erinnerung aus LifePilot Brain.",
    remindAt,
    title: asString(candidate.title, 180) ?? "Erinnerung prüfen",
  };
}

function sanitizeTask(value: unknown): LifeBrainTask {
  const candidate = isRecord(value) ? value : {};

  return {
    description:
      asString(candidate.description, 700) ?? "Aufgabe aus LifePilot Brain.",
    dueDate: asString(candidate.dueDate, 40) ?? null,
    priority: isOneOf(candidate.priority, priorities)
      ? candidate.priority
      : "medium",
    title: asString(candidate.title, 180) ?? "Aufgabe prüfen",
  };
}

function sanitizeAmount(value: unknown): LifeBrainDetectedAmount {
  const candidate = isRecord(value) ? value : {};

  return {
    amount:
      typeof candidate.amount === "number" && Number.isFinite(candidate.amount)
        ? candidate.amount
        : null,
    context: asString(candidate.context, 700) ?? "",
    currency: asString(candidate.currency, 20) ?? "EUR",
    rawText: asString(candidate.rawText, 120) ?? "",
  };
}

function sanitizeDate(value: unknown): LifeBrainDetectedDate {
  const candidate = isRecord(value) ? value : {};

  return {
    context: asString(candidate.context, 700) ?? "",
    isActionable: asBoolean(candidate.isActionable, false),
    isoDate: asString(candidate.isoDate, 40) ?? null,
    rawText: asString(candidate.rawText, 120) ?? "",
    reason: asString(candidate.reason, 500) ?? "Datum erkannt.",
    time: asString(candidate.time, 20) ?? null,
  };
}

function sanitizeImportantFact(value: unknown): LifeBrainResult["importantFacts"][number] {
  const candidate = isRecord(value) ? value : {};

  return {
    importance: isOneOf(candidate.importance, ["low", "medium", "high"] as const)
      ? candidate.importance
      : "medium",
    label: asString(candidate.label, 120) ?? "Hinweis",
    value: asString(candidate.value, 300) ?? "",
  };
}

function sanitizeRecommendedNextStep(
  value: unknown,
  fallback: LifeBrainRecommendedNextStep,
): LifeBrainRecommendedNextStep {
  const candidate = isRecord(value) ? value : {};

  return {
    actionType: asString(candidate.actionType, 100) ?? fallback.actionType,
    description: asString(candidate.description, 700) ?? fallback.description,
    title: asString(candidate.title, 180) ?? fallback.title,
  };
}

function sanitizeSuggestedReply(value: unknown): LifeBrainResult["suggestedReply"] {
  if (!isRecord(value)) {
    return null;
  }

  const body = asString(value.body, 4_000);

  if (!body) {
    return null;
  }

  return {
    body,
    subject: asString(value.subject, 300),
    tone: isOneOf(value.tone, ["formal", "neutral", "friendly"] as const)
      ? value.tone
      : "formal",
  };
}

function asString(value: unknown, maxLength: number): string | undefined {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, maxLength)
    : undefined;
}

function asStringArray(value: unknown, maxItems: number): string[] {
  return asArray(value)
    .map((item) => asString(item, 180))
    .filter((item): item is string => Boolean(item))
    .slice(0, maxItems);
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isOneOf<const T extends readonly string[]>(
  value: unknown,
  values: T,
): value is T[number] {
  return typeof value === "string" && values.includes(value);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function stableHash(value: string): string {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash.toString(16);
}
