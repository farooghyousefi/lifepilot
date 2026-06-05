import type {
  ContractCategory,
  DocumentFact,
  ExtractedDocumentFacts,
  FactConfidence,
  RequiredFactKey,
} from "@lifepilot/shared";

import { factLabels } from "../knowledge";

interface FactExtractionInput {
  documentId: string;
  documentName?: string;
  extractedAt: string;
  text: string;
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

const providerKeywords = [
  "Vodafone",
  "Telekom",
  "1&1",
  "O2",
  "E.ON",
  "Vattenfall",
  "EnBW",
  "Stadtwerke",
  "AXA",
  "Allianz",
  "HUK",
  "ERGO",
  "AOK",
  "TK",
  "Barmer",
  "Finanzamt",
  "Jobcenter",
  "Bürgeramt",
  "Buergeramt",
  "Sparkasse",
  "Volksbank",
  "Commerzbank",
  "Deutsche Bank",
];

const categoryKeywords: Array<{
  category: ContractCategory;
  confidence: FactConfidence;
  keywords: string[];
}> = [
  { category: "internet", confidence: "high", keywords: ["internet", "dsl", "router", "wlan", "glasfaser"] },
  { category: "mobile", confidence: "high", keywords: ["mobilfunk", "sim", "handyvertrag", "rufnummer"] },
  { category: "electricity", confidence: "high", keywords: ["strom", "energie", "abschlag", "kwh"] },
  { category: "gas", confidence: "high", keywords: ["gas", "erdgas"] },
  { category: "insurance", confidence: "high", keywords: ["versicherung", "kfz", "haftpflicht", "hausrat", "rechtsschutz", "police", "policennummer"] },
  { category: "rent", confidence: "high", keywords: ["miete", "mietvertrag", "nebenkosten", "vermieter"] },
  { category: "authority", confidence: "high", keywords: ["jobcenter", "finanzamt", "bürgeramt", "buergeramt", "krankenkasse", "bescheid", "aktenzeichen"] },
  { category: "banking", confidence: "medium", keywords: ["bank", "konto", "iban"] },
  { category: "loan", confidence: "medium", keywords: ["kredit", "darlehen", "rate"] },
  { category: "subscription", confidence: "medium", keywords: ["abo", "subscription", "mitgliedschaft"] },
  { category: "tax", confidence: "medium", keywords: ["steuer", "finanzamt"] },
  { category: "healthcare", confidence: "medium", keywords: ["krankenkasse", "gesundheit", "patient"] },
];

export function extractDocumentFactsFromText({
  documentId,
  documentName,
  extractedAt,
  text,
}: FactExtractionInput): ExtractedDocumentFacts {
  const normalizedText = text.replace(/\s+/g, " ").trim();
  const facts: Partial<Record<RequiredFactKey, DocumentFact>> = {};
  const category = detectCategory(normalizedText);

  if (category) {
    facts.category = createFact({
      confidence: category.confidence,
      key: "category",
      sourceSnippet: category.sourceSnippet,
      updatedAt: extractedAt,
      value: category.category,
    });
  }

  detectProvider(normalizedText, extractedAt, facts);
  detectIdentifiers(normalizedText, extractedAt, facts);
  detectAmounts(normalizedText, extractedAt, facts, category?.category);
  detectDates(normalizedText, extractedAt, facts);
  detectTerms(normalizedText, extractedAt, facts);
  detectAuthorityAction(normalizedText, extractedAt, facts);
  detectInsuranceType(normalizedText, extractedAt, facts);

  return {
    category: category?.category,
    createdAt: extractedAt,
    documentId,
    documentName,
    facts,
    updatedAt: extractedAt,
  };
}

function detectProvider(
  text: string,
  updatedAt: string,
  facts: Partial<Record<RequiredFactKey, DocumentFact>>,
): void {
  const explicitMatch = text.match(
    /\b(?:Anbieter|Unternehmen|Vertragspartner|Vermieter|Behörde|Behoerde)\s*[:\-]\s*([A-ZÄÖÜ][\wÄÖÜäöüß&.\- ]{2,60})/u,
  );

  if (explicitMatch?.[1]) {
    const value = cleanupValue(explicitMatch[1]);
    facts.provider = createFact({
      confidence: "medium",
      key: "provider",
      sourceSnippet: getContext(text, explicitMatch.index ?? 0, explicitMatch[0]),
      updatedAt,
      value,
    });
    return;
  }

  const provider = providerKeywords.find((keyword) =>
    text.toLowerCase().includes(keyword.toLowerCase()),
  );

  if (!provider) {
    return;
  }

  const index = text.toLowerCase().indexOf(provider.toLowerCase());
  const categoryKey =
    ["Finanzamt", "Jobcenter", "Bürgeramt", "Buergeramt"].includes(provider)
      ? "authorityName"
      : "provider";

  facts[categoryKey] = createFact({
    confidence: "medium",
    key: categoryKey,
    sourceSnippet: getContext(text, index, provider),
    updatedAt,
    value: provider,
  });
}

function detectIdentifiers(
  text: string,
  updatedAt: string,
  facts: Partial<Record<RequiredFactKey, DocumentFact>>,
): void {
  const patterns: Array<{ key: RequiredFactKey; pattern: RegExp }> = [
    { key: "customerNumber", pattern: /\b(?:Kundennummer|Kunden-Nr\.?|Kundennr\.?)\s*[:\-]?\s*([A-Z0-9\-./]{4,})/iu },
    { key: "contractNumber", pattern: /\b(?:Vertragsnummer|Vertrag Nr\.?)\s*[:\-]?\s*([A-Z0-9\-./]{4,})/iu },
    { key: "invoiceNumber", pattern: /\b(?:Rechnungsnummer|Rechnung Nr\.?)\s*[:\-]?\s*([A-Z0-9\-./]{4,})/iu },
    { key: "fileNumber", pattern: /\b(?:Aktenzeichen|Geschäftszeichen|Geschaeftszeichen)\s*[:\-]?\s*([A-Z0-9\-./]{4,})/iu },
    { key: "policyNumber", pattern: /\b(?:Versicherungsnummer|Policennummer|Police Nr\.?)\s*[:\-]?\s*([A-Z0-9\-./]{4,})/iu },
  ];

  patterns.forEach(({ key, pattern }) => {
    const match = text.match(pattern);

    if (!match?.[1]) {
      return;
    }

    facts[key] = createFact({
      confidence: "high",
      key,
      sourceSnippet: getContext(text, match.index ?? 0, match[0]),
      updatedAt,
      value: cleanupValue(match[1]),
    });
  });
}

function detectAmounts(
  text: string,
  updatedAt: string,
  facts: Partial<Record<RequiredFactKey, DocumentFact>>,
  category?: ContractCategory,
): void {
  const amountPattern =
    /\b(\d{1,3}(?:\.\d{3})*(?:,\d{2})|\d+(?:,\d{2})?)\s*(?:€|EUR)\b/gi;
  const matches = [...text.matchAll(amountPattern)];

  if (matches.length === 0) {
    return;
  }

  const bestMatch =
    matches.find((match) =>
      getContext(text, match.index ?? 0, match[0])
        .toLowerCase()
        .match(/monatlich|abschlag|beitrag|grundpreis|miete/),
    ) ?? matches[0];
  const context = getContext(text, bestMatch.index ?? 0, bestMatch[0]);
  const normalizedContext = context.toLowerCase();
  const key =
    category === "rent"
      ? "monthlyRent"
      : normalizedContext.includes("abschlag")
        ? "monthlyPayment"
        : normalizedContext.includes("jähr") || normalizedContext.includes("jaehr")
          ? "yearlyEstimate"
          : normalizedContext.includes("monat") ||
              normalizedContext.includes("beitrag") ||
              normalizedContext.includes("grundpreis")
            ? "monthlyPrice"
            : "amount";

  facts[key] = createFact({
    confidence: key === "amount" ? "medium" : "high",
    key,
    sourceSnippet: context,
    updatedAt,
    value: bestMatch[0],
  });

  if (
    normalizedContext.includes("monatlich") ||
    key === "monthlyPrice" ||
    key === "monthlyPayment" ||
    key === "monthlyRent"
  ) {
    facts.paymentInterval = createFact({
      confidence: "high",
      key: "paymentInterval",
      sourceSnippet: context,
      updatedAt,
      value: "monatlich",
    });
  }

  if (normalizedContext.includes("jähr") || normalizedContext.includes("jaehr")) {
    facts.paymentInterval = createFact({
      confidence: "high",
      key: "paymentInterval",
      sourceSnippet: context,
      updatedAt,
      value: "jährlich",
    });
  }
}

function detectDates(
  text: string,
  updatedAt: string,
  facts: Partial<Record<RequiredFactKey, DocumentFact>>,
): void {
  const dateMatches = [...text.matchAll(/\b(\d{1,2})\.(\d{1,2})\.(\d{4})\b/g)];
  const writtenDateMatches = [
    ...text.matchAll(
      /\b(\d{1,2})\.\s*(Januar|Februar|März|Maerz|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\s+(\d{4})\b/gi,
    ),
  ];

  dateMatches.forEach((match) => {
    const isoDate = toIsoDate(Number(match[3]), Number(match[2]), Number(match[1]));

    if (!isoDate) {
      return;
    }

    addDateFact(text, updatedAt, facts, match.index ?? 0, match[0], isoDate);
  });

  writtenDateMatches.forEach((match) => {
    const month = germanMonths[match[2].toLowerCase()];
    const isoDate = month
      ? toIsoDate(Number(match[3]), month, Number(match[1]))
      : undefined;

    if (!isoDate) {
      return;
    }

    addDateFact(text, updatedAt, facts, match.index ?? 0, match[0], isoDate);
  });
}

function addDateFact(
  text: string,
  updatedAt: string,
  facts: Partial<Record<RequiredFactKey, DocumentFact>>,
  index: number,
  originalValue: string,
  isoDate: string,
): void {
  const context = getContext(text, index, originalValue);
  const normalizedContext = context.toLowerCase();
  const key = normalizedContext.match(/kündigung|kuendigung/)
    ? "cancellationDate"
    : normalizedContext.match(/fällig|faellig|zahlbar|zahlung|bis zum/)
      ? "dueDate"
      : normalizedContext.match(/vertragsbeginn|beginn|start/)
        ? "startDate"
        : normalizedContext.match(/vertragsende|ende|laufzeitende/)
          ? "endDate"
          : normalizedContext.match(/verlängerung|verlaengerung|renewal/)
            ? "renewalDate"
            : normalizedContext.match(/termin/)
              ? "appointmentDate"
              : "dueDate";

  if (facts[key]?.confidence === "high") {
    return;
  }

  facts[key] = createFact({
    confidence: key === "dueDate" ? "medium" : "high",
    key,
    sourceSnippet: context,
    updatedAt,
    value: isoDate,
  });
}

function detectTerms(
  text: string,
  updatedAt: string,
  facts: Partial<Record<RequiredFactKey, DocumentFact>>,
): void {
  const termMatch = text.match(/\b(?:Laufzeit|Mindestlaufzeit)\s*[:\-]?\s*(\d{1,3})\s*(Monate|Monat|Jahre|Jahr)\b/iu);

  if (termMatch?.[1] && termMatch[2]) {
    const months = termMatch[2].toLowerCase().startsWith("jahr")
      ? Number(termMatch[1]) * 12
      : Number(termMatch[1]);
    const context = getContext(text, termMatch.index ?? 0, termMatch[0]);

    facts.minimumTerm = createFact({
      confidence: "high",
      key: "minimumTerm",
      sourceSnippet: context,
      updatedAt,
      value: termMatch[0],
    });
    facts.termMonths = createFact({
      confidence: "high",
      key: "termMonths",
      sourceSnippet: context,
      updatedAt,
      value: String(months),
    });
  }

  const cancellationPeriodMatch = text.match(
    /\b(?:Kündigungsfrist|Kuendigungsfrist|Frist)\s*[:\-]?\s*(\d{1,2})\s*(Monate|Monat|Wochen|Woche|Tage|Tag)\b/iu,
  );

  if (cancellationPeriodMatch?.[0]) {
    facts.cancellationPeriod = createFact({
      confidence: "high",
      key: "cancellationPeriod",
      sourceSnippet: getContext(
        text,
        cancellationPeriodMatch.index ?? 0,
        cancellationPeriodMatch[0],
      ),
      updatedAt,
      value: cancellationPeriodMatch[0],
    });
  }
}

function detectAuthorityAction(
  text: string,
  updatedAt: string,
  facts: Partial<Record<RequiredFactKey, DocumentFact>>,
): void {
  const match = text.match(
    /\b(?:reichen Sie|senden Sie|legen Sie|antworten Sie|bitte)\s+([^.!?]{8,140})[.!?]/iu,
  );

  if (!match?.[1]) {
    return;
  }

  facts.requestedAction = createFact({
    confidence: "low",
    key: "requestedAction",
    sourceSnippet: getContext(text, match.index ?? 0, match[0]),
    updatedAt,
    value: cleanupValue(match[1]),
  });
}

function detectInsuranceType(
  text: string,
  updatedAt: string,
  facts: Partial<Record<RequiredFactKey, DocumentFact>>,
): void {
  const normalizedText = text.toLowerCase();
  const match = [
    "kfz",
    "haftpflicht",
    "hausrat",
    "rechtsschutz",
    "leben",
    "kranken",
  ].find((item) => normalizedText.includes(item));

  if (!match) {
    return;
  }

  facts.insuranceType = createFact({
    confidence: "medium",
    key: "insuranceType",
    sourceSnippet: getContext(text, normalizedText.indexOf(match), match),
    updatedAt,
    value: match,
  });
}

function detectCategory(text: string):
  | {
      category: ContractCategory;
      confidence: FactConfidence;
      sourceSnippet: string;
    }
  | undefined {
  const normalizedText = text.toLowerCase();
  const hit = categoryKeywords.find((entry) =>
    entry.keywords.some((keyword) => normalizedText.includes(keyword)),
  );

  if (!hit) {
    return undefined;
  }

  const keyword =
    hit.keywords.find((item) => normalizedText.includes(item)) ?? hit.keywords[0];

  return {
    category: hit.category,
    confidence: hit.confidence,
    sourceSnippet: getContext(text, normalizedText.indexOf(keyword), keyword),
  };
}

function createFact({
  confidence,
  key,
  sourceSnippet,
  updatedAt,
  value,
}: {
  confidence: FactConfidence;
  key: RequiredFactKey;
  sourceSnippet?: string;
  updatedAt: string;
  value: string;
}): DocumentFact {
  return {
    confidence,
    key,
    label: factLabels[key],
    sourceSnippet,
    updatedAt,
    value,
    verificationStatus: "extracted",
  };
}

function getContext(text: string, index: number, value: string): string {
  const start = Math.max(0, index - 70);
  const end = Math.min(text.length, index + value.length + 70);

  return text.slice(start, end).trim();
}

function cleanupValue(value: string): string {
  return value.replace(/\s+/g, " ").replace(/[.,;:]$/, "").trim();
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
