import type { ExtractedText } from "@lifepilot/shared";

export async function extractTextFromPdfFile(
  file: File,
  extractedAt: string,
): Promise<
  | {
      extractedText: ExtractedText;
      status: "completed";
      summary: string;
    }
  | ReturnType<typeof createPdfNoTextPlaceholder>
> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.mjs",
    import.meta.url,
  ).toString();

  const pdf = await pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
  }).promise;
  const pageTexts: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) =>
        "str" in item && typeof item.str === "string" ? item.str : "",
      )
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (pageText) {
      pageTexts.push(pageText);
    }
  }

  const text = pageTexts.join("\n\n").trim();

  if (!text) {
    return createPdfNoTextPlaceholder(extractedAt);
  }

  return {
    extractedText: {
      confidence: "medium",
      extractedAt,
      source: "browser-pdf-text",
      text,
    },
    status: "completed",
    summary: "PDF-Text wurde erkannt.",
  };
}

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
      "PDF-Text nicht verfügbar oder noch nicht aktiv.",
    extractedText: {
      confidence: "low",
      extractedAt,
      source: "browser-pdf-placeholder",
      text: "",
    },
    status: "unsupported",
    summary:
      "PDF-Analyse vorbereitet. Wenn direkt lesbarer Text verfügbar ist, versucht LifePilot ihn lokal zu lesen.",
  };
}

export function createPdfNoTextPlaceholder(extractedAt: string): {
  errorMessage: string;
  extractedText: ExtractedText;
  status: "unsupported";
  summary: string;
} {
  return {
    errorMessage:
      "Dieses PDF enthält keinen direkt lesbaren Text. Für Fotos oder Scans wird später OCR benötigt.",
    extractedText: {
      confidence: "low",
      extractedAt,
      source: "browser-pdf-placeholder",
      text: "",
    },
    status: "unsupported",
    summary: "PDF enthält keinen direkt lesbaren Text.",
  };
}
