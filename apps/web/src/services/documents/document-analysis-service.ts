import type {
  DetectedDeadline,
  DetectedDeadlineKind,
  DetectedDocumentAction,
  Document,
  DocumentAnalysis,
  ExtractedText,
} from "@lifepilot/shared";

import { getAiAnalysisBoundaryNote } from "./ai-analysis-service";
import { detectDocumentActions } from "./document-action-engine-service";
import { extractDocumentFactsFromText } from "./document-fact-extraction-service";
import {
  cleanDocumentFileName,
  findGermanDateMatches,
} from "./german-date-service";
import { createOcrExtractionPlaceholder } from "./ocr-extraction-service";
import {
  createPdfExtractionPlaceholder,
  extractTextFromPdfFile,
} from "./pdf-extraction-service";
import { extractTextFromPlainTextFile } from "./text-extraction-service";

export const documentAnalysisStorageKey = "lifepilot:document-analyses:v1";

const keywordMap: Array<{
  kind: DetectedDeadlineKind;
  keywords: string[];
}> = [
  { kind: "kuendigung", keywords: ["kündigung", "kuendigung", "kündigungsfrist"] },
  { kind: "zahlung", keywords: ["zahlung", "zahlungsfrist", "fällig", "faellig"] },
  { kind: "frist", keywords: ["frist", "bis zum", "spätestens", "spaetestens"] },
  { kind: "termin", keywords: ["termin", "am "] },
];

export async function analyzeDocumentFile({
  document,
  file,
}: {
  document: Document;
  file: File;
}): Promise<DocumentAnalysis> {
  const analyzedAt = new Date().toISOString();
  const baseAnalysis = {
    analyzedAt,
    contentType: document.contentType ?? file.type,
    documentId: document.id,
    documentName: document.name,
    fileName: document.fileName ?? file.name,
  };

  try {
    if (file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt")) {
      const extraction = await extractTextFromPlainTextFile(file, analyzedAt);

      const fallbackText = createFilenameAnalysisText(file.name);
      const analysisText =
        "extractedText" in extraction
          ? `${extraction.extractedText.text}\n${fallbackText}`.trim()
          : fallbackText;

      return {
        ...baseAnalysis,
        detectedActions:
          analysisText.length > 0
            ? detectDocumentActions({
                analyzedAt,
                documentName: document.name,
                text: analysisText,
              })
            : [],
        detectedDeadlines:
          analysisText.length > 0 ? detectDeadlines(analysisText) : [],
        extractedFacts:
          "extractedText" in extraction
            ? extractDocumentFactsFromText({
                documentId: document.id,
                documentName: document.name,
                extractedAt: analyzedAt,
                text: extraction.extractedText.text,
              })
            : undefined,
        ...extraction,
      };
    }

    if (
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf")
    ) {
      const extraction = await extractPdfTextSafely(file, analyzedAt);
      const fallbackText = createFilenameAnalysisText(file.name);
      const analysisText =
        extraction.extractedText.text.length > 0
          ? `${extraction.extractedText.text}\n${fallbackText}`.trim()
          : fallbackText;

      return {
        ...baseAnalysis,
        detectedActions:
          analysisText.length > 0
            ? detectDocumentActions({
                analyzedAt,
                documentName: document.name,
                text: analysisText,
              })
            : [],
        detectedDeadlines:
          analysisText.length > 0 ? detectDeadlines(analysisText) : [],
        extractedFacts:
          extraction.extractedText.text.length > 0
            ? extractDocumentFactsFromText({
                documentId: document.id,
                documentName: document.name,
                extractedAt: analyzedAt,
                text: extraction.extractedText.text,
              })
            : undefined,
        ...extraction,
      };
    }

    if (file.type.startsWith("image/")) {
      const analysisText = createFilenameAnalysisText(file.name);

      return {
        ...baseAnalysis,
        detectedActions: detectDocumentActions({
          analyzedAt,
          documentName: document.name,
          text: analysisText,
        }),
        detectedDeadlines: detectDeadlines(analysisText),
        ...createOcrExtractionPlaceholder(analyzedAt),
      };
    }

    const analysisText = createFilenameAnalysisText(file.name);

    return {
      ...baseAnalysis,
      detectedActions: detectDocumentActions({
        analyzedAt,
        documentName: document.name,
        text: analysisText,
      }),
      detectedDeadlines: detectDeadlines(analysisText),
      errorMessage: "Dieser Dateityp kann noch nicht analysiert werden.",
      status: "unsupported",
      summary: getAiAnalysisBoundaryNote(),
    };
  } catch {
    return {
      ...baseAnalysis,
      detectedActions: detectDocumentActions({
        analyzedAt,
        documentName: document.name,
        text: createFilenameAnalysisText(file.name),
      }),
      detectedDeadlines: detectDeadlines(createFilenameAnalysisText(file.name)),
      errorMessage:
        "Die lokale Dokumentenanalyse konnte nicht abgeschlossen werden.",
      status: "failed",
    };
  }
}

