import {
  findGermanDateMatches,
  formatIsoDateGerman,
} from "../documents/german-date-service";
import type {
  LifeBrainAction,
  LifeBrainActionType,
  LifeBrainAppointment,
  LifeBrainDeadline,
  LifeBrainDetectedAmount,
  LifeBrainDetectedDate,
  LifeBrainDocumentType,
  LifeBrainInput,
  LifeBrainPriority,
  LifeBrainReminder,
  LifeBrainTask,
} from "./brain-types";

const amountPattern =
  /(?:betrag(?:\s+in\s+höhe\s+von)?|summe|forderung|gebühr|miete|abschlag)?\s*(\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})|\d+(?:,\d{2})?)\s*(€|eur|euro)\b/gi;
const timePattern = /\bum\s+([01]?\d|2[0-3])[:.](\d{2})\s*(?:uhr)?\b/i;
const relativeDaysPattern =
  /\binnerhalb\s+von\s+(\d{1,2})\s+tagen\b|\bin\s+(\d{1,2})\s+tagen\b/gi;
const weekdayDeadlinePattern =
  /\b(?:bis|zum|spätestens\s+bis|spaetestens\s+bis)\s+(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)\b/gi;

const weekdayIndex: Record<string, number> = {
  dienstag: 2,
  donnerstag: 4,
  freitag: 5,
  mittwoch: 3,
  montag: 1,
  samstag: 6,
  sonntag: 0,
};

export interface LifeBrainDetectionContext {
  actions: LifeBrainAction[];
  appointments: LifeBrainAppointment[];
  category: string;
  dates: LifeBrainDetectedDate[];
  deadlines: LifeBrainDeadline[];
  documentType: LifeBrainDocumentType;
  organizations: string[];
  people: string[];
  reminders: LifeBrainReminder[];
  tasks: LifeBrainTask[];
}

export function detectLifeBrainDocumentType(input: LifeBrainInput): LifeBrainDocumentType {
  const text = normalize(input.rawText);
  const subject = normalize(input.metadata?.subject ?? "");
  const combined = `${subject} ${text}`;

  if (input.inputType === "conversation") {
    return "conversation";
  }

  if (input.inputType === "email") {
    if (includesAny(combined, ["fw:", "re:", "antwort:", "von:", "gesendet:"])) {
      return "email_thread";
    }

    return "email_request";
  }

  if (input.inputType === "message") {
    return "conversation";
  }

  if (includesAny(combined, ["kontoauszug", "kontostand", "lastschrift", "kartenzahlung", "überweisung", "ueberweisung"])) {
    return "bank_statement";
  }

  if (includesAny(combined, ["jobcenter", "agentur für arbeit", "arbeitsagentur", "arbeitsuchend", "sgb iii", "sgb ii"])) {
    return "jobcenter_or_employment_agency";
  }

  if (includesAny(combined, ["finanzamt", "steuerbescheid", "einspruch"])) {
    return "tax";
  }

  if (includesAny(combined, ["mietvertrag", "miete", "vermieter", "wohnung", "nebenkosten"])) {
    return "rental";
  }

  if (includesAny(combined, ["versicherung", "police", "policennummer", "schadennummer"])) {
    return "insurance";
  }

  if (includesAny(combined, ["mahnung", "zahlungserinnerung", "letzte mahnung"])) {
    return "payment_reminder";
  }

  if (includesAny(combined, ["rechnung", "zahlbar bis", "bitte zahlen", "fällig am", "faellig am"])) {
    return "invoice";
  }

  if (includesAny(combined, ["vertrag", "vertragsbeginn", "laufzeit", "kündigungsfrist", "kuendigungsfrist"])) {
    return "contract";
  }

  if (
    includesAny(combined, ["kündigung", "kuendigung"]) &&
    includesAny(combined, ["arbeitsverhältnis", "hiermit kündige", "fristgerecht kündige"])
  ) {
    return "termination";
  }

  if (includesAny(combined, ["termin", "einladung", "bitte erscheinen", "erscheinen sie", "vorsprache"])) {
    return "appointment_notice";
  }

  if (includesAny(combined, ["widerspruch", "rechtsbehelfsbelehrung", "klage", "anwalt", "gericht", "mahnverfahren"])) {
    return "legal_notice";
  }

  if (includesAny(combined, ["behörde", "amt", "bescheid", "unterlagen einreichen", "nachreichung"])) {
    return "official_letter";
  }

  if (includesAny(combined, ["arzt", "klinik", "krankenkasse", "untersuchung"])) {
    return "medical";
  }

  if (looksLikeEmail(combined)) {
    return "email_request";
  }

  return "unknown";
}

