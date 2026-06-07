import { NextResponse } from "next/server";
import OpenAI from "openai";
import type {
  BrainProviderStatus,
  DocumentBrainInput,
  DocumentBrainResult,
} from "@lifepilot/shared";

import {
  createDeterministicDocumentBrainResult,
  documentBrainSystemPrompt,
  sanitizeDocumentBrainResult,
} from "../../../../src/services/documents";

export const runtime = "nodejs";

const defaultOpenAiModel = "gpt-4.1-mini";

export async function GET() {
  return NextResponse.json({
    model: process.env.OPENAI_MODEL ?? defaultOpenAiModel,
    providerStatus: process.env.OPENAI_API_KEY ? "active" : "not_configured",
  });
}

export async function POST(request: Request) {
  const input = normalizeDocumentBrainInput(await request.json().catch(() => ({})));

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      createDeterministicDocumentBrainResult(input, "not_configured"),
    );
  }

  const fallback = createDeterministicDocumentBrainResult(input, "fallback");

  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 12_000,
    });
    const completion = await client.chat.completions.create({
      messages: [
        {
          content: documentBrainSystemPrompt,
          role: "system",
        },
        {
          content: JSON.stringify(input),
          role: "user",
        },
      ],
      model: process.env.OPENAI_MODEL ?? defaultOpenAiModel,
      response_format: {
        json_schema: {
          name: "lifepilot_document_brain_result",
          schema: documentBrainResultJsonSchema,
          strict: false,
        },
        type: "json_schema",
      },
      temperature: 0.2,
    });
    const content = completion.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json(createFallback(input, "invalid_output"));
    }

    const parsed = JSON.parse(content) as Partial<DocumentBrainResult>;

    return NextResponse.json(
      sanitizeDocumentBrainResult({
        ...fallback,
        ...parsed,
        needsUserConfirmation: true,
        provider: "openai",
        providerStatus: "active",
      }),
    );
  } catch {
    return NextResponse.json(createFallback(input, "error"));
  }
}

function createFallback(
  input: DocumentBrainInput,
  providerStatus: BrainProviderStatus,
): DocumentBrainResult {
  return createDeterministicDocumentBrainResult(input, providerStatus);
}

function normalizeDocumentBrainInput(value: unknown): DocumentBrainInput {
  const candidate = isRecord(value) ? value : {};

  return {
    deterministicDates: Array.isArray(candidate.deterministicDates)
      ? candidate.deterministicDates
      : [],
    deterministicFacts: isRecord(candidate.deterministicFacts)
      ? (candidate.deterministicFacts as unknown as DocumentBrainInput["deterministicFacts"])
      : undefined,
    extractedText:
      typeof candidate.extractedText === "string"
        ? candidate.extractedText.slice(0, 20_000)
        : undefined,
    filename:
      typeof candidate.filename === "string"
        ? candidate.filename.slice(0, 300)
        : undefined,
    locale: "de-DE",
    mimeType:
      typeof candidate.mimeType === "string"
        ? candidate.mimeType.slice(0, 120)
        : undefined,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

const evidenceSchema = {
  additionalProperties: false,
  properties: {
    dateIso: { type: "string" },
    field: { type: "string" },
    label: { type: "string" },
    snippet: { type: "string" },
  },
  required: ["label"],
  type: "object",
};

const actionSchema = {
  additionalProperties: false,
  properties: {
    explanation: { type: "string" },
    label: { type: "string" },
    requiresConfirmation: { const: true, type: "boolean" },
    sourceEvidence: evidenceSchema,
    suggestedDate: { type: "string" },
    type: {
      enum: [
        "create_reminder",
        "create_task",
        "save_document",
        "save_contract",
        "review_details",
      ],
      type: "string",
    },
  },
  required: ["explanation", "label", "requiresConfirmation", "type"],
  type: "object",
};

const documentBrainResultJsonSchema = {
  additionalProperties: false,
  properties: {
    confidence: { enum: ["low", "medium", "high"], type: "string" },
    hiddenDetails: {
      items: {
        additionalProperties: false,
        properties: {
          label: { type: "string" },
          section: {
            enum: [
              "raw_text",
              "all_dates",
              "all_facts",
              "technical",
              "source_evidence",
            ],
            type: "string",
          },
          value: { type: "string" },
        },
        required: ["label", "section", "value"],
        type: "object",
      },
      type: "array",
    },
    importantFindings: {
      items: {
        additionalProperties: false,
        properties: {
          label: { type: "string" },
          sourceEvidence: evidenceSchema,
          value: { type: "string" },
        },
        required: ["label", "value"],
        type: "object",
      },
      maxItems: 3,
      type: "array",
    },
    intent: {
      enum: [
        "employment_termination",
        "invoice",
        "contract",
        "insurance",
        "authority_letter",
        "identity_document",
        "general_document",
      ],
      type: "string",
    },
    needsUserConfirmation: { type: "boolean" },
    optionalQuestion: {
      additionalProperties: false,
      properties: {
        id: { type: "string" },
        label: { type: "string" },
        placeholder: { type: "string" },
        question: { type: "string" },
        required: { type: "boolean" },
        sourceEvidence: evidenceSchema,
      },
      required: ["id", "label", "question", "required"],
      type: "object",
    },
    primaryButtons: {
      items: actionSchema,
      maxItems: 3,
      type: "array",
    },
    provider: { enum: ["deterministic", "openai"], type: "string" },
    providerStatus: {
      enum: ["active", "fallback", "not_configured", "error", "invalid_output"],
      type: "string",
    },
    recommendedAction: actionSchema,
    riskLevel: { enum: ["low", "medium", "high"], type: "string" },
    simpleSummary: { type: "string" },
    sourceEvidence: {
      items: evidenceSchema,
      type: "array",
    },
    title: { type: "string" },
  },
  required: [
    "confidence",
    "hiddenDetails",
    "importantFindings",
    "intent",
    "needsUserConfirmation",
    "primaryButtons",
    "provider",
    "providerStatus",
    "recommendedAction",
    "riskLevel",
    "simpleSummary",
    "sourceEvidence",
    "title",
  ],
  type: "object",
};
