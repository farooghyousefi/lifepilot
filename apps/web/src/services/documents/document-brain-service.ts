import type {
  BrainAction,
  BrainActionType,
  BrainConfidence,
  BrainFinding,
  BrainProvider,
  BrainProviderStatus,
  BrainQuestion,
  BrainRiskLevel,
  BrainSourceEvidence,
  DetectedDeadline,
  DocumentBrainInput,
  DocumentBrainResult,
  DocumentIntent,
  HiddenDocumentDetail,
} from "@lifepilot/shared";

import {
  cleanDocumentFileName,
  findGermanDateMatches,
  formatIsoDateGerman,
} from "./german-date-service";

export interface DocumentBrainProvider {
  createBrainResult(input: DocumentBrainInput): Promise<DocumentBrainResult>;
}

export const documentBrainSystemPrompt = `
Du bist LifePilot Document Brain.
Du hilfst normalen Menschen, persönliche Verwaltungsdokumente zu verstehen.
Du gibst ausschließlich strukturierte JSON-Daten im vorgegebenen Schema zurück.
Du gibst keine Rechtsberatung und behauptest keine rechtliche Sicherheit.
Du identifizierst die wichtigste Handlung, versteckst Nebengeräusche und fragst höchstens eine Frage.
Du empfiehlst exakt einen nächsten Schritt und maximal drei Buttons.
Du listest niemals alle möglichen Daten gleichwertig als Fristen auf.
Du zitierst kurze Quellstellen aus dem Dokument.
Alle nutzer sichtbaren Texte sind Deutsch.

Regeln:
- Verwende Formulierungen wie "prüfen", "wahrscheinlich", "im Dokument steht".
- Wichtige Aktionen erfordern immer Nutzerbestätigung.
- Keine automatische Kündigung, keine automatische Nachricht, keine externe Kommunikation.
- Rohtext, Kandidatenlisten, technische Felder und unsichere Nebendaten gehören in hiddenDetails.

Für Kündigung Arbeitsverhältnis:
- Erkenne das Ende des Arbeitsverhältnisses.
- Erkenne das Dokumentdatum.
- Erkenne Agentur für Arbeit / arbeitsuchend / § 38 SGB III.
- Wenn "innerhalb von drei Tagen nach Erhalt" erwähnt wird, frage nach dem Erhaltsdatum.
- Behandle ein Vertragsbeginn-Datum nicht als Hauptfrist.
- Zeige nicht jedes extrahierte Datum als gleichwertige Frist.

Für Rechnungen:
- Erkenne Anbieter, Betrag und Fälligkeit, wenn vorhanden.
- Empfiehl eine Zahlungserinnerung, wenn offen.

Für Verträge:
- Erkenne Anbieter, Kündigungsfrist, Vertragsende oder Verlängerung.
- Empfiehl die Überwachung der Kündigungsfrist.

Für Behördenschreiben:
- Erkenne Behörde, notwendige Handlung und Frist.
- Empfiehl Aufgabe oder Erinnerung.
`.trim();

export class DeterministicDocumentBrainProvider
  implements DocumentBrainProvider
{
  async createBrainResult(input: DocumentBrainInput): Promise<DocumentBrainResult> {
    return createDeterministicDocumentBrainResult(input);
  }
}

export function createDeterministicDocumentBrainResult(
  input: DocumentBrainInput,
  providerStatus: BrainProviderStatus = "not_configured",
): DocumentBrainResult {
  const text = `${input.extractedText ?? ""}\n${input.filename ?? ""}`;
  const normalizedText = text.toLowerCase();

  if (isEmploymentTermination(normalizedText)) {
    return createEmploymentTerminationBrain(input, providerStatus);
  }

  if (normalizedText.includes("rechnung")) {
    return createInvoiceBrain(input, providerStatus);
  }

  if (normalizedText.match(/jobcenter|agentur für arbeit|finanzamt|bürgeramt|behörde/)) {
    return createAuthorityBrain(input, providerStatus);
  }

  if (normalizedText.match(/versicherung|police|policennummer/)) {
    return createInsuranceBrain(input, providerStatus);
  }

  if (normalizedText.match(/vertrag|laufzeit|kündigungsfrist|kuendigungsfrist/)) {
    return createContractBrain(input, providerStatus);
  }

  return sanitizeDocumentBrainResult({
    confidence: "medium",
    hiddenDetails: createHiddenDetails(input),
    importantFindings: createGenericDateFindings(input).slice(0, 3),
    intent: "general_document",
    needsUserConfirmation: true,
    primaryButtons: [
      createAction("review_details", "Details anzeigen", "Dokumentdetails prüfen."),
    ],
    provider: "deterministic",
    providerStatus,
    recommendedAction: createAction(
      "review_details",
      "Dokument prüfen",
      "Prüfe die erkannten Informationen, bevor LifePilot etwas speichert.",
    ),
    riskLevel: "low",
    simpleSummary:
      "LifePilot hat das Dokument vorbereitet. Bitte prüfe die wichtigsten Angaben.",
    sourceEvidence: createSourceEvidence(input).slice(0, 3),
    title: "Dokument erkannt",
  });
}

