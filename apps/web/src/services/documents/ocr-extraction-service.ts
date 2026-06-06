import type { ExtractedText } from "@lifepilot/shared";

export function createOcrExtractionPlaceholder(
  extractedAt: string,
): {
  errorMessage: string;
  extractedText: ExtractedText;
  status: "unsupported";
  summary: string;
} {
  return {
    errorMessage: "Foto-/Scan-Erkennung ist vorbereitet, aber noch nicht aktiv.",
    extractedText: {
      confidence: "low",
      extractedAt,
      source: "ocr-placeholder",
      text: "",
    },
    status: "unsupported",
    summary:
      "Bilddatei wurde erkannt. Foto-/Scan-Erkennung ist vorbereitet, aber noch nicht aktiv.",
  };
}
