import type { ExtractedText } from "@lifepilot/shared";

export function createPdfExtractionPlaceholder(
  extractedAt: string,
): {
  errorMessage: string;
  extractedText: ExtractedText;
  status: "unsupported";
  summary: string;
} {
  return {
    errorMessage:
      "PDF-Texterkennung ist vorbereitet, aber noch nicht aktiv. LifePilot liest PDFs in dieser Phase nicht automatisch aus.",
    extractedText: {
      confidence: "low",
      extractedAt,
      source: "browser-pdf-placeholder",
      text: "",
    },
    status: "unsupported",
    summary:
      "PDF wurde erkannt. Der nächste saubere Schritt ist echte PDF-Textextraktion für normale textbasierte PDFs.",
  };
}
