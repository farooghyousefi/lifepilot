import {
  detectLifeBrainActions,
  detectLifeBrainAmounts,
  formatIsoDateGerman,
} from "./action-detection-service";
import {
  defaultLifeBrainUserPreferences,
  lifeBrainVersion,
  type LifeBrainAction,
  type LifeBrainDocumentType,
  type LifeBrainInput,
  type LifeBrainPriority,
  type LifeBrainRecommendedNextStep,
  type LifeBrainResult,
  type LifeBrainRiskLevel,
  type LifeBrainSuggestedReply,
  type LifeBrainUrgency,
} from "./brain-types";

const documentTypeLabels: Record<LifeBrainDocumentType, string> = {
  appointment_notice: "Terminbenachrichtigung",
  bank_statement: "Kontoauszug",
  contract: "Vertrag",
  conversation: "Nachrichtenverlauf",
  email_request: "E-Mail mit möglicher Aufgabe",
  email_thread: "E-Mail-Verlauf",
  insurance: "Versicherungsschreiben",
  invoice: "Rechnung",
  jobcenter_or_employment_agency: "Jobcenter- oder Agentur-Schreiben",
  legal_notice: "Rechtlich wirkendes Schreiben",
  medical: "Gesundheitsschreiben",
  official_letter: "Behördenschreiben",
  payment_reminder: "Zahlungserinnerung",
  rental: "Miet- oder Wohnschreiben",
  tax: "Steuerschreiben",
  termination: "Kündigungsschreiben",
  unknown: "Unklares Dokument",
};

export function createLifeBrainFallbackResult(input: LifeBrainInput): LifeBrainResult {
  const preferences = {
    ...defaultLifeBrainUserPreferences,
    ...input.userPreferences,
  };
  const detection = detectLifeBrainActions(input);
  const amounts = detectLifeBrainAmounts(input.rawText);
  const actionableActions = detection.actions.filter(isRealAction);
  const urgency = getUrgency(actionableActions);
  const riskLevel = getRiskLevel(actionableActions, detection.documentType);
  const shouldArchiveOnly =
    detection.actions.every((action) => !isRealAction(action)) ||
    (detection.documentType === "bank_statement" &&
      preferences.archiveBankStatementsByDefault &&
      actionableActions.length === 0);
  const shouldGenerateIcs =
    detection.appointments.some((appointment) => appointment.shouldGenerateIcs) ||
    detection.deadlines.some((deadline) => deadline.shouldCreateReminder);
  const recommendedNextStep = createRecommendedNextStep({
    actions: detection.actions,
    documentType: detection.documentType,
    shouldArchiveOnly,
    shouldGenerateIcs,
  });
  const suggestedReply =
    preferences.generateReplyDraftsForEmails &&
    detection.actions.some((action) =>
      ["reply", "send_document", "provide_missing_info"].includes(action.type),
    )
      ? createSuggestedReply(input, detection.actions)
      : null;

  return {
    actions: detection.actions,
    appointments: detection.appointments,
    brainVersion: lifeBrainVersion,
    category: detection.category,
    clarificationQuestion: createClarificationQuestion(detection.actions),
    confidence: shouldArchiveOnly ? 0.78 : getConfidence(detection.actions),
    deadlines: detection.deadlines,
    detectedAmounts: amounts,
    detectedDates: detection.dates,
    detectedLanguage: detectLanguage(input.rawText),
    detectedOrganizations: detection.organizations,
    detectedPeople: detection.people,
    documentType: detection.documentType,
    importantFacts: createImportantFacts({
      amounts,
      input,
      resultType: detection.documentType,
      topAction: actionableActions[0],
    }),
    inputType: input.inputType,
    rawDetailsCollapsed: true,
    recommendedNextStep,
    reminders: detection.reminders,
    requiresUserConfirmation: actionableActions.some(
      (action) => action.requiresConfirmation,
    ),
    riskLevel,
    shouldArchiveOnly,
    shouldCreateReminder:
      !shouldArchiveOnly &&
      detection.deadlines.some((deadline) => deadline.shouldCreateReminder),
    shouldCreateTask: !shouldArchiveOnly && detection.tasks.length > 0,
    shouldGenerateIcs,
    shortSummary: createShortSummary({
      actions: actionableActions,
      documentType: detection.documentType,
      shouldArchiveOnly,
    }),
    source: input.source,
    suggestedReply,
    tasks: detection.tasks,
    title: createTitle(input, detection.documentType),
    urgency,
    userFriendlyExplanation: createExplanation({
      actions: actionableActions,
      documentType: detection.documentType,
      shouldArchiveOnly,
    }),
  };
}