export function detectLifeBrainAmounts(text: string): LifeBrainDetectedAmount[] {
  const normalizedText = text.replace(/\s+/g, " ").trim();
  const amounts: LifeBrainDetectedAmount[] = [];

  for (const match of normalizedText.matchAll(amountPattern)) {
    const rawText = match[0].trim();
    const amount = parseGermanAmount(match[1]);

    amounts.push({
      amount,
      context: getContext(normalizedText, match.index ?? 0, rawText, 90),
      currency: "EUR",
      rawText,
    });
  }

  return dedupeBy(amounts, (amount) => `${amount.amount}-${amount.rawText}`).slice(0, 5);
}

export function detectLifeBrainOrganizations(input: LifeBrainInput): string[] {
  const text = `${input.metadata?.sender ?? ""}\n${input.rawText}`;
  const organizations = [
    "Jobcenter",
    "Agentur für Arbeit",
    "Finanzamt",
    "Bürgeramt",
    "Vodafone",
    "Telekom",
    "Allianz",
    "AXA",
    "Barmer",
    "AOK",
    "Sparkasse",
    "Deutsche Bank",
    "Commerzbank",
    "PayPal",
  ].filter((organization) =>
    text.toLowerCase().includes(organization.toLowerCase()),
  );
  const senderOrganization = extractOrganizationFromSender(input.metadata?.sender);

  return dedupeBy(
    [senderOrganization, ...organizations].filter(Boolean) as string[],
    (organization) => organization.toLowerCase(),
  ).slice(0, 6);
}

export function detectLifeBrainPeople(input: LifeBrainInput): string[] {
  const candidates = [
    input.metadata?.sender,
    input.metadata?.recipient,
    ...Array.from(
      input.rawText.matchAll(/\b(?:Herr|Frau)\s+([A-ZÄÖÜ][a-zäöüß-]+(?:\s+[A-ZÄÖÜ][a-zäöüß-]+)?)\b/g),
    ).map((match) => match[0]),
  ];

  return dedupeBy(
    candidates
      .filter((candidate): candidate is string => Boolean(candidate))
      .map((candidate) => candidate.trim())
      .filter(Boolean),
    (candidate) => candidate.toLowerCase(),
  ).slice(0, 6);
}

