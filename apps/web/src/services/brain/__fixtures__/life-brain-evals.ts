import type { LifeBrainInput, LifeBrainResult } from "../brain-types";

export interface LifeBrainEvalCase {
  expected: {
    actionType?: LifeBrainResult["actions"][number]["type"];
    documentType: LifeBrainResult["documentType"];
    shouldArchiveOnly: boolean;
    shouldGenerateIcs: boolean;
  };
  input: LifeBrainInput;
  name: string;
}

export const lifeBrainEvalCases: LifeBrainEvalCase[] = [
  {
    expected: {
      actionType: "pay",
      documentType: "invoice",
      shouldArchiveOnly: false,
      shouldGenerateIcs: true,
    },
    input: {
      inputType: "document",
      rawText:
        "Sehr geehrter Herr Yousefi, bitte zahlen Sie den offenen Betrag in Höhe von 129,04 EUR bis spätestens 21.04.2025.",
      source: "pasted_text",
    },
    name: "invoice payment deadline",
  },
  {
    expected: {
      actionType: "attend_appointment",
      documentType: "appointment_notice",
      shouldArchiveOnly: false,
      shouldGenerateIcs: true,
    },
    input: {
      inputType: "document",
      rawText:
        "Bitte erscheinen Sie am 17.04.2025 um 10:30 Uhr in unserer Geschäftsstelle.",
      source: "pasted_text",
    },
    name: "appointment notice",
  },
  {
    expected: {
      actionType: "cancel_contract",
      documentType: "contract",
      shouldArchiveOnly: false,
      shouldGenerateIcs: true,
    },
    input: {
      inputType: "document",
      rawText:
        "Vertragsbeginn ist der 01.08.2024. Die Laufzeit beträgt 24 Monate. Die Kündigung muss bis spätestens 30.07.2026 eingehen.",
      source: "pasted_text",
    },
    name: "contract cancellation deadline",
  },
  {
    expected: {
      actionType: "archive_only",
      documentType: "bank_statement",
      shouldArchiveOnly: true,
      shouldGenerateIcs: false,
    },
    input: {
      inputType: "document",
      rawText:
        "Kontostand am 01.01.2026. 02.01.2026 Überweisung. 03.01.2026 Lastschrift. 04.01.2026 Kartenzahlung.",
      source: "pasted_text",
    },
    name: "bank statement false positive prevention",
  },
  {
    expected: {
      actionType: "send_document",
      documentType: "email_request",
      shouldArchiveOnly: false,
      shouldGenerateIcs: true,
    },
    input: {
      inputType: "email",
      metadata: {
        receivedAt: "2026-06-07T12:00:00.000Z",
      },
      rawText:
        "Hallo Herr Yousefi, bitte senden Sie uns die fehlenden Unterlagen bis Freitag zu. Danach können wir Ihren Antrag weiter bearbeiten.",
      source: "pasted_text",
    },
    name: "email requested documents deadline",
  },
];