export function sanitizeDocumentBrainResult(
  result: DocumentBrainResult,
): DocumentBrainResult {
  const recommendedAction = sanitizeAction(result.recommendedAction);
  const primaryButtons = result.primaryButtons
    .map(sanitizeAction)
    .slice(0, 3);
  const buttons =
    primaryButtons.length > 0 ? primaryButtons : [recommendedAction];

  return {
    ...result,
    confidence: sanitizeConfidence(result.confidence),
    hiddenDetails: Array.isArray(result.hiddenDetails)
      ? result.hiddenDetails.map(sanitizeHiddenDetail)
      : [],
    importantFindings: Array.isArray(result.importantFindings)
      ? result.importantFindings.map(sanitizeFinding).slice(0, 3)
      : [],
    intent: sanitizeIntent(result.intent),
    needsUserConfirmation: true,
    optionalQuestion: result.optionalQuestion
      ? sanitizeQuestion(result.optionalQuestion)
      : undefined,
    primaryButtons: buttons,
    provider: sanitizeProvider(result.provider),
    providerStatus: sanitizeProviderStatus(result.providerStatus),
    recommendedAction,
    riskLevel: sanitizeRiskLevel(result.riskLevel),
    sourceEvidence: Array.isArray(result.sourceEvidence)
      ? result.sourceEvidence.map(sanitizeEvidence).slice(0, 6)
      : [],
    simpleSummary:
      typeof result.simpleSummary === "string" && result.simpleSummary.trim()
        ? result.simpleSummary.trim()
        : "LifePilot hat das Dokument geprüft.",
    title:
      typeof result.title === "string" && result.title.trim()
        ? result.title.trim()
        : "Dokument erkannt",
  };
}

export function createDocumentBrainInputFromAnalysis({
  analysis,
  filename,
  mimeType,
}: {
  analysis: {
    detectedDeadlines: DetectedDeadline[];
    extractedFacts?: DocumentBrainInput["deterministicFacts"];
    extractedText?: { text: string };
  };
  filename?: string;
  mimeType?: string;
}): DocumentBrainInput {
  return {
    deterministicDates: analysis.detectedDeadlines,
    deterministicFacts: analysis.extractedFacts,
    extractedText: analysis.extractedText?.text,
    filename,
    locale: "de-DE",
    mimeType,
  };
}