function createTitle(input: LifeBrainInput, documentType: LifeBrainDocumentType): string {
  if (input.metadata?.subject) {
    return input.metadata.subject;
  }

  return documentTypeLabels[documentType];
}

function createShortSummary({
  actions,
  documentType,
  shouldArchiveOnly,
}: {
  actions: LifeBrainAction[];
  documentType: LifeBrainDocumentType;
  shouldArchiveOnly: boolean;
}): string {
  if (shouldArchiveOnly) {
    return "Keine direkte Handlung erkannt. Sinnvoll ablegen.";
  }

  const firstAction = actions[0];

  if (firstAction?.type === "pay") {
    return "Es geht wahrscheinlich um eine Zahlung mit Frist.";
  }

  if (firstAction?.type === "attend_appointment") {
    return "Es geht um einen Termin, den du prüfen und in den Kalender übernehmen kannst.";
  }

  if (firstAction?.type === "cancel_contract") {
    return "Es gibt eine mögliche Kündigungsfrist. Bitte vor dem Handeln prüfen.";
  }

  if (firstAction?.type === "send_document") {
    return "Es werden Unterlagen oder Informationen von dir angefordert.";
  }

  if (documentType === "official_letter") {
    return "Das Schreiben kann eine Frist oder Pflicht enthalten.";
  }

  return "LifePilot hat eine mögliche Aufgabe erkannt.";
}

function createExplanation({
  actions,
  documentType,
  shouldArchiveOnly,
}: {
  actions: LifeBrainAction[];
  documentType: LifeBrainDocumentType;
  shouldArchiveOnly: boolean;
}): string {
  if (shouldArchiveOnly) {
    return "Der Text enthält zwar Informationen, aber keine klare Aufforderung, keinen Termin und keine eindeutige Frist. Du kannst ihn ablegen und später wiederfinden.";
  }

  const action = actions[0];

  if (!action) {
    return "LifePilot hat den Inhalt geprüft. Bitte kontrolliere die Angaben, bevor du etwas daraus machst.";
  }

  if (documentType === "bank_statement") {
    return "Normalerweise legt LifePilot Kontoauszüge nur ab. Hier wurde aber eine mögliche Handlung erkannt, deshalb solltest du sie prüfen.";
  }

  return `${action.description} LifePilot bereitet nur vor und führt nichts ohne deine Bestätigung aus.`;
}

function createRecommendedNextStep({
  actions,
  documentType,
  shouldArchiveOnly,
  shouldGenerateIcs,
}: {
  actions: LifeBrainAction[];
  documentType: LifeBrainDocumentType;
  shouldArchiveOnly: boolean;
  shouldGenerateIcs: boolean;
}): LifeBrainRecommendedNextStep {
  if (shouldGenerateIcs) {
    return {
      actionType: "download_ics",
      description:
        "Prüfe Datum und Inhalt. Danach kannst du eine Kalenderdatei herunterladen.",
      title: ".ics herunterladen",
    };
  }

  const action = actions.find(isRealAction);

  if (action?.type === "reply" || action?.type === "send_document") {
    return {
      actionType: "show_reply_draft",
      description:
        "Prüfe die erkannte Bitte und nutze den Antwortentwurf nur als Vorlage.",
      title: "Antwortentwurf anzeigen",
    };
  }

  if (action) {
    return {
      actionType: action.type,
      description: action.description,
      title: action.title,
    };
  }

  if (shouldArchiveOnly || documentType === "bank_statement") {
    return {
      actionType: "archive_only",
      description:
        "Keine direkte Handlung erkannt. Ablegen ist hier der sinnvollste Schritt.",
      title: "Nur ablegen",
    };
  }

  return {
    actionType: "review_document",
    description:
      "Der Inhalt ist nicht eindeutig. Lies die wichtigsten Stellen einmal gegen.",
    title: "Inhalt prüfen",
  };
}

