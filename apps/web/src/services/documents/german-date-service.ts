export interface GermanDateMatch {
  dateIso: string;
  endDateIso?: string;
  index: number;
  originalText: string;
  type: "date" | "range";
}

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

export function findGermanDateMatches(text: string): GermanDateMatch[] {
  const normalizedText = text.replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  const matches: GermanDateMatch[] = [];
  const numericDate = String.raw`(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})`;
  const rangePattern = new RegExp(
    String.raw`\b${numericDate}\s*(?:bis|[-–])\s*(?:zum\s*)?${numericDate}\b`,
    "gi",
  );
  const numericPattern = new RegExp(String.raw`\b${numericDate}\b`, "g");
  const writtenPattern =
    /\b(\d{1,2})\.\s*(Januar|Februar|März|Maerz|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\s+(\d{2}|\d{4})\b/gi;

  for (const match of normalizedText.matchAll(rangePattern)) {
    const startDate = toIsoDate(match[3], match[2], match[1]);
    const endDate = toIsoDate(match[6], match[5], match[4]);

    if (!startDate || !endDate) {
      continue;
    }

    matches.push({
      dateIso: startDate,
      endDateIso: endDate,
      index: match.index ?? 0,
      originalText: match[0],
      type: "range",
    });
  }

  for (const match of normalizedText.matchAll(numericPattern)) {
    const dateIso = toIsoDate(match[3], match[2], match[1]);

    if (!dateIso || isInsideExistingMatch(matches, match.index ?? 0)) {
      continue;
    }

    matches.push({
      dateIso,
      index: match.index ?? 0,
      originalText: match[0],
      type: "date",
    });
  }

  for (const match of normalizedText.matchAll(writtenPattern)) {
    const month = germanMonths[match[2].toLowerCase()];
    const dateIso = month ? toIsoDate(match[3], String(month), match[1]) : undefined;

    if (!dateIso) {
      continue;
    }

    matches.push({
      dateIso,
      index: match.index ?? 0,
      originalText: match[0],
      type: "date",
    });
  }

  return matches.sort((left, right) => left.index - right.index);
}

export function formatIsoDateGerman(dateIso: string): string {
  const [year, month, day] = dateIso.split("-");

  return `${day}.${month}.${year}`;
}

export function cleanDocumentFileName(fileName: string): string {
  return fileName
    .replace(/\.[^.]+$/, "")
    .replace(/^(img|scan|scanner|document|doc|image)[-_ ]?\d*$/i, "")
    .replace(/^(img|scan|scanner|document|doc|image)[-_ ]?/i, "")
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toIsoDate(
  yearValue: string,
  monthValue: string,
  dayValue: string,
): string | undefined {
  const year = normalizeYear(Number(yearValue));
  const month = Number(monthValue);
  const day = Number(dayValue);
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

function normalizeYear(year: number): number {
  if (year >= 100) {
    return year;
  }

  return year >= 70 ? 1900 + year : 2000 + year;
}

function isInsideExistingMatch(matches: GermanDateMatch[], index: number): boolean {
  return matches.some(
    (match) =>
      index >= match.index && index <= match.index + match.originalText.length,
  );
}
