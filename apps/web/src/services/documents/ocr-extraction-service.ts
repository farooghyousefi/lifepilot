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
    errorMessage: "Foto/OCR kommt als nächster Schritt.",
    extractedText: {
      confidence: "low",
      extractedAt,
      source: "ocr-placeholder",
      text: "",
    },
    status: "unsupported",
    summary:
      "Bilddatei wurde erkannt. OCR für Briefe, Fotos und Scans ist vorbereitet, aber noch nicht implementiert.",
  };
}