function createImportantFacts({
  amounts,
  input,
  resultType,
  topAction,
}: {
  amounts: ReturnType<typeof detectLifeBrainAmounts>;
  input: LifeBrainInput;
  resultType: LifeBrainDocumentType;
  topAction?: LifeBrainAction;
}) {
  const facts: LifeBrainResult["importantFacts"] = [
    {
      importance: "high" as const,
      label: "Art",
      value: documentTypeLabels[resultType],
    },
  ];

  if (topAction?.dueDate) {
    facts.push({
      importance: "high",
      label: "Wichtiges Datum",
      value: topAction.time
        ? `${formatIsoDateGerman(topAction.dueDate)}, ${topAction.time} Uhr`
        : formatIsoDateGerman(topAction.dueDate),
    });
  }

  if (amounts[0]?.rawText) {
    facts.push({
      importance: "high",
      label: "Betrag",
      value: amounts[0].rawText,
    });
  }

  if (input.metadata?.sender) {
    facts.push({
      importance: "medium",
      label: "Absender",
      value: input.metadata.sender,
    });
  }

  return facts.slice(0, 5);
}

function createClarificationQuestion(actions: LifeBrainAction[]): string | null {
  const unclearAction = actions.find(
    (action) =>
      isRealAction(action) &&
      !action.dueDate &&
      ["reply", "send_document", "create_task"].includes(action.type),
  );

  if (!unclearAction) {
    return null;
  }

  return "Bis wann möchtest du diesen Schritt erledigen?";
}

function createSuggestedReply(
  input: LifeBrainInput,
  actions: LifeBrainAction[],
): LifeBrainSuggestedReply {
  const action = actions.find((item) =>
    ["send_document", "reply", "provide_missing_info"].includes(item.type),
  );
  const subject = input.metadata?.subject
    ? `Re: ${input.metadata.subject.replace(/^re:\s*/i, "")}`
    : undefined;

  return {
    body: [
      "Sehr geehrte Damen und Herren,",
      "",
      action?.type === "send_document"
        ? "vielen Dank für Ihre Nachricht. Ich werde die angeforderten Unterlagen prüfen und Ihnen zukommen lassen."
        : "vielen Dank für Ihre Nachricht. Ich prüfe den Sachverhalt und melde mich dazu zurück.",
      "",
      "Mit freundlichen Grüßen",
    ].join("\n"),
    subject,
    tone: "formal",
  };
}

function getConfidence(actions: LifeBrainAction[]): number {
  const realActions = actions.filter(isRealAction);

  if (realActions.some((action) => action.dueDate && action.time)) {
    return 0.9;
  }

  if (realActions.some((action) => action.dueDate)) {
    return 0.84;
  }

  if (realActions.length > 0) {
    return 0.72;
  }

  return 0.68;
}

function getUrgency(actions: LifeBrainAction[]): LifeBrainUrgency {
  const highest = getHighestPriority(actions);

  if (highest === "critical") {
    return "critical";
  }

  if (highest === "high") {
    return "high";
  }

  if (highest === "medium") {
    return "medium";
  }

  if (highest === "low") {
    return "low";
  }

  return "none";
}

function getRiskLevel(
  actions: LifeBrainAction[],
  documentType: LifeBrainDocumentType,
): LifeBrainRiskLevel {
  if (
    actions.some((action) =>
      ["cancel_contract", "pay"].includes(action.type),
    )
  ) {
    return "high";
  }

  if (documentType === "legal_notice") {
    return "critical";
  }

  if (
    actions.some((action) =>
      ["reply", "send_document", "provide_missing_info"].includes(action.type),
    )
  ) {
    return "medium";
  }

  if (actions.some(isRealAction)) {
    return "low";
  }

  return "none";
}

function getHighestPriority(actions: LifeBrainAction[]): LifeBrainPriority | undefined {
  const order: LifeBrainPriority[] = ["critical", "high", "medium", "low"];

  return order.find((priority) =>
    actions.some((action) => action.priority === priority && isRealAction(action)),
  );
}

function isRealAction(action: LifeBrainAction): boolean {
  return action.type !== "archive_only" && action.type !== "no_action";
}

function detectLanguage(text: string): LifeBrainResult["detectedLanguage"] {
  const normalizedText = text.toLowerCase();

  if (
    /[äöüß]/i.test(text) ||
    ["rechnung", "termin", "kündigung", "frist", "unterlagen", "sehr geehrte"].some(
      (word) => normalizedText.includes(word),
    )
  ) {
    return "de";
  }

  if (["invoice", "appointment", "deadline", "please", "contract"].some((word) => normalizedText.includes(word))) {
    return "en";
  }

  return "unknown";
}
