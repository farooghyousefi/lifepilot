import type {
  DetectedDocumentAction,
  DetectedDocumentActionType,
} from "@lifepilot/shared";

import { findGermanDateMatches, formatIsoDateGerman } from "./german-date-service";

const relativeDaysPattern =
  /\binnerhalb\s+von\s+(\d{1,2})\s+tagen\b|\bin\s+(\d{1,2})\s+tagen\b/gi;
const timePattern = /\bum\s+([01]?\d|2[0-3])[:.](\d{2})\s*(?:uhr)?\b/i;

export interface DetectDocumentActionsInput {
  analyzedAt?: string;
  documentName?: string;
  text: string;
}

export function detectDocumentActions({
  analyzedAt,
  documentName,
  text,
}: DetectDocumentActionsInput): DetectedDocumentAction[] {
  const normalizedText = text.replace(/\s+/g, " ").trim();

  if (!normalizedText) {
    return [];
  }

  const absoluteDateActions = findGermanDateMatches(normalizedText).flatMap(
    (match) => {
      const context = getContext(normalizedText, match.index, match.originalText);
      const type = detectActionType(context);
      const startAction = createAction({
        dateIso: match.dateIso,
        documentName,
        idSeed: `${match.index}-${match.dateIso}-${type}`,
        sourceSnippet: context,
        time: extractTime(context),
        type,
      });
      const actions = [startAction];

      if (match.endDateIso) {
        actions.push(
          createAction({
            dateIso: match.endDateIso,
            documentName,
            idSeed: `${match.index}-${match.endDateIso}-response_deadline`,
            sourceSnippet: context,
            time: extractTime(context),
            type: "response_deadline",
          }),
        );
      }

      return actions;
    },
  );
  const relativeActions = detectRelativeDayActions({
    analyzedAt,
    documentName,
    text: normalizedText,
  });

  return dedupeActions([...absoluteDateActions, ...relativeActions]).slice(0, 8);
}

function detectRelativeDayActions({
  analyzedAt,
  documentName,
  text,
}: {
  analyzedAt?: string;
  documentName?: string;
  text: string;
}): DetectedDocumentAction[] {
  const baseDate = analyzedAt ? new Date(analyzedAt) : new Date();
  const actions: DetectedDocumentAction[] = [];

  for (const match of text.matchAll(relativeDaysPattern)) {
    const days = Number(match[1] ?? match[2]);

    if (!Number.isFinite(days) || days <= 0) {
      continue;
    }

    const date = new Date(
      Date.UTC(
        baseDate.getUTCFullYear(),
        baseDate.getUTCMonth(),
        baseDate.getUTCDate() + days,
      ),
    );
    const context = getContext(text, match.index ?? 0, match[0]);

    actions.push(
      createAction({
        confidence: "low",
        dateIso: date.toISOString().slice(0, 10),
        documentName,
        idSeed: `${match.index ?? 0}-${days}-relative`,
        sourceSnippet: context,
        type: detectActionType(context),
      }),
    );
  }

  return actions;
}

function createAction({
  confidence,
  dateIso,
  documentName,
  idSeed,
  sourceSnippet,
  time,
  type,
}: {
  confidence?: DetectedDocumentAction["confidence"];
  dateIso?: string;
  documentName?: string;
  idSeed: string;
  sourceSnippet: string;
  time?: string;
  type: DetectedDocumentActionType;
}): DetectedDocumentAction {
  const title = createTitle(type, documentName);

  return {
    confidence: confidence ?? createConfidence(type, sourceSnippet, time),
    dateIso,
    description: createDescription(type, sourceSnippet),
    id: createStableActionId(idSeed),
    requiresUserConfirmation: true,
    sourceSnippet,
    time,
    title,
    type,
  };
}