export function detectLifeBrainActions(input: LifeBrainInput): LifeBrainDetectionContext {
  const documentType = detectLifeBrainDocumentType(input);
  const amounts = detectLifeBrainAmounts(input.rawText);
  const dates = detectLifeBrainDates(input, documentType);
  const actionableDates = dates.filter((date) => date.isActionable && date.isoDate);
  const actions: LifeBrainAction[] = [];
  const deadlines: LifeBrainDeadline[] = [];
  const appointments: LifeBrainAppointment[] = [];
  const reminders: LifeBrainReminder[] = [];
  const tasks: LifeBrainTask[] = [];
  const text = normalize(input.rawText);

  if (isArchiveOnlyBankStatement(documentType, text)) {
    return {
      actions: [
        createAction({
          description:
            "Der Text wirkt wie ein Kontoauszug ohne klare Aufforderung. Keine Erinnerung nötig.",
          priority: "low",
          title: "Sinnvoll ablegen",
          type: "archive_only",
        }),
      ],
      appointments,
      category: "Finanzen",
      dates,
      deadlines,
      documentType,
      organizations: detectLifeBrainOrganizations(input),
      people: detectLifeBrainPeople(input),
      reminders,
      tasks,
    };
  }

  for (const date of actionableDates) {
    const priority = getPriorityForDate(documentType, date.context);
    const type = getActionTypeForDate(documentType, date.context);
    const title = createActionTitle(type, documentType);
    const description = createActionDescription(type, date.context);

    actions.push(
      createAction({
        description,
        dueDate: date.isoDate,
        priority,
        time: date.time ?? undefined,
        title,
        type,
      }),
    );

    if (type === "attend_appointment") {
      appointments.push({
        date: date.isoDate ?? "",
        description,
        location: extractLocation(date.context),
        shouldGenerateIcs: true,
        time: date.time,
        title,
      });
    } else {
      deadlines.push({
        date: date.isoDate ?? "",
        priority,
        reason: date.reason,
        shouldCreateReminder: true,
        sourceText: date.context,
        time: date.time,
        title,
      });
      reminders.push({
        reason: date.reason,
        remindAt: date.isoDate ?? "",
        title,
      });
    }
  }

  if (
    actions.length === 0 &&
    shouldCreateReplyTaskWithoutDate(documentType, text)
  ) {
    actions.push(
      createAction({
        description:
          "Der Text bittet um eine Antwort oder um Unterlagen, nennt aber kein klares Datum.",
        priority: "medium",
        title: "Antwort oder Unterlagen vorbereiten",
        type: includesAny(text, ["unterlagen", "dokumente", "nachweise"])
          ? "send_document"
          : "reply",
      }),
    );
    tasks.push({
      description: "Antwort prüfen und die angeforderten Informationen vorbereiten.",
      priority: "medium",
      title: "Antwort vorbereiten",
    });
  }

  if (actions.length === 0 && documentType === "invoice" && amounts.length > 0) {
    actions.push(
      createAction({
        description:
          "Es wurde eine Rechnung erkannt, aber keine eindeutige Zahlungsfrist.",
        priority: "medium",
        title: "Rechnung prüfen",
        type: "review_document",
      }),
    );
  }

  if (actions.length === 0) {
    actions.push(
      createAction({
        description:
          "LifePilot hat keine direkte Pflicht oder Frist erkannt.",
        priority: "low",
        title: "Sinnvoll ablegen",
        type: "archive_only",
      }),
    );
  }

  for (const action of actions) {
    if (
      action.type !== "archive_only" &&
      action.type !== "no_action" &&
      !tasks.some((task) => task.title === action.title)
    ) {
      tasks.push({
        description: action.description,
        dueDate: action.dueDate,
        priority: action.priority,
        title: action.title,
      });
    }
  }

  return {
    actions: dedupeBy(actions, (action) => `${action.type}-${action.dueDate ?? ""}-${action.title}`).slice(0, 5),
    appointments: appointments.slice(0, 3),
    category: getCategory(documentType),
    dates,
    deadlines: deadlines.slice(0, 5),
    documentType,
    organizations: detectLifeBrainOrganizations(input),
    people: detectLifeBrainPeople(input),
    reminders: dedupeBy(reminders, (reminder) => `${reminder.title}-${reminder.remindAt}`).slice(0, 5),
    tasks: dedupeBy(tasks, (task) => `${task.title}-${task.dueDate ?? ""}`).slice(0, 5),
  };
}

export function detectLifeBrainDates(
  input: LifeBrainInput,
  documentType: LifeBrainDocumentType,
): LifeBrainDetectedDate[] {
  const text = input.rawText.replace(/\s+/g, " ").trim();
  const dates: LifeBrainDetectedDate[] = [];

  for (const match of findGermanDateMatches(text)) {
    const context = getContext(text, match.index, match.originalText, 100);
    const assessmentContext = getContext(text, match.index, match.originalText, 45);
    const assessment = assessDateContext(documentType, assessmentContext);

    dates.push({
      context,
      isActionable: assessment.isActionable,
      isoDate: match.dateIso,
      rawText: match.originalText,
      reason: assessment.reason,
      time: extractTime(context),
    });

    if (match.endDateIso) {
      const endAssessment = assessDateContext(documentType, assessmentContext);

      dates.push({
        context,
        isActionable: endAssessment.isActionable,
        isoDate: match.endDateIso,
        rawText: match.originalText,
        reason: endAssessment.reason,
        time: extractTime(context),
      });
    }
  }

  for (const relativeDate of detectRelativeDates(input, documentType, text)) {
    dates.push(relativeDate);
  }

  return dedupeBy(
    dates,
    (date) => `${date.isoDate ?? "unknown"}-${date.rawText}-${date.reason}`,
  ).slice(0, 12);
}

