import { NextResponse } from "next/server";
import OpenAI from "openai";
import type { LifeBrainResult } from "../../../../src/services/brain/brain-types";
import {
  analyzeLifeBrainLocally,
  isValidLifeBrainResultCandidate,
  normalizeLifeBrainInput,
  sanitizeLifeBrainResult,
} from "../../../../src/services/brain/life-brain-orchestrator";

export const runtime = "nodejs";

const defaultOpenAiModel = "gpt-4.1-mini";

export async function GET() {
  return NextResponse.json({
    model: process.env.OPENAI_MODEL ?? defaultOpenAiModel,
    providerStatus: process.env.OPENAI_API_KEY ? "active" : "not_configured",
  });
}

export async function POST(request: Request) {
  const input = normalizeLifeBrainInput(await request.json().catch(() => ({})));
  const fallback = analyzeLifeBrainLocally(input);
  const model = process.env.OPENAI_MODEL ?? defaultOpenAiModel;

  if (!input.rawText.trim()) {
    return NextResponse.json(withFallbackDebug(fallback, "No input text provided"));
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      withFallbackDebug(fallback, "OPENAI_API_KEY missing"),
    );
  }

  try {
    const client = new OpenAI({
      apiKey,
      timeout: 15_000,
    });
    const response = await client.responses.create({
      input: JSON.stringify({
        fallbackGuidance: fallback,
        input,
      }),
      instructions: lifeBrainSystemPrompt,
      model,
      store: false,
      temperature: 0.1,
      text: {
        format: {
          description:
            "LifePilot Brain analysis result as one JSON object. No markdown or prose.",
          name: "lifepilot_life_brain_result",
          schema: lifeBrainResultJsonSchema,
          strict: true,
          type: "json_schema",
        },
      },
    });
    const content = response.output_text;

    if (!content) {
      return NextResponse.json(withFallbackDebug(fallback, "Invalid OpenAI JSON"));
    }

    let parsed: Partial<LifeBrainResult>;

    try {
      parsed = JSON.parse(content) as Partial<LifeBrainResult>;
    } catch {
      return NextResponse.json(withFallbackDebug(fallback, "Invalid OpenAI JSON"));
    }

    if (!isValidLifeBrainResultCandidate(parsed)) {
      return NextResponse.json(withFallbackDebug(fallback, "Invalid OpenAI JSON"));
    }

    return NextResponse.json(
      withOpenAiDebug(sanitizeLifeBrainResult(parsed, fallback), model),
    );
  } catch (error) {
    return NextResponse.json(
      withFallbackDebug(fallback, getSafeOpenAiFallbackReason(error)),
    );
  }
}

function withFallbackDebug(
  result: LifeBrainResult,
  fallbackReason: string,
): LifeBrainResult {
  return {
    ...result,
    analysisMode: "fallback",
    fallbackReason,
    modelUsed: undefined,
  };
}

function withOpenAiDebug(
  result: LifeBrainResult,
  modelUsed: string,
): LifeBrainResult {
  return {
    ...result,
    analysisMode: "openai",
    fallbackReason: undefined,
    modelUsed,
  };
}

function getSafeOpenAiFallbackReason(error: unknown): string {
  if (error instanceof Error && error.name) {
    return `OpenAI request failed: ${error.name.slice(0, 80)}`;
  }

  return "OpenAI request failed";
}