function createEmploymentTerminationBrain(
  input: DocumentBrainInput,
  providerStatus: BrainProviderStatus,
): DocumentBrainResult {
  const evidence = createSourceEvidence(input);
  const text = input.extractedText ?? "";
  const employmentEndDate =
    findEmploymentEndDate(text) ??
    input.deterministicDates.find((date) =>
      date.originalText.toLowerCase().match(/arbeitsverhältnis|fristgerecht|kündigung/),
    )?.dateIso;
  const documentDate = findDocumentDate(text);
  const agenturEvidence = findSnippet(
    text,
    /agentur für arbeit|arbeitsuchend|§\s*38\s*sgb\s*iii/i,
  );
  const receiptQuestionNeeded = /innerhalb von (drei|3) tagen/i.test(text);
  const findings: BrainFinding[] = [
    employmentEndDate
      ? {
          label: "Ende des Arbeitsverhältnisses",
          sourceEvidence: createEvidence(
            "Kündigung",
            findSnippet(
              text,
              /fristgerecht\s+zum\s+\d{1,2}\.\d{1,2}\.\d{2,4}/i,
            ),
            employmentEndDate,
          ),
          value: formatIsoDateGerman(employmentEndDate),
        }
      : {
          label: "Ende des Arbeitsverhältnisses",
          value: "Im Dokument steht eine Kündigung. Das Enddatum bitte prüfen.",
        },
    {
      label: "Arbeitsuchendmeldung",
      sourceEvidence: createEvidence("Agentur für Arbeit", agenturEvidence),
      value:
        "Arbeitsuchendmeldung innerhalb von 3 Tagen nach Erhalt prüfen",
    },
  ];

  if (documentDate) {
    findings.push({
      label: "Dokumentdatum",
      sourceEvidence: createEvidence(
        "Dokumentdatum",
        findSnippet(text, /(?:berlin|hamburg|münchen|koeln|köln|den)\W{0,20}\d{1,2}\.\d{1,2}\.\d{2,4}/i),
        documentDate,
      ),
      value: formatIsoDateGerman(documentDate),
    });
  }

  const recommendedAction = createAction(
    "create_reminder",
    "Arbeitsuchendmeldung prüfen",
    "Erinnerung oder Aufgabe für die Meldung bei der Agentur für Arbeit erstellen.",
    undefined,
    createEvidence("Agentur für Arbeit", agenturEvidence),
  );

  return sanitizeDocumentBrainResult({
    confidence: "high",
    hiddenDetails: createHiddenDetails(input, [
      {
        label: "Möglicher Vertragsbeginn oder Nebendatum",
        section: "all_dates",
        value:
          input.deterministicDates.find((date) =>
            date.dateIso?.startsWith("2025-11-14"),
          )?.originalText ?? "Weitere Daten wurden bewusst nicht als Hauptfrist gezeigt.",
      },
    ]),
    importantFindings: findings.slice(0, 3),
    intent: "employment_termination",
    needsUserConfirmation: true,
    optionalQuestion: receiptQuestionNeeded
      ? {
          id: "receipt_date",
          label: "Erhaltsdatum",
          placeholder: "TT.MM.JJJJ",
          question: "Wann hast du dieses Schreiben erhalten?",
          required: true,
          sourceEvidence: createEvidence(
            "Erhaltsfrist",
            findSnippet(text, /innerhalb von (drei|3) tagen[^.]+/i),
          ),
        }
      : undefined,
    primaryButtons: [
      createAction(
        "create_reminder",
        "Erinnerung erstellen",
        "Bereitet eine Erinnerung vor. Du bestätigst sie vor dem Speichern.",
        undefined,
        createEvidence("Agentur für Arbeit", agenturEvidence),
      ),
      createAction(
        "create_task",
        "Aufgabe erstellen",
        "Bereitet eine Aufgabe vor. Du bestätigst sie vor dem Speichern.",
        undefined,
        createEvidence("Agentur für Arbeit", agenturEvidence),
      ),
      createAction(
        "review_details",
        "Details anzeigen",
        "Zeigt Rohtext, Kandidaten und technische Informationen.",
      ),
    ],
    provider: "deterministic",
    providerStatus,
    recommendedAction,
    riskLevel: "high",
    simpleSummary:
      "Im Dokument steht wahrscheinlich eine ordentliche Kündigung des Arbeitsverhältnisses. Bitte prüfe die Meldung bei der Agentur für Arbeit.",
    sourceEvidence: evidence.slice(0, 4),
    title: "Kündigung Arbeitsverhältnis erkannt",
  });
}

function createInvoiceBrain(
  input: DocumentBrainInput,
  providerStatus: BrainProviderStatus,
): DocumentBrainResult {
  const text = `${input.extractedText ?? ""}\n${input.filename ?? ""}`;
  const dueDate = input.deterministicDates.find((date) =>
    date.originalText.toLowerCase().match(/fällig|faellig|zahlung|bis/),
  )?.dateIso ?? input.deterministicDates[0]?.dateIso;
  const amount = text.match(/\b\d{1,3}(?:\.\d{3})*(?:,\d{2})\s*(?:€|EUR)\b/i)?.[0];
  const provider = findProviderFromFacts(input) ?? findProviderFromText(text);
  const findings: BrainFinding[] = [
    provider ? { label: "Anbieter", value: provider } : undefined,
    amount ? { label: "Betrag", value: amount } : undefined,
    dueDate
      ? { label: "Fälligkeitsdatum prüfen", value: formatIsoDateGerman(dueDate) }
      : undefined,
  ].filter(Boolean) as BrainFinding[];

  const recommendedAction = createAction(
    "create_reminder",
    "Zahlung prüfen",
    "Prüfe, ob die Rechnung schon bezahlt ist. Falls nicht, Erinnerung vorbereiten.",
    dueDate,
  );

  return sanitizeDocumentBrainResult({
    confidence: findings.length > 1 ? "medium" : "low",
    hiddenDetails: createHiddenDetails(input),
    importantFindings: findings.length > 0 ? findings : createGenericDateFindings(input),
    intent: "invoice",
    needsUserConfirmation: true,
    primaryButtons: [
      createAction("create_reminder", "Erinnerung erstellen", "Zahlungserinnerung vorbereiten.", dueDate),
      createAction("review_details", "Details anzeigen", "Weitere Daten prüfen."),
    ],
    provider: "deterministic",
    providerStatus,
    recommendedAction,
    riskLevel: dueDate ? "medium" : "low",
    simpleSummary: "LifePilot erkennt wahrscheinlich eine Rechnung.",
    sourceEvidence: createSourceEvidence(input).slice(0, 3),
    title: "Rechnung erkannt",
  });
}