function detectRelativeDates(
  input: LifeBrainInput,
  documentType: LifeBrainDocumentType,
  text: string,
): LifeBrainDetectedDate[] {
  const dates: LifeBrainDetectedDate[] = [];
  const baseDate = getBaseDate(input);

  for (const match of text.matchAll(relativeDaysPattern)) {
    const days = Number(match[1] ?? match[2]);

    if (!Number.isFinite(days) || days <= 0) {
      continue;
    }

    const isoDate = addDays(baseDate, days);
    const context = getContext(text, match.index ?? 0, match[0], 100);
    const assessment = assessDateContext(documentType, context);

    dates.push({
      context,
      isActionable: assessment.isActionable,
      isoDate,
      rawText: match[0],
      reason: assessment.reason,
      time: extractTime(context),
    });
  }

  for (const match of text.matchAll(weekdayDeadlinePattern)) {
    const weekday = match[1].toLowerCase();
    const isoDate = getNextWeekday(baseDate, weekdayIndex[weekday]);
    const context = getContext(text, match.index ?? 0, match[0], 100);
    const assessment = assessDateContext(documentType, context);

    dates.push({
      context,
      isActionable: assessment.isActionable,
      isoDate,
      rawText: match[0],
      reason: assessment.reason,
      time: extractTime(context),
    });
  }

  return dates;
}

function assessDateContext(
  documentType: LifeBrainDocumentType,
  context: string,
): { isActionable: boolean; reason: string } {
  const normalizedContext = normalize(context);

  if (documentType === "bank_statement" && !hasBankStatementActionPhrase(normalizedContext)) {
    return {
      isActionable: false,
      reason: "Kontoauszugsdatum oder Buchungsdatum, keine klare Handlung.",
    };
  }

  if (includesAny(normalizedContext, ["vertragsbeginn", "beginn ist", "startdatum"])) {
    return {
      isActionable: false,
      reason: "Kontextdatum zum Vertragsbeginn, keine Frist.",
    };
  }

  if (
    includesAny(normalizedContext, [
      "kündigung",
      "kuendigung",
      "kündigungsfrist",
      "kuendigungsfrist",
      "muss bis",
    ])
  ) {
    return {
      isActionable: true,
      reason: "Klare Kündigungsfrist oder Vertragsfrist.",
    };
  }

  if (
    includesAny(normalizedContext, [
      "zahlbar bis",
      "bitte zahlen",
      "zahlung bis",
      "spätestens bis",
      "spaetestens bis",
      "fällig am",
      "faellig am",
    ]) &&
    includesAny(normalizedContext, ["zahlung", "betrag", "rechnung", "offen", "eur", "€", "fällig", "faellig"])
  ) {
    return {
      isActionable: true,
      reason: "Klare Zahlungsfrist.",
    };
  }

  if (
    includesAny(normalizedContext, [
      "widerspruch",
      "einspruch",
      "unterlagen",
      "nachreichung",
      "rückmeldung",
      "rueckmeldung",
      "bitte senden",
      "senden sie",
      "einreichen",
      "reichen sie",
      "bis freitag",
      "innerhalb von",
    ])
  ) {
    return {
      isActionable: true,
      reason: "Klare Bitte um Antwort, Unterlagen oder Rückmeldung.",
    };
  }

  if (
    includesAny(normalizedContext, [
      "termin",
      "einladung",
      "eingeladen",
      "erscheinen",
      "geschäftsstelle",
      "geschaeftsstelle",
      "vorsprache",
    ])
  ) {
    return {
      isActionable: true,
      reason: "Klare Terminankündigung.",
    };
  }

  if (
    includesAny(normalizedContext, [
      "frist",
      "spätestens",
      "spaetestens",
      "bis zum",
      "bis spätestens",
      "bis spaetestens",
    ])
  ) {
    return {
      isActionable: true,
      reason: "Fristformulierung erkannt, bitte prüfen.",
    };
  }

  return {
    isActionable: false,
    reason: "Kontextdatum ohne klare Handlung.",
  };
}

