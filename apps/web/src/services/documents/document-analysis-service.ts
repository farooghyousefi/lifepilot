import type {
  DetectedDeadline,
  DetectedDeadlineKind,
  Document,
  DocumentAnalysis,
} from "@lifepilot/shared";

import { getAiAnalysisBoundaryNote } from "./ai-analysis-service";
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
      return {
        ...baseAnalysis,
        detectedDeadlines: detectDeadlines(createFilenameAnalysisText(file.name)),
        ...createOcrExtractionPlaceholder(analyzedAt),
      };
    }

    return {
      ...baseAnalysis,
      detectedDeadlines: detectDeadlines(createFilenameAnalysisText(file.name)),
      errorMessage: "Dieser Dateityp kann noch nicht analysiert werden.",
      status: "unsupported",
      summary: getAiAnalysisBoundaryNote(),
    };
  } catch {
    return {
      ...baseAnalysis,
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