const lifeBrainSystemPrompt = `
Du bist LifePilot Brain, die zentrale Intelligenzschicht für private Lebensadministration.
Du analysierst deutsche Alltagstexte wie Briefe, Rechnungen, Verträge, Kündigungen, Amtsschreiben, Jobcenter-Schreiben, E-Mails, Nachrichtenverläufe und Kontoauszüge.

Antworte ausschließlich als JSON im vorgegebenen Schema.
Gib keine Markdown-Blöcke, keine Code-Fences, keine Erklärungen und keinen Text außerhalb des JSON-Objekts aus.
Sprich in einfachen, ruhigen deutschen Formulierungen.
Extrahiere nur nützliche reale Handlungen.
Erfinde keine Fristen, Beträge, Personen oder Organisationen.
Behandle nicht jedes Datum als Frist.
Trenne Kontextdaten von handlungsrelevanten Daten.
Gib genau einen starken empfohlenen nächsten Schritt.
Risikoreiche Handlungen werden nur vorbereitet und erfordern Bestätigung.
Keine externen Aktionen ausführen.

False-Positive-Regeln:
- Kontoauszüge sind normalerweise nur zum Ablegen. Buchungsdaten sind keine Fristen.
- Verträge: Vertragsbeginn ist Kontext. Kündigungsfrist nur bei klarer Kündigungsformulierung.
- Rechnungen: Zahlungsfrist nur bei "zahlbar bis", "bitte zahlen Sie bis", "spätestens bis", "fällig am" oder ähnlicher Zahlungsformulierung.
- Amtsschreiben: Widerspruch, Einspruch, Unterlagen einreichen, Nachreichung, Rückmeldung und Termin sind handlungsrelevant.
- E-Mails: Erkenne Antwortbedarf, angeforderte Unterlagen, Fristen, Termine und ob ein Antwortentwurf hilfreich ist.

Setze rawDetailsCollapsed immer auf true.
`.trim();

const prioritySchema = {
  enum: ["low", "medium", "high", "critical"],
  type: "string",
};

