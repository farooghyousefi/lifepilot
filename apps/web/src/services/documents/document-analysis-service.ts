import type {
  DetectedDeadline,
  DetectedDeadlineKind,
  Document,
  DocumentAnalysis,
} from "@lifepilot/shared";

import { getAiAnalysisBoundaryNote } from "./ai-analysis-service";
import { createOcrExtractionPlaceholder } from "./ocr-extraction-service";
import { createPdfExtractionPlaceholder } from "./pdf-extraction-service";
import { extractTextFromPlainTextFile } from "./text-extraction-service";

export const documentAnalysisStorageKey = "lifepilot:document-analyses:v1";

const germanMonths: Record<string, number> = {
  april: 4,
  august: 8,
  dezember: 12,
  februar: 2,
  januar: 1,
  juli: 7,
  juni: 6,
  märz: 3,
  maerz: 3,
  mai: 5,
  november: 11,
  oktober: 10,
  september: 9,
};

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

      return {
        ...baseAnalysis,
        detectedDeadlines:
          "extractedText" in extraction
            ? detectDeadlines(extraction.extractedText.text)
            : [],
        ...extraction,
      };
    }

    if (
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf")
    ) {
      return {
        ...baseAnalysis,
        detectedDeadlines: [],
        ...createPdfExtractionPlaceholder(analyzedAt),
      };
    }

    if (file.type.startsWith("image/")) {
      return {
        ...baseAnalysis,
        detectedDeadlines: [],
        ...createOcrExtractionPlaceholder(analyzedAt),
      };
    }

    return {
      ...baseAnalysis,
      detectedDeadlines: [],
      errorMessage: "Dieser Dateityp kann noch nicht analysiert werden.",
      status: "unsupported",
      summary: getAiAnalysisBoundaryNote(),
    };
  } catch {
    return {
      ...baseAnalysis,
      detectedDeadlines: [],
      errorMessage:
        "Die lokale Dokumentenanalyse konnte nicht abgeschlossen werden.",
      status: "failed",
    };
  }
}

export function detectDeadlines(text: string): DetectedDeadline[] {
  const candidates: DetectedDeadline[] = [];
  const normalizedText = text.replace(/\s+/g, " ").trim();
  const numericDatePattern = /\b(\d{1,2})\.(\d{1,2})\.(\d{4})\b/g;
  const writtenDatePattern =
    /\b(\d{1,2})\.\s*(Januar|Februar|März|Maerz|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\s+(\d{4})\b/gi;

  for (const match of normalizedText.matchAll(numericDatePattern)) {
    const [originalText, day, month, year] = match;
    const context = getContext(normalizedText, match.index ?? 0, originalText);
    const kind = detectKind(context);

    candidates.push({
      confidence: kind === "datum" ? "medium" : "high",
      dateIso: toIsoDate(Number(year), Number(month), Number(day)),
      kind,
      label: createDeadlineLabel(kind),
      originalText: context,
    });
  }

  for (const match of normalizedText.matchAll(writtenDatePattern)) {
    const [originalText, day, monthName, year] = match;
    const context = getContext(normalizedText, match.index ?? 0, originalText);
    const month = germanMonths[monthName.toLowerCase()];
    const kind = detectKind(context);

    candidates.push({
      confidence: kind === "datum" ? "medium" : "high",
      dateIso: month
        ? toIsoDate(Number(year), month, Number(day))
        : undefined,
      kind,
      label: createDeadlineLabel(kind),
      originalText: context,
    });
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

    return rawValue ? (JSON.parse(rawValue) as DocumentAnalysis[]) : [];
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
    return "Gefundene Frist / mögliche Kündigungsfrist";
  }

  if (kind === "zahlung") {
    return "Gefundene Frist / mögliche Zahlungsfrist";
  }

  if (kind === "frist") {
    return "Gefundene Frist / möglicher Termin";
  }

  return "Möglicher Termin";
}

function toIsoDate(year: number, month: number, day: number): string | undefined {
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return undefined;
  }

  return date.toISOString().slice(0, 10);
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
