import type { BrainActionType, DocumentIntent } from "@lifepilot/shared";

export interface DocumentBrainEvalFixture {
  expectedImportantFindings: string[];
  expectedIntent: DocumentIntent;
  expectedPrimaryAction: BrainActionType;
  extractedText: string;
  fileName: string;
  mustHideFromMainUi: string[];
  title: string;
}

export const documentBrainEvalFixtures: DocumentBrainEvalFixture[] = [
  {
    expectedImportantFindings: [
      "Ende des Arbeitsverhältnisses: 24.02.2026",
      "Arbeitsuchendmeldung innerhalb von 3 Tagen nach Erhalt prüfen",
      "Dokumentdatum: 06.02.2026",
    ],
    expectedIntent: "employment_termination",
    expectedPrimaryAction: "create_reminder",
    extractedText: `
      Berlin, den 06.02.2026
      Kündigung Arbeitsverhältnis
      Hiermit kündigen wir das mit Ihnen bestehende Arbeitsverhältnis
      fristgerecht zum 24.02.2026.
      Bitte melden Sie sich gemäß § 38 SGB III innerhalb von drei Tagen
      nach Erhalt bei der Agentur für Arbeit arbeitsuchend.
      Vertragsbeginn war der 14.11.2025.
    `,
    fileName: "Kuendigung_Arbeitsverhaeltnis_06.02.2026.pdf",
    mustHideFromMainUi: ["14.11.2025", "Vertragsbeginn", "Rohtext"],
    title: "Kündigung Arbeitsverhältnis erkannt",
  },
  {
    expectedImportantFindings: ["Anbieter", "Betrag", "Fälligkeitsdatum prüfen"],
    expectedIntent: "invoice",
    expectedPrimaryAction: "create_reminder",
    extractedText: `
      Vodafone GmbH
      Rechnung für April 2026
      Rechnungsbetrag: 49,99 EUR
      Bitte zahlen Sie den Betrag bis zum 21.04.2026.
    `,
    fileName: "Vodafone_Rechnung_49,99_EUR_21.04.2026.pdf",
    mustHideFromMainUi: ["Kundennummer", "alle erkannten Daten"],
    title: "Rechnung erkannt",
  },
  {
    expectedImportantFindings: ["Anbieter", "Nächstes wichtiges Datum prüfen"],
    expectedIntent: "insurance",
    expectedPrimaryAction: "create_reminder",
    extractedText: `
      Allianz Versicherung
      Hausratversicherung Police 12345
      Vertragslaufzeit bis 31.12.2026.
      Kündigungsfrist drei Monate vor Ablauf.
    `,
    fileName: "Allianz_Hausratversicherung_31.12.2026.pdf",
    mustHideFromMainUi: ["Police 12345", "Rohtext"],
    title: "Versicherung erkannt",
  },
  {
    expectedImportantFindings: ["Absender", "Frist oder Termin prüfen"],
    expectedIntent: "authority_letter",
    expectedPrimaryAction: "create_task",
    extractedText: `
      Jobcenter Berlin
      Bitte reichen Sie die fehlenden Unterlagen bis zum 12.03.2026 ein.
      Ohne Rückmeldung kann die Leistung vorläufig nicht berechnet werden.
    `,
    fileName: "Jobcenter_Unterlagen_bis_12.03.2026.pdf",
    mustHideFromMainUi: ["alle gefundenen Daten", "technische Informationen"],
    title: "Behördenschreiben erkannt",
  },
];