const lifeBrainResultJsonSchema = {
  additionalProperties: false,
  properties: {
    actions: {
      items: {
        additionalProperties: false,
        properties: {
          description: { type: "string" },
          dueDate: { type: ["string", "null"] },
          id: { type: "string" },
          priority: prioritySchema,
          requiresConfirmation: { type: "boolean" },
          time: { type: ["string", "null"] },
          title: { type: "string" },
          type: {
            enum: [
              "pay",
              "reply",
              "attend_appointment",
              "cancel_contract",
              "create_reminder",
              "create_task",
              "review_document",
              "provide_missing_info",
              "archive_only",
              "call_someone",
              "send_document",
              "wait",
              "no_action",
            ],
            type: "string",
          },
        },
        required: [
          "description",
          "dueDate",
          "id",
          "priority",
          "requiresConfirmation",
          "time",
          "title",
          "type",
        ],
        type: "object",
      },
      type: "array",
    },
    appointments: {
      items: {
        additionalProperties: false,
        properties: {
          date: { type: "string" },
          description: { type: "string" },
          location: { type: ["string", "null"] },
          shouldGenerateIcs: { type: "boolean" },
          time: { type: ["string", "null"] },
          title: { type: "string" },
        },
        required: [
          "date",
          "description",
          "location",
          "shouldGenerateIcs",
          "time",
          "title",
        ],
        type: "object",
      },
      type: "array",
    },
    brainVersion: { type: "string" },
    category: { type: "string" },
    clarificationQuestion: { type: ["string", "null"] },
    confidence: { type: "number" },
    deadlines: {
      items: {
        additionalProperties: false,
        properties: {
          date: { type: "string" },
          priority: prioritySchema,
          reason: { type: "string" },
          shouldCreateReminder: { type: "boolean" },
          sourceText: { type: "string" },
          time: { type: ["string", "null"] },
          title: { type: "string" },
        },
        required: [
          "date",
          "priority",
          "reason",
          "shouldCreateReminder",
          "sourceText",
          "time",
          "title",
        ],
        type: "object",
      },
      type: "array",
    },
    detectedAmounts: {
      items: {
        additionalProperties: false,
        properties: {
          amount: { type: ["number", "null"] },
          context: { type: "string" },
          currency: { type: "string" },
          rawText: { type: "string" },
        },
        required: ["amount", "context", "currency", "rawText"],
        type: "object",
      },
      type: "array",
    },
    detectedDates: {
      items: {
        additionalProperties: false,
        properties: {
          context: { type: "string" },
          isActionable: { type: "boolean" },
          isoDate: { type: ["string", "null"] },
          rawText: { type: "string" },
          reason: { type: "string" },
          time: { type: ["string", "null"] },
        },
        required: [
          "context",
          "isActionable",
          "isoDate",
          "rawText",
          "reason",
          "time",
        ],
        type: "object",
      },
      type: "array",
    },
    detectedLanguage: { enum: ["de", "en", "unknown"], type: "string" },
    detectedOrganizations: { items: { type: "string" }, type: "array" },
    detectedPeople: { items: { type: "string" }, type: "array" },
    documentType: {
      enum: [
        "invoice",
        "contract",
        "termination",
        "bank_statement",
        "official_letter",
        "appointment_notice",
        "payment_reminder",
        "insurance",
        "jobcenter_or_employment_agency",
        "tax",
        "rental",
        "medical",
        "legal_notice",
        "email_request",
        "email_thread",
        "conversation",
        "unknown",
      ],
      type: "string",
    },
    importantFacts: {
      items: {
        additionalProperties: false,
        properties: {
          importance: { enum: ["low", "medium", "high"], type: "string" },
          label: { type: "string" },
          value: { type: "string" },
        },
        required: ["importance", "label", "value"],
        type: "object",
      },
      type: "array",
    },
    inputType: { type: "string" },
    rawDetailsCollapsed: { enum: [true], type: "boolean" },
    recommendedNextStep: {
      additionalProperties: false,
      properties: {
        actionType: { type: "string" },
        description: { type: "string" },
        title: { type: "string" },
      },
      required: ["actionType", "description", "title"],
      type: "object",
    },
    reminders: {
      items: {
        additionalProperties: false,
        properties: {
          reason: { type: "string" },
          remindAt: { type: "string" },
          title: { type: "string" },
        },
        required: ["reason", "remindAt", "title"],
        type: "object",
      },
      type: "array",
    },
    requiresUserConfirmation: { type: "boolean" },
    riskLevel: {
      enum: ["none", "low", "medium", "high", "critical"],
      type: "string",
    },
    shouldArchiveOnly: { type: "boolean" },
    shouldCreateReminder: { type: "boolean" },
    shouldCreateTask: { type: "boolean" },
    shouldGenerateIcs: { type: "boolean" },
    shortSummary: { type: "string" },
    source: { type: "string" },
    suggestedReply: {
      anyOf: [
        {
          additionalProperties: false,
          properties: {
            body: { type: "string" },
            subject: { type: "string" },
            tone: { enum: ["formal", "neutral", "friendly"], type: "string" },
          },
          required: ["body", "subject", "tone"],
          type: "object",
        },
        { type: "null" },
      ],
    },
    tasks: {
      items: {
        additionalProperties: false,
        properties: {
          description: { type: "string" },
          dueDate: { type: ["string", "null"] },
          priority: prioritySchema,
          title: { type: "string" },
        },
        required: ["description", "dueDate", "priority", "title"],
        type: "object",
      },
      type: "array",
    },
    title: { type: "string" },
    urgency: {
      enum: ["none", "low", "medium", "high", "critical"],
      type: "string",
    },
    userFriendlyExplanation: { type: "string" },
  },
  required: [
    "actions",
    "appointments",
    "brainVersion",
    "category",
    "clarificationQuestion",
    "confidence",
    "deadlines",
    "detectedAmounts",
    "detectedDates",
    "detectedLanguage",
    "detectedOrganizations",
    "detectedPeople",
    "documentType",
    "importantFacts",
    "inputType",
    "rawDetailsCollapsed",
    "recommendedNextStep",
    "reminders",
    "requiresUserConfirmation",
    "riskLevel",
    "shouldArchiveOnly",
    "shouldCreateReminder",
    "shouldCreateTask",
    "shouldGenerateIcs",
    "shortSummary",
    "source",
    "suggestedReply",
    "tasks",
    "title",
    "urgency",
    "userFriendlyExplanation",
  ],
  type: "object",
};
