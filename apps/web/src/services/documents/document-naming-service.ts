import type { DocumentCategory, FactConfidence } from "@lifepilot/shared";

import {
  cleanDocumentFileName,
  findGermanDateMatches,
  formatIsoDateGerman,
} from "./german-date-service";

export interface DocumentNameSuggestion {
  category: DocumentCategory;
  confidence: FactConfidence;
  name: string;
  source: "fallback" | "file-name" | "text";
}

const providerKeywords = [
  "Vodafone",
  "Telekom",
  "1&1",
  "O2",
  "Allianz",
  "AXA",
  "HUK",
  "ERGO",
  "Jobcenter",
  "Finanzamt",
  "Bürgeramt",
  "Sparkasse",
  "Volksbank",
  "Stadtwerke",
  "Vattenfall",
  "E.ON",
];

const documentTypeKeywords: Array<{
  category: DocumentCategory;
  keywords: string[];
  label: string;
}> = [
  { category: "bills", keywords: ["rechnung", "abschlag"], label: "Rechnung" },
  {
    category: "insurance",
    keywords: ["versicherung", "police", "policennummer"],
    label: "Versicherung",
  },
  {
    category: "contracts",
    keywords: ["mietvertrag", "vertrag", "laufzeit"],
    label: "Vertrag",
  },
  {
    category: "finance",
    keywords: ["bescheid", "aktenzeichen", "jobcenter", "finanzamt"],
    label: "Schreiben",
  },
];

export async function suggestDocumentNameFromFile(
  file: File,
  now = new Date(),
): Promise<DocumentNameSuggestion> {
  if (file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt")) {
    const textSuggestion = suggestDocumentNameFromText(await file.text(), now);

    if (textSuggestion) {
      return textSuggestion;
    }
  }

  const fileNameSuggestion = suggestDocumentNameFromFileName(file.name);

  if (fileNameSuggestion) {
    return fileNameSuggestion;
  }

  return {
    category: "other",
    confidence: "low",
    name: `Dokument vom ${formatGermanDate(now)}`,
    source: "fallback",
  };
}

export function suggestDocumentNameFromText(
  text: string,
  now = new Date(),
): DocumentNameSuggestion | null {
  const normalizedText = text.replace(/\s+/g, " ").trim();

  if (!normalizedText) {
    return null;
  }

  const provider = providerKeywords.find((keyword) =>
    normalizedText.toLowerCase().includes(keyword.toLowerCase()),
  );
  const documentType = documentTypeKeywords.find((entry) =>
    entry.keywords.some((keyword) =>
      normalizedText.toLowerCase().includes(keyword),
    ),
  );
  const dateMatches = findGermanDateMatches(normalizedText);
  const firstDate = dateMatches[0]?.dateIso;
  const range = dateMatches.find((match) => match.type === "range");
  const year = firstDate?.slice(0, 4) ?? String(now.getFullYear());

  if (provider && documentType && range?.endDateIso) {
    return {
      category: documentType.category,
      confidence: "high",
      name: limitNameLength(
        `${provider} ${documentType.label} ${formatIsoDateGerman(
          range.dateIso,
        )} bis ${formatIsoDateGerman(range.endDateIso)}`,
      ),
      source: "text",
    };
  }

  if (provider && documentType && firstDate) {
    return {
      category: documentType.category,
      confidence: "high",
      name: `${provider} ${documentType.label} ${formatIsoDateGerman(firstDate)}`,
      source: "text",
    };
  }

  if (provider && documentType) {
    return {
      category: documentType.category,
      confidence: "medium",
      name: `${provider} ${documentType.label} ${year}`,
      source: "text",
    };
  }

  if (documentType?.keywords.includes("mietvertrag")) {
    return {
      category: "contracts",
      confidence: "medium",
      name: `Mietvertrag ${year}`,
      source: "text",
    };
  }

  if (provider && firstDate) {
    return {
      category: documentType?.category ?? "other",
      confidence: "medium",
      name: `${provider} Schreiben ${formatIsoDateGerman(firstDate)}`,
      source: "text",
    };
  }

  return null;
}

export function suggestDocumentNameFromFileName(
  fileName: string,
): DocumentNameSuggestion | null {
  const cleaned = cleanDocumentFileName(fileName);

  if (!cleaned || cleaned.length < 3) {
    return null;
  }

  const dates = findGermanDateMatches(cleaned);
  const range = dates.find((match) => match.type === "range");
  const typeLabel = inferDocumentTypeLabel(cleaned);
  const reference = findReference(cleaned);

  if (typeLabel && range?.endDateIso) {
    return {
      category: inferCategory(cleaned),
      confidence: "medium",
      name: limitNameLength(
        `${typeLabel} ${formatIsoDateGerman(range.dateIso)} bis ${formatIsoDateGerman(
          range.endDateIso,
        )}`,
      ),
      source: "file-name",
    };
  }

  if (typeLabel && dates.length >= 2) {
    return {
      category: inferCategory(cleaned),
      confidence: "medium",
      name: limitNameLength(
        `${typeLabel} ${formatIsoDateGerman(dates[0].dateIso)} bis ${formatIsoDateGerman(
          dates[1].dateIso,
        )}`,
      ),
      source: "file-name",
    };
  }

  if (typeLabel && dates[0]) {
    return {
      category: inferCategory(cleaned),
      confidence: "medium",
      name: limitNameLength(
        `${typeLabel}${reference ? ` ${reference}` : ""} ${formatIsoDateGerman(
          dates[0].dateIso,
        )}`,
      ),
      source: "file-name",
    };
  }

  return {
    category: inferCategory(cleaned),
    confidence: "medium",
    name: limitNameLength(toTitleCase(cleaned.replace(/[-]+/g, " "))),
    source: "file-name",
  };
}

function inferCategory(value: string): DocumentCategory {
  const normalizedValue = value.toLowerCase();

  if (normalizedValue.match(/rechnung|invoice|abschlag/)) {
    return "bills";
  }

  if (normalizedValue.match(/versicherung|allianz|axa|huk|ergo/)) {
    return "insurance";
  }

  if (normalizedValue.match(/vertrag|miete|vodafone|telekom/)) {
    return "contracts";
  }

  if (normalizedValue.match(/steuer|finanzamt|bank|konto|jobcenter/)) {
    return "finance";
  }

  return "other";
}

function inferDocumentTypeLabel(value: string): string | undefined {
  const normalizedValue = value.toLowerCase();

  if (normalizedValue.includes("rechnung")) {
    return "Rechnung";
  }

  if (normalizedValue.includes("mietvertrag")) {
    return "Mietvertrag";
  }

  if (normalizedValue.includes("vertrag")) {
    return "Vertrag";
  }

  if (normalizedValue.includes("versicherung")) {
    return "Versicherung";
  }

  if (normalizedValue.includes("bescheid")) {
    return "Bescheid";
  }

  return undefined;
}

function findReference(value: string): string | undefined {
  const reference = value.match(/\b([A-Z]-?\d{2}-\d{2,})\b/i)?.[1];

  return reference?.toUpperCase();
}

function formatGermanDate(date: Date): string {
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function toTitleCase(value: string): string {
  return value
    .split(" ")
    .map((part) =>
      part.length <= 3 && part.toUpperCase() === part
        ? part
        : `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`,
    )
    .join(" ");
}

function limitNameLength(value: string): string {
  const normalizedValue = value.replace(/\s+/g, " ").trim();

  return normalizedValue.length > 72
    ? `${normalizedValue.slice(0, 69).trim()}...`
    : normalizedValue;
}