function detectActionType(context: string): DetectedDocumentActionType {
  const normalizedContext = context.toLowerCase();

  if (
    includesAny(normalizedContext, [
      "zahlbar bis",
      "zahlung",
      "zahlungsfrist",
      "betrag ist",
      "fällig",
      "faellig",
    ])
  ) {
    return "payment_deadline";
  }

  if (
    includesAny(normalizedContext, [
      "kündigungsfrist",
      "kuendigungsfrist",
      "kündigung muss",
      "kuendigung muss",
      "spätestens bis",
      "spaetestens bis",
    ]) &&
    includesAny(normalizedContext, ["künd", "kuend"])
  ) {
    return "cancellation_deadline";
  }

  if (
    includesAny(normalizedContext, [
      "rückmeldung",
      "rueckmeldung",
      "antwort",
      "senden sie",
      "reichen sie",
      "innerhalb von",
      "spätestens bis",
      "spaetestens bis",
    ])
  ) {
    return "response_deadline";
  }

  if (
    includesAny(normalizedContext, [
      "termin",
      "einladung",
      "eingeladen",
      "erscheinen",
      "bitte erscheinen",
      "vorsprechen",
    ])
  ) {
    return "appointment";
  }

  if (
    includesAny(normalizedContext, [
      "vertrag",
      "vertragsende",
      "laufzeit",
      "verlängerung",
      "verlaengerung",
    ])
  ) {
    return "contract_review";
  }

  return "general_reminder";
}

function createTitle(
  type: DetectedDocumentActionType,
  documentName?: string,
): string {
  const suffix = documentName ? `: ${documentName}` : "";

  if (type === "appointment") {
    return `Termin prüfen${suffix}`;
  }

  if (type === "payment_deadline") {
    return `Zahlungsfrist prüfen${suffix}`;
  }

  if (type === "cancellation_deadline") {
    return `Kündigungsfrist prüfen${suffix}`;
  }

  if (type === "response_deadline") {
    return `Rückmeldung prüfen${suffix}`;
  }

  if (type === "contract_review") {
    return `Vertrag prüfen${suffix}`;
  }

  return `Erinnerung prüfen${suffix}`;
}

function createDescription(
  type: DetectedDocumentActionType,
  sourceSnippet: string,
): string {
  const prefix =
    type === "appointment"
      ? "Möglicher Termin aus Dokument."
      : type === "payment_deadline"
        ? "Mögliche Zahlungsfrist aus Dokument."
        : type === "cancellation_deadline"
          ? "Mögliche Kündigungsfrist aus Dokument."
          : type === "response_deadline"
            ? "Mögliche Rückmeldefrist aus Dokument."
            : type === "contract_review"
              ? "Möglicher Vertrags-Prüftermin aus Dokument."
              : "Mögliche Erinnerung aus Dokument.";

  return `${prefix} Bitte prüfen und bestätigen.\n\nQuelle: ${sourceSnippet}`;
}

function createConfidence(
  type: DetectedDocumentActionType,
  sourceSnippet: string,
  time?: string,
): DetectedDocumentAction["confidence"] {
  if (type === "appointment" && time) {
    return "high";
  }

  if (
    includesAny(sourceSnippet.toLowerCase(), [
      "frist",
      "zahlbar bis",
      "spätestens bis",
      "spaetestens bis",
      "termin",
      "erscheinen",
    ])
  ) {
    return "high";
  }

  return "medium";
}

function extractTime(context: string): string | undefined {
  const match = context.match(timePattern);

  if (!match) {
    return undefined;
  }

  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function getContext(text: string, index: number, value: string): string {
  const start = Math.max(0, index - 90);
  const end = Math.min(text.length, index + value.length + 90);

  return text.slice(start, end).trim();
}

function dedupeActions(
  actions: DetectedDocumentAction[],
): DetectedDocumentAction[] {
  const seen = new Set<string>();

  return actions.filter((action) => {
    const key = `${action.type}-${action.dateIso ?? "no-date"}-${action.time ?? "all-day"}-${action.sourceSnippet}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function createStableActionId(value: string): string {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return `document-action-${hash.toString(16)}`;
}

function includesAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

export function formatActionDateTime(action: DetectedDocumentAction): string {
  if (!action.dateIso) {
    return "Datum prüfen";
  }

  return action.time
    ? `${formatIsoDateGerman(action.dateIso)}, ${action.time} Uhr`
    : formatIsoDateGerman(action.dateIso);
}