async function extractPdfTextSafely(
  file: File,
  analyzedAt: string,
): Promise<Awaited<ReturnType<typeof extractTextFromPdfFile>>> {
  try {
    return await extractTextFromPdfFile(file, analyzedAt);
  } catch {
    return createPdfExtractionPlaceholder(analyzedAt);
  }
}

export function detectDeadlines(text: string): DetectedDeadline[] {
  const candidates: DetectedDeadline[] = [];
  const normalizedText = text.replace(/\s+/g, " ").trim();
  const dateMatches = findGermanDateMatches(normalizedText);

  for (const match of dateMatches) {
    const context = getContext(normalizedText, match.index, match.originalText);
    const kind = detectKind(context);

    candidates.push({
      confidence: "medium",
      dateIso: match.dateIso,
      kind: match.type === "range" ? "frist" : kind,
      label:
        match.type === "range"
          ? "Möglicher Zeitraum"
          : createDeadlineLabel(kind),
      originalText: context,
    });

    if (match.endDateIso) {
      candidates.push({
        confidence: "medium",
        dateIso: match.endDateIso,
        kind: "frist",
        label: "Mögliche Frist",
        originalText: context,
      });
    }
  }

  for (const keyword of ["kündigungsfrist", "zahlungsfrist"]) {
    const index = normalizedText.toLowerCase().indexOf(keyword);

    if (
      index >= 0 &&
      !candidates.some((candidate) =>
        candidate.originalText.toLowerCase().includes(keyword),
      )
    ) {
      const context = getContext(normalizedText, index, keyword);

      candidates.push({
        confidence: "low",
        kind: keyword.includes("zahlung") ? "zahlung" : "kuendigung",
        label: "Mögliche Frist ohne klares Datum",
        originalText: context,
      });
    }
  }

  return dedupeDeadlines(candidates).slice(0, 8);
}

export function readStoredDocumentAnalyses(): DocumentAnalysis[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(documentAnalysisStorageKey);
    const parsedValue = rawValue ? JSON.parse(rawValue) : [];

    return Array.isArray(parsedValue)
      ? parsedValue
          .map(normalizeStoredDocumentAnalysis)
          .filter((analysis): analysis is DocumentAnalysis => Boolean(analysis))
      : [];
  } catch {
    return [];
  }
}

export function storeDocumentAnalysis(analysis: DocumentAnalysis): void {
  if (typeof window === "undefined") {
    return;
  }

  const currentAnalyses = readStoredDocumentAnalyses().filter(
    (item) => item.documentId !== analysis.documentId,
  );

  window.localStorage.setItem(
    documentAnalysisStorageKey,
    JSON.stringify([analysis, ...currentAnalyses].slice(0, 20)),
  );
}

function getContext(text: string, index: number, value: string): string {
  const start = Math.max(0, index - 70);
  const end = Math.min(text.length, index + value.length + 70);

  return text.slice(start, end).trim();
}

function detectKind(context: string): DetectedDeadlineKind {
  const normalizedContext = context.toLowerCase();

  return (
    keywordMap.find((entry) =>
      entry.keywords.some((keyword) => normalizedContext.includes(keyword)),
    )?.kind ?? "datum"
  );
}

function createDeadlineLabel(kind: DetectedDeadlineKind): string {
  if (kind === "kuendigung") {
    return "Mögliche Frist";
  }

  if (kind === "zahlung") {
    return "Mögliche Frist";
  }

  if (kind === "frist") {
    return "Mögliche Frist";
  }

  if (kind === "termin") {
    return "Möglicher Termin";
  }

  return "Mögliches Datum";
}