function getActionTypeForDate(
  documentType: LifeBrainDocumentType,
  context: string,
): LifeBrainActionType {
  const normalizedContext = normalize(context);

  if (includesAny(normalizedContext, ["termin", "erscheinen", "eingeladen", "vorsprache", "geschäftsstelle", "geschaeftsstelle"])) {
    return "attend_appointment";
  }

  if (includesAny(normalizedContext, ["kündigung", "kuendigung", "kündigungsfrist", "kuendigungsfrist"])) {
    return "cancel_contract";
  }

  if (
    documentType === "invoice" ||
    documentType === "payment_reminder" ||
    includesAny(normalizedContext, ["zahlung", "zahlbar", "fällig", "faellig", "betrag"])
  ) {
    return "pay";
  }

  if (includesAny(normalizedContext, ["unterlagen", "dokumente", "nachweise", "einreichen", "senden sie", "bitte senden"])) {
    return "send_document";
  }

  if (documentType === "email_request" || includesAny(normalizedContext, ["rückmeldung", "rueckmeldung", "antwort"])) {
    return "reply";
  }

  return "create_reminder";
}

function getPriorityForDate(
  documentType: LifeBrainDocumentType,
  context: string,
): LifeBrainPriority {
  const normalizedContext = normalize(context);

  if (
    includesAny(normalizedContext, ["gericht", "mahnung", "letzte mahnung", "vollstreckung", "widerspruch", "einspruch"]) ||
    documentType === "legal_notice"
  ) {
    return "critical";
  }

  if (
    includesAny(normalizedContext, ["jobcenter", "agentur für arbeit", "finanzamt", "behörde", "amt", "kündigung", "kuendigung"]) ||
    documentType === "official_letter" ||
    documentType === "jobcenter_or_employment_agency"
  ) {
    return "high";
  }

  if (includesAny(normalizedContext, ["zahlbar", "fällig", "faellig", "termin", "unterlagen"])) {
    return "medium";
  }

  return "low";
}

function createAction({
  description,
  dueDate,
  priority,
  time,
  title,
  type,
}: {
  description: string;
  dueDate?: string | null;
  priority: LifeBrainPriority;
  time?: string | null;
  title: string;
  type: LifeBrainActionType;
}): LifeBrainAction {
  return {
    description,
    dueDate,
    id: `life-action-${stableHash(`${type}-${title}-${dueDate ?? ""}-${description}`)}`,
    priority,
    requiresConfirmation: type !== "archive_only" && type !== "no_action",
    time,
    title,
    type,
  };
}

function createActionTitle(
  type: LifeBrainActionType,
  documentType: LifeBrainDocumentType,
): string {
  if (type === "pay") {
    return "Zahlungsfrist prüfen";
  }

  if (type === "attend_appointment") {
    return "Termin wahrnehmen";
  }

  if (type === "cancel_contract") {
    return "Kündigungsfrist prüfen";
  }

  if (type === "send_document") {
    return "Unterlagen einreichen";
  }

  if (type === "reply") {
    return "Antwort vorbereiten";
  }

  if (documentType === "official_letter") {
    return "Behördenschreiben prüfen";
  }

  return "Erinnerung prüfen";
}

function createActionDescription(type: LifeBrainActionType, context: string): string {
  if (type === "pay") {
    return "Es gibt eine Zahlungsfrist. Prüfe Betrag und Empfänger, bevor du zahlst.";
  }

  if (type === "attend_appointment") {
    return "Es gibt einen Termin. Prüfe Ort, Uhrzeit und ob du Unterlagen mitnehmen musst.";
  }

  if (type === "cancel_contract") {
    return "Es gibt eine mögliche Kündigungsfrist. Bitte Vertrag und Frist bestätigen.";
  }

  if (type === "send_document") {
    return "Es werden Unterlagen oder Informationen angefordert. Bitte vor dem Senden prüfen.";
  }

  if (type === "reply") {
    return "Eine Rückmeldung scheint sinnvoll oder erforderlich. Bitte Antwort vor dem Senden prüfen.";
  }

  return `Bitte prüfen: ${context}`;
}