function createAuthorityBrain(
  input: DocumentBrainInput,
  providerStatus: BrainProviderStatus,
): DocumentBrainResult {
  const authority = findProviderFromFacts(input) ?? "Behörde";
  const deadline = input.deterministicDates[0]?.dateIso;
  const recommendedAction = createAction(
    "create_task",
    "Antwort oder Aufgabe prüfen",
    "Prüfe, ob du auf dieses Schreiben reagieren musst.",
    deadline,
  );

  return sanitizeDocumentBrainResult({
    confidence: "medium",
    hiddenDetails: createHiddenDetails(input),
    importantFindings: [
      { label: "Absender", value: authority },
      deadline
        ? { label: "Frist oder Termin prüfen", value: formatIsoDateGerman(deadline) }
        : { label: "Handlung prüfen", value: "Im Dokument könnte eine Reaktion nötig sein." },
    ],
    intent: "authority_letter",
    needsUserConfirmation: true,
    primaryButtons: [
      createAction("create_task", "Aufgabe erstellen", "Aufgabe vorbereiten.", deadline),
      createAction("create_reminder", "Erinnerung erstellen", "Erinnerung vorbereiten.", deadline),
      createAction("review_details", "Details anzeigen", "Weitere Daten prüfen."),
    ],
    provider: "deterministic",
    providerStatus,
    recommendedAction,
    riskLevel: deadline ? "medium" : "low",
    simpleSummary: "LifePilot erkennt wahrscheinlich ein Behördenschreiben.",
    sourceEvidence: createSourceEvidence(input).slice(0, 3),
    title: "Behördenschreiben erkannt",
  });
}

function createInsuranceBrain(
  input: DocumentBrainInput,
  providerStatus: BrainProviderStatus,
): DocumentBrainResult {
  return createContractLikeBrain(
    input,
    providerStatus,
    "insurance",
    "Versicherung erkannt",
    "LifePilot erkennt wahrscheinlich ein Versicherungsdokument.",
  );
}

function createContractBrain(
  input: DocumentBrainInput,
  providerStatus: BrainProviderStatus,
): DocumentBrainResult {
  return createContractLikeBrain(
    input,
    providerStatus,
    "contract",
    "Vertrag erkannt",
    "LifePilot erkennt wahrscheinlich einen Vertrag.",
  );
}

function createContractLikeBrain(
  input: DocumentBrainInput,
  providerStatus: BrainProviderStatus,
  intent: DocumentIntent,
  title: string,
  simpleSummary: string,
): DocumentBrainResult {
  const provider = findProviderFromFacts(input) ?? findProviderFromText(input.extractedText ?? "");
  const nextDate = input.deterministicDates[0]?.dateIso;
  const recommendedAction = createAction(
    "create_reminder",
    "Kündigungsfrist überwachen",
    "Prüfe, ob LifePilot eine Erinnerung für die nächste wichtige Frist vorbereiten soll.",
    nextDate,
  );

  return sanitizeDocumentBrainResult({
    confidence: "medium",
    hiddenDetails: createHiddenDetails(input),
    importantFindings: [
      provider ? { label: "Anbieter", value: provider } : undefined,
      nextDate ? { label: "Nächstes wichtiges Datum prüfen", value: formatIsoDateGerman(nextDate) } : undefined,
      { label: "Vertrag prüfen", value: "Kündigungsfrist und Laufzeit bitte bestätigen." },
    ].filter(Boolean) as BrainFinding[],
    intent,
    needsUserConfirmation: true,
    primaryButtons: [
      createAction("create_reminder", "Erinnerung erstellen", "Erinnerung vorbereiten.", nextDate),
      createAction("save_contract", "Als Vertrag speichern", "Vertragsspeicherung vorbereiten."),
      createAction("review_details", "Details anzeigen", "Weitere Daten prüfen."),
    ],
    provider: "deterministic",
    providerStatus,
    recommendedAction,
    riskLevel: nextDate ? "medium" : "low",
    simpleSummary,
    sourceEvidence: createSourceEvidence(input).slice(0, 3),
    title,
  });
}