function dedupeDeadlines(deadlines: DetectedDeadline[]): DetectedDeadline[] {
  const seen = new Set<string>();

  return deadlines.filter((deadline) => {
    const key = `${deadline.dateIso ?? ""}:${deadline.kind}:${deadline.originalText}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function createFilenameAnalysisText(fileName: string): string {
  const cleanedFileName = cleanDocumentFileName(fileName);

  return cleanedFileName ? `Dateiname: ${cleanedFileName}` : "";
}

function normalizeStoredDocumentAnalysis(value: unknown): DocumentAnalysis | null {
  if (!isRecord(value) || typeof value.documentId !== "string") {
    return null;
  }

  const documentId = value.documentId.trim();

  if (!documentId) {
    return null;
  }

  return {
    analyzedAt:
      typeof value.analyzedAt === "string" ? value.analyzedAt : undefined,
    contentType:
      typeof value.contentType === "string" ? value.contentType : undefined,
    detectedActions: asArray(value.detectedActions)
      .map(normalizeDetectedAction)
      .filter((action): action is DetectedDocumentAction => Boolean(action)),
    detectedDeadlines: asArray(value.detectedDeadlines)
      .map(normalizeDetectedDeadline)
      .filter((deadline): deadline is DetectedDeadline => Boolean(deadline)),
    documentId,
    documentName:
      typeof value.documentName === "string" ? value.documentName : undefined,
    errorMessage:
      typeof value.errorMessage === "string" ? value.errorMessage : undefined,
    extractedFacts: isRecord(value.extractedFacts)
      ? (value.extractedFacts as unknown as DocumentAnalysis["extractedFacts"])
      : undefined,
    extractedText: normalizeExtractedText(value.extractedText),
    fileName: typeof value.fileName === "string" ? value.fileName : undefined,
    status: isAnalysisStatus(value.status) ? value.status : "completed",
    summary: typeof value.summary === "string" ? value.summary : undefined,
  };
}

function normalizeDetectedDeadline(value: unknown): DetectedDeadline | null {
  if (!isRecord(value)) {
    return null;
  }

  const originalText =
    typeof value.originalText === "string" ? value.originalText : "";

  return {
    confidence: isConfidence(value.confidence) ? value.confidence : "low",
    dateIso: typeof value.dateIso === "string" ? value.dateIso : undefined,
    kind: isDetectedDeadlineKind(value.kind) ? value.kind : "datum",
    label:
      typeof value.label === "string" && value.label.trim()
        ? value.label.trim()
        : "Mögliches Datum",
    originalText,
  };
}

function normalizeDetectedAction(value: unknown): DetectedDocumentAction | null {
  if (!isRecord(value)) {
    return null;
  }

  const id =
    typeof value.id === "string" && value.id.trim()
      ? value.id
      : `stored-action-${stableHash(JSON.stringify(value))}`;

  return {
    confidence: isConfidence(value.confidence) ? value.confidence : "low",
    dateIso: typeof value.dateIso === "string" ? value.dateIso : undefined,
    description:
      typeof value.description === "string" ? value.description : "",
    id,
    requiresUserConfirmation: true,
    sourceSnippet:
      typeof value.sourceSnippet === "string" ? value.sourceSnippet : "",
    time: typeof value.time === "string" ? value.time : undefined,
    title:
      typeof value.title === "string" && value.title.trim()
        ? value.title.trim()
        : "Erkannte Aktion prüfen",
    type: isDetectedDocumentActionType(value.type)
      ? value.type
      : "general_reminder",
  };
}

function normalizeExtractedText(value: unknown): ExtractedText | undefined {
  if (!isRecord(value) || typeof value.text !== "string") {
    return undefined;
  }

  return {
    confidence: isConfidence(value.confidence) ? value.confidence : "low",
    extractedAt:
      typeof value.extractedAt === "string"
        ? value.extractedAt
        : new Date().toISOString(),
    source: isExtractedTextSource(value.source)
      ? value.source
      : "browser-text-file",
    text: value.text,
  };
}

function isAnalysisStatus(
  value: unknown,
): value is DocumentAnalysis["status"] {
  return (
    typeof value === "string" &&
    ["not-started", "extracting", "completed", "unsupported", "failed"].includes(
      value,
    )
  );
}

function isConfidence(value: unknown): value is "high" | "medium" | "low" {
  return (
    typeof value === "string" && ["high", "medium", "low"].includes(value)
  );
}

function isDetectedDeadlineKind(
  value: unknown,
): value is DetectedDeadlineKind {
  return (
    typeof value === "string" &&
    ["frist", "zahlung", "kuendigung", "termin", "datum"].includes(value)
  );
}

function isDetectedDocumentActionType(
  value: unknown,
): value is DetectedDocumentAction["type"] {
  return (
    typeof value === "string" &&
    [
      "appointment",
      "payment_deadline",
      "cancellation_deadline",
      "response_deadline",
      "contract_review",
      "general_reminder",
    ].includes(value)
  );
}

function isExtractedTextSource(value: unknown): value is ExtractedText["source"] {
  return (
    typeof value === "string" &&
    [
      "browser-text-file",
      "browser-pdf-text",
      "browser-pdf-placeholder",
      "ocr-placeholder",
      "ai-provider-placeholder",
    ].includes(value)
  );
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function stableHash(value: string): string {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash).toString(36);
}