function isArchiveOnlyBankStatement(
  documentType: LifeBrainDocumentType,
  text: string,
): boolean {
  return documentType === "bank_statement" && !hasBankStatementActionPhrase(text);
}

function hasBankStatementActionPhrase(text: string): boolean {
  return includesAny(text, [
    "überziehung",
    "ueberziehung",
    "dispo",
    "zahlung fehlgeschlagen",
    "lastschrift konnte nicht",
    "gesperrt",
    "rücklastschrift",
    "ruecklastschrift",
    "mahnen",
    "frist",
    "zahlbar bis",
    "bitte zahlen",
    "rechtliche schritte",
  ]);
}

function shouldCreateReplyTaskWithoutDate(
  documentType: LifeBrainDocumentType,
  text: string,
): boolean {
  return (
    documentType === "email_request" ||
    documentType === "email_thread" ||
    includesAny(text, [
      "bitte senden",
      "bitte schicken",
      "antworten sie",
      "rückmeldung",
      "rueckmeldung",
      "unterlagen",
      "dokumente",
    ])
  );
}

function getCategory(documentType: LifeBrainDocumentType): string {
  if (["invoice", "payment_reminder", "bank_statement", "tax"].includes(documentType)) {
    return "Finanzen";
  }

  if (["contract", "termination", "insurance"].includes(documentType)) {
    return "Verträge";
  }

  if (["official_letter", "jobcenter_or_employment_agency", "legal_notice"].includes(documentType)) {
    return "Behörde & Recht";
  }

  if (["email_request", "email_thread", "conversation"].includes(documentType)) {
    return "Kommunikation";
  }

  if (documentType === "rental") {
    return "Wohnen";
  }

  if (documentType === "medical") {
    return "Gesundheit";
  }

  return "Allgemein";
}

function extractTime(context: string): string | null {
  const match = context.match(timePattern);

  return match ? `${match[1].padStart(2, "0")}:${match[2]}` : null;
}

function extractLocation(context: string): string | null {
  const match = context.match(/\bin\s+(?:unserer\s+)?([^.,;]{4,80})/i);

  return match?.[1]?.trim() ?? null;
}

function extractOrganizationFromSender(sender?: string): string | undefined {
  if (!sender) {
    return undefined;
  }

  const cleaned = sender.replace(/<[^>]+>/g, "").trim();

  return cleaned || undefined;
}

function looksLikeEmail(text: string): boolean {
  return includesAny(text, [
    "betreff:",
    "subject:",
    "von:",
    "gesendet:",
    "to:",
    "cc:",
    "re:",
    "fw:",
  ]);
}

function parseGermanAmount(value: string): number | null {
  const parsed = Number(value.replace(/\s/g, "").replace(/\./g, "").replace(",", "."));

  return Number.isFinite(parsed) ? parsed : null;
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function includesAny(text: string, needles: string[]): boolean {
  return needles.some((needle) => text.includes(needle));
}

function getContext(text: string, index: number, value: string, padding: number): string {
  const start = Math.max(0, index - padding);
  const end = Math.min(text.length, index + value.length + padding);

  return text.slice(start, end).trim();
}

function getBaseDate(input: LifeBrainInput): Date {
  const candidate = input.metadata?.receivedAt
    ? new Date(input.metadata.receivedAt)
    : new Date();

  if (Number.isNaN(candidate.getTime())) {
    return new Date();
  }

  return candidate;
}

function addDays(date: Date, days: number): string {
  const nextDate = new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate() + days,
    ),
  );

  return nextDate.toISOString().slice(0, 10);
}

function getNextWeekday(date: Date, targetWeekday: number): string {
  const currentWeekday = date.getUTCDay();
  const delta = (targetWeekday - currentWeekday + 7) % 7 || 7;

  return addDays(date, delta);
}

function dedupeBy<T>(items: T[], getKey: (item: T) => string): T[] {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = getKey(item);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function stableHash(value: string): string {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash.toString(16);
}

export { formatIsoDateGerman };
