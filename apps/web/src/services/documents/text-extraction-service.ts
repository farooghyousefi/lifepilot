import type { ExtractedText } from "@lifepilot/shared";

export async function extractTextFromPlainTextFile(
  file: File,
  extractedAt: string,
): Promise<
  | { extractedText: ExtractedText; status: "completed"; summary: string }
  | { errorMessage: string; status: "unsupported"; summary: string }
> {
  const text = await file.text();

  if (looksLikeRtf(text)) {
    return {
      errorMessage:
        "RTF-Inhalt erkannt. LifePilot zeigt diesen Rohtext nicht an, damit keine Formatierungszeichen als Inhalt erscheinen.",
      status: "unsupported",
      summary:
        "RTF-Erkennung ist vorbereitet. Bitte nutze aktuell TXT oder ein normales PDF; saubere RTF-Textextraktion kommt später.",
    };
  }

  return {
    extractedText: {
      confidence: "high",
      extractedAt,
      source: "browser-text-file",
      text: normalizePlainText(text),
    },
    status: "completed",
    summary:
      "Text wurde lokal im Browser aus einer TXT-Datei gelesen. KI-Analyse ist noch nicht aktiv.",
  };
}

function looksLikeRtf(text: string): boolean {
  return text.trimStart().startsWith("{\\rtf");
}

function normalizePlainText(text: string): string {
  return text.split("\u0000").join("").trim();
}