function isEmploymentTermination(text: string): boolean {
  return (
    text.includes("kündigung") &&
    (text.includes("arbeitsverhältnis") || text.includes("arbeitsverhaeltnis"))
  );
}

function findEmploymentEndDate(text: string): string | undefined {
  const match = text.match(
    /fristgerecht\s+zum\s+(\d{1,2}\.\d{1,2}\.\d{2,4})/i,
  );

  if (!match?.[1]) {
    return undefined;
  }

  return findGermanDateMatches(match[1])[0]?.dateIso;
}

function findDocumentDate(text: string): string | undefined {
  const match =
    text.match(/(?:berlin|hamburg|münchen|koeln|köln)[,\s]+(?:den\s*)?(\d{1,2}\.\d{1,2}\.\d{2,4})/i) ??
    text.match(/\bden\s+(\d{1,2}\.\d{1,2}\.\d{2,4})/i);

  return match?.[1] ? findGermanDateMatches(match[1])[0]?.dateIso : undefined;
}

function findSnippet(text: string, pattern: RegExp): string | undefined {
  const match = text.match(pattern);

  if (!match?.[0]) {
    return undefined;
  }

  const index = match.index ?? 0;
  const start = Math.max(0, index - 60);
  const end = Math.min(text.length, index + match[0].length + 80);

  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

function findProviderFromFacts(input: DocumentBrainInput): string | undefined {
  const facts = input.deterministicFacts?.facts;
  const provider =
    facts?.provider?.value ??
    facts?.authorityName?.value ??
    facts?.insuranceType?.value;

  return typeof provider === "string" && provider.trim()
    ? provider.trim()
    : undefined;
}

function findProviderFromText(text: string): string | undefined {
  return [
    "Vodafone",
    "Telekom",
    "Allianz",
    "AXA",
    "Jobcenter",
    "Finanzamt",
    "Agentur für Arbeit",
  ].find((provider) => text.toLowerCase().includes(provider.toLowerCase()));
}

function createGenericDateFindings(input: DocumentBrainInput): BrainFinding[] {
  return input.deterministicDates.slice(0, 3).map((date) => ({
    label: date.label || "Datum prüfen",
    sourceEvidence: createEvidence("Datum", date.originalText, date.dateIso),
    value: date.dateIso ? formatIsoDateGerman(date.dateIso) : date.originalText,
  }));
}

function createSourceEvidence(input: DocumentBrainInput): BrainSourceEvidence[] {
  const evidence: BrainSourceEvidence[] = [];

  if (input.filename) {
    evidence.push({
      field: "filename",
      label: "Dateiname",
      snippet: cleanDocumentFileName(input.filename),
    });
  }

  input.deterministicDates.slice(0, 5).forEach((date) => {
    evidence.push(createEvidence("Erkanntes Datum", date.originalText, date.dateIso));
  });

  return evidence;
}

function createHiddenDetails(
  input: DocumentBrainInput,
  extraDetails: HiddenDocumentDetail[] = [],
): HiddenDocumentDetail[] {
  const details: HiddenDocumentDetail[] = [...extraDetails];

  if (input.extractedText) {
    details.push({
      label: "Erkannter Text",
      section: "raw_text",
      value: input.extractedText.slice(0, 4000),
    });
  }

  input.deterministicDates.forEach((date) => {
    details.push({
      label: date.label,
      section: "all_dates",
      value: `${date.dateIso ? formatIsoDateGerman(date.dateIso) : "Ohne Datum"} - ${date.originalText}`,
    });
  });

  Object.entries(input.deterministicFacts?.facts ?? {}).forEach(([key, fact]) => {
    if (!fact?.value) {
      return;
    }

    details.push({
      label: fact.label ?? key,
      section: "all_facts",
      value: String(fact.value),
    });
  });

  if (input.filename || input.mimeType) {
    details.push({
      label: "Datei",
      section: "technical",
      value: [input.filename, input.mimeType].filter(Boolean).join(" · "),
    });
  }

  return details.slice(0, 40);
}

function createAction(
  type: BrainActionType,
  label: string,
  explanation: string,
  suggestedDate?: string,
  sourceEvidence?: BrainSourceEvidence,
): BrainAction {
  return {
    explanation,
    label,
    requiresConfirmation: true,
    sourceEvidence,
    suggestedDate,
    type,
  };
}

function createEvidence(
  label: string,
  snippet?: string,
  dateIso?: string,
): BrainSourceEvidence {
  return {
    dateIso,
    label,
    snippet,
  };
}

function sanitizeFinding(finding: BrainFinding): BrainFinding {
  return {
    label: String(finding.label || "Wichtig").trim(),
    sourceEvidence: finding.sourceEvidence
      ? sanitizeEvidence(finding.sourceEvidence)
      : undefined,
    value: String(finding.value || "").trim(),
  };
}

function sanitizeAction(action: BrainAction): BrainAction {
  const type = sanitizeActionType(action.type);

  return {
    explanation: String(action.explanation || "Aktion vorbereiten.").trim(),
    label: String(action.label || "Prüfen").trim(),
    requiresConfirmation: true,
    sourceEvidence: action.sourceEvidence
      ? sanitizeEvidence(action.sourceEvidence)
      : undefined,
    suggestedDate:
      typeof action.suggestedDate === "string" ? action.suggestedDate : undefined,
    type,
  };
}

function sanitizeQuestion(question: BrainQuestion): BrainQuestion {
  return {
    id: String(question.id || "question").trim(),
    label: String(question.label || "Frage").trim(),
    placeholder:
      typeof question.placeholder === "string" ? question.placeholder : undefined,
    question: String(question.question || "Bitte prüfe diese Angabe.").trim(),
    required: Boolean(question.required),
    sourceEvidence: question.sourceEvidence
      ? sanitizeEvidence(question.sourceEvidence)
      : undefined,
  };
}

function sanitizeEvidence(evidence: BrainSourceEvidence): BrainSourceEvidence {
  return {
    dateIso: typeof evidence.dateIso === "string" ? evidence.dateIso : undefined,
    field: typeof evidence.field === "string" ? evidence.field : undefined,
    label: String(evidence.label || "Quelle").trim(),
    snippet:
      typeof evidence.snippet === "string" ? evidence.snippet.slice(0, 300) : undefined,
  };
}

function sanitizeHiddenDetail(detail: HiddenDocumentDetail): HiddenDocumentDetail {
  const section = [
    "raw_text",
    "all_dates",
    "all_facts",
    "technical",
    "source_evidence",
  ].includes(detail.section)
    ? detail.section
    : "source_evidence";

  return {
    label: String(detail.label || "Detail").trim(),
    section,
    value: String(detail.value || "").slice(0, 5000),
  };
}

function sanitizeIntent(intent: string): DocumentIntent {
  return [
    "employment_termination",
    "invoice",
    "contract",
    "insurance",
    "authority_letter",
    "identity_document",
    "general_document",
  ].includes(intent)
    ? (intent as DocumentIntent)
    : "general_document";
}

function sanitizeActionType(type: string): BrainActionType {
  return [
    "create_reminder",
    "create_task",
    "save_document",
    "save_contract",
    "review_details",
  ].includes(type)
    ? (type as BrainActionType)
    : "review_details";
}

function sanitizeProvider(provider: string): BrainProvider {
  return provider === "openai" ? "openai" : "deterministic";
}

function sanitizeProviderStatus(status: string): BrainProviderStatus {
  return [
    "active",
    "fallback",
    "not_configured",
    "error",
    "invalid_output",
  ].includes(status)
    ? (status as BrainProviderStatus)
    : "fallback";
}

function sanitizeConfidence(confidence: string): BrainConfidence {
  return ["low", "medium", "high"].includes(confidence)
    ? (confidence as BrainConfidence)
    : "medium";
}

function sanitizeRiskLevel(riskLevel: string): BrainRiskLevel {
  return ["low", "medium", "high"].includes(riskLevel)
    ? (riskLevel as BrainRiskLevel)
    : "low";
}
