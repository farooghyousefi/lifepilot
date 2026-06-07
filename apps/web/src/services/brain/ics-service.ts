import {
  createIcsCalendar,
  downloadIcsFile,
} from "../documents/ics-calendar-service";
import type { LifeBrainResult } from "./brain-types";

export interface LifeBrainIcsFile {
  content: string;
  fileName: string;
}

export function createLifeBrainIcsFile(result: LifeBrainResult): LifeBrainIcsFile | null {
  const appointment = result.appointments.find(
    (item) => item.shouldGenerateIcs && item.date,
  );

  if (appointment) {
    const summary = withLifePilotPrefix(appointment.title || "Termin wahrnehmen");

    return {
      content: createIcsCalendar({
        alarmMinutesBefore: 60,
        calendarTitle: "LifePilot",
        description: createDescription({
          body: appointment.description,
          result,
          sourceText: result.shortSummary,
        }),
        startDateIso: appointment.date,
        startTime: appointment.time ?? undefined,
        summary,
      }),
      fileName: `${appointment.date}-${summary}`,
    };
  }

  const deadline = result.deadlines.find(
    (item) => item.shouldCreateReminder && item.date,
  );

  if (!deadline) {
    return null;
  }

  const summary = withLifePilotPrefix(deadline.title || "Frist prüfen");

  return {
    content: createIcsCalendar({
      alarmMinutesBefore: 1440,
      calendarTitle: "LifePilot",
      description: createDescription({
        body: deadline.reason,
        result,
        sourceText: deadline.sourceText,
      }),
      startDateIso: deadline.date,
      startTime: deadline.time ?? undefined,
      summary,
    }),
    fileName: `${deadline.date}-${summary}`,
  };
}

export function downloadLifeBrainIcsFile(result: LifeBrainResult): boolean {
  const file = createLifeBrainIcsFile(result);

  if (!file) {
    return false;
  }

  downloadIcsFile({
    content: file.content,
    fileName: file.fileName,
  });

  return true;
}

function createDescription({
  body,
  result,
  sourceText,
}: {
  body: string;
  result: LifeBrainResult;
  sourceText?: string;
}): string {
  return [
    body,
    "",
    `Zusammenfassung: ${result.shortSummary}`,
    sourceText ? `Quelle: ${sourceText}` : undefined,
    "Hinweis: Von LifePilot lokal vorbereitet. Bitte Angaben prüfen.",
  ]
    .filter(Boolean)
    .join("\n");
}

function withLifePilotPrefix(title: string): string {
  return title.startsWith("LifePilot:") ? title : `LifePilot: ${title}`;
}
