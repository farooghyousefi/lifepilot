import type {
  CancellationInfo,
  ContractActionDraft,
  ContractBrainSummary,
  ContractCategory,
  ContractCost,
  ContractDates,
  ContractIdentifier,
  ContractLifecycleStatus,
  ContractRecord,
  DocumentFact,
  ExtractedDocumentFacts,
  MissingFact,
  OfferComparisonIntent,
  RequiredFactKey,
  SuggestedContractAction,
} from "@lifepilot/shared";

export const knowledgeStorageKey = "lifepilot.local.knowledge.v1";

type RequiredFieldGroup = RequiredFactKey[];

interface KnowledgeState {
  contracts: ContractRecord[];
  extractedFactsByDocumentId: Record<string, ExtractedDocumentFacts>;
}

export const managedPersonProfiles = [
  { id: "profile-me", label: "Ich", type: "me" },
  { id: "profile-partner", label: "Partner/in", type: "partner" },
  { id: "profile-child", label: "Kind", type: "child" },
  { id: "profile-household", label: "Haushalt", type: "household" },
  { id: "profile-parent", label: "Eltern", type: "parent" },
] as const;

export const factLabels: Record<RequiredFactKey, string> = {
  amount: "Preis/Betrag",
  appointmentDate: "Termin",
  authorityName: "Behörde",
  cancellationDate: "Kündigungsdatum",
  cancellationPeriod: "Kündigungsfrist",
  category: "Kategorie",
  contractDate: "Vertragsdatum",
  contractNumber: "Vertragsnummer",
  customerNumber: "Kundennummer",
  dueDate: "Fälligkeitsdatum",
  endDate: "Enddatum",
  fileNumber: "Aktenzeichen",
  insuranceType: "Versicherungsart",
  invoiceNumber: "Rechnungsnummer",
  minimumTerm: "Mindestlaufzeit",
  monthlyPayment: "Monatlicher Abschlag",
  monthlyPrice: "Monatlicher Preis",
  monthlyRent: "Monatliche Miete",
  paymentInterval: "Zahlungsintervall",
  policyNumber: "Policennummer",
  provider: "Anbieter",
  relatedPersonProfileId: "Zugehörige Person/Profil",
  renewalDate: "Verlängerungsdatum",
  requestedAction: "Geforderte Aktion",
  startDate: "Startdatum",
  termMonths: "Laufzeit",
  yearlyEstimate: "Jahresbetrag",
};

const requiredFieldGroupsByCategory: Record<
  ContractCategory,
  RequiredFieldGroup[]
> = {
  authority: [["authorityName"]],
  banking: [["provider"], ["customerNumber", "contractNumber"]],
  electricity: [
    ["provider"],
    ["monthlyPayment", "yearlyEstimate"],
    ["startDate"],
    ["cancellationPeriod", "endDate"],
    ["customerNumber"],
  ],
  gas: [
    ["provider"],
    ["monthlyPayment", "yearlyEstimate"],
    ["startDate"],
    ["cancellationPeriod", "endDate"],
    ["customerNumber"],
  ],
  healthcare: [["provider"], ["customerNumber", "policyNumber"]],
  insurance: [
    ["provider"],
    ["insuranceType"],
    ["amount", "monthlyPrice"],
    ["startDate"],
    ["renewalDate", "cancellationPeriod"],
    ["policyNumber", "customerNumber"],
  ],
  internet: [
    ["provider"],
    ["monthlyPrice"],
    ["startDate", "contractDate"],
    ["minimumTerm", "endDate"],
    ["cancellationPeriod", "cancellationDate"],
    ["customerNumber", "contractNumber"],
  ],
  loan: [["provider"], ["amount"], ["startDate"], ["contractNumber"]],
  mobile: [
    ["provider"],
    ["monthlyPrice"],
    ["startDate", "contractDate"],
    ["minimumTerm", "endDate"],
    ["cancellationPeriod", "cancellationDate"],
    ["customerNumber", "contractNumber"],
  ],
  other: [["provider"]],
  rent: [["provider"], ["monthlyRent"], ["startDate"], ["cancellationPeriod"]],
  subscription: [["provider"], ["monthlyPrice"], ["cancellationPeriod", "endDate"]],
  tax: [["authorityName", "provider"], ["fileNumber"]],
};

// Local/dev only. Later this state must move behind an authenticated backend
// API and DynamoDB records scoped by Cognito user id.
export function saveExtractedFacts(
  documentId: string,
  facts: ExtractedDocumentFacts,
): ExtractedDocumentFacts {
  const state = readKnowledgeState();
  const now = new Date().toISOString();
  const storedFacts: ExtractedDocumentFacts = {
    ...facts,
    documentId,
    updatedAt: now,
  };

  state.extractedFactsByDocumentId[documentId] = storedFacts;
  writeKnowledgeState(state);

  return storedFacts;
}

export function getExtractedFacts(
  documentId: string,
): ExtractedDocumentFacts | null {
  return readKnowledgeState().extractedFactsByDocumentId[documentId] ?? null;
}

export function createOrUpdateContractRecord(
  contract: Partial<ContractRecord> & {
    documentId?: string;
    facts?: Partial<Record<RequiredFactKey, DocumentFact>>;
  },
): ContractRecord {
  const state = readKnowledgeState();
  const now = new Date().toISOString();
  const existing = contract.id
    ? state.contracts.find((item) => item.id === contract.id)
    : undefined;
  const facts = {
    ...asFactRecord(existing?.facts),
    ...asFactRecord(contract.facts),
  };
  const category = getFactString(facts.category) as ContractCategory | undefined;
  const normalized = normalizeContractRecord({
    ...existing,
    ...contract,
    category: contract.category ?? category ?? existing?.category ?? "other",
    createdAt: existing?.createdAt ?? contract.createdAt ?? now,
    facts,
    id: existing?.id ?? contract.id ?? `contract-record-${Date.now()}`,
    updatedAt: now,
  });

  const nextContracts = existing
    ? state.contracts.map((item) =>
        item.id === normalized.id ? normalized : item,
      )
    : [normalized, ...state.contracts];

  writeKnowledgeState({
    ...state,
    contracts: nextContracts,
  });

  return normalized;
}

export function listContractRecords(): ContractRecord[] {
  return readKnowledgeState().contracts.map((contract) =>
    normalizeContractRecord(contract),
  );
}

export function getContractRecord(id: string): ContractRecord | null {
  return listContractRecords().find((contract) => contract.id === id) ?? null;
}

export function updateContractRecord(
  id: string,
  patch: Partial<ContractRecord>,
): ContractRecord | null {
  const existing = getContractRecord(id);

  if (!existing) {
    return null;
  }

  return createOrUpdateContractRecord({
    ...existing,
    ...patch,
    facts: {
      ...existing.facts,
      ...(patch.facts ?? {}),
    },
    id,
  });
}

export function confirmFact(
  contractId: string,
  factKey: RequiredFactKey,
  value: string,
): ContractRecord | null {
  return updateFact(contractId, factKey, value, "user-confirmed");
}

export function correctFact(
  contractId: string,
  factKey: RequiredFactKey,
  value: string,
): ContractRecord | null {
  return updateFact(contractId, factKey, value, "user-corrected");
}

export function markFactMissing(
  contractId: string,
  factKey: RequiredFactKey,
): ContractRecord | null {
  return updateFact(contractId, factKey, undefined, "missing");
}

export function deleteContractRecord(id: string): void {
  const state = readKnowledgeState();

  writeKnowledgeState({
    ...state,
    contracts: state.contracts.filter((contract) => contract.id !== id),
  });
}

export function listMissingFacts(): Array<{
  contract: ContractRecord;
  missingFact: MissingFact;
}> {
  return listContractRecords().flatMap((contract) =>
    asArray<MissingFact>(contract.missingFacts).map((missingFact) => ({
      contract,
      missingFact,
    })),
  );
}

export function listContractsNeedingReview(): ContractRecord[] {
  return listContractRecords().filter(
    (contract) =>
      contract.lifecycleStatus === "needs-review" ||
      asArray<MissingFact>(contract.missingFacts).length > 0,
  );
}

export function getMissingRequiredFacts(
  category: ContractCategory,
  facts: Partial<Record<RequiredFactKey, DocumentFact>>,
): MissingFact[] {
  return getMissingFacts(category, facts);
}

export function calculateContractBrain(
  contract: Partial<Pick<
    ContractRecord,
    "category" | "dates" | "facts" | "identifiers"
  >> | null | undefined,
): ContractBrainSummary {
  const facts = asFactRecord(contract?.facts);
  const dates = isRecord(contract?.dates)
    ? (contract.dates as ContractDates)
    : {};
  const identifiers = isRecord(contract?.identifiers)
    ? (contract.identifiers as ContractIdentifier)
    : {};
  const missingFacts = getMissingFacts(
    normalizeContractCategory(contract?.category),
    facts,
  );
  const nextImportantDate = getNextImportantDate(dates);
  const today = startOfDay(new Date());
  const cancellationDate = parseIsoDate(dates.cancellationDate);
  const hasIdentifier = Boolean(
    identifiers.contractNumber ||
      identifiers.customerNumber ||
      identifiers.policyNumber ||
      identifiers.fileNumber,
  );
  const isCancellationDeadlineMissed = Boolean(
    cancellationDate && cancellationDate < today,
  );
  const daysUntilCancellation = cancellationDate
    ? Math.ceil((cancellationDate.getTime() - today.getTime()) / 86400000)
    : undefined;
  const isCancellationWindowUpcoming =
    typeof daysUntilCancellation === "number" &&
    daysUntilCancellation >= 0 &&
    daysUntilCancellation <= 90;
  const isCancellationPossibleNow =
    isCancellationWindowUpcoming && missingFacts.length === 0 && hasIdentifier;
  const lifecycleStatus = getLifecycleStatus({
    isCancellationDeadlineMissed,
    isCancellationPossibleNow,
    isCancellationWindowUpcoming,
    missingFacts,
    nextImportantDate,
  });
  const recommendedAction = getRecommendedAction({
    isCancellationPossibleNow,
    missingFacts,
    nextImportantDate,
  });

  return {
    isCancellationDeadlineMissed,
    isCancellationPossibleNow,
    isCancellationWindowUpcoming,
    lifecycleStatus,
    missingFacts,
    nextImportantDate,
    recommendedAction,
  };
}

export function createCancellationDraft(
  contractId: string,
): ContractActionDraft | null {
  const contract = getContractRecord(contractId);

  if (!contract || asArray<MissingFact>(contract.missingFacts).length > 0) {
    return null;
  }

  const identifier =
    contract.identifiers.customerNumber ??
    contract.identifiers.contractNumber ??
    contract.identifiers.policyNumber ??
    contract.identifiers.fileNumber;

  if (!contract.provider || !identifier) {
    return null;
  }

  const now = new Date().toISOString();
  const draft: ContractActionDraft = {
    body: `Sehr geehrte Damen und Herren,\n\nhiermit kündige ich meinen Vertrag mit der Kundennummer/Vertragsnummer ${identifier} zum nächstmöglichen Zeitpunkt.\n\nBitte bestätigen Sie mir die Kündigung schriftlich unter Angabe des Beendigungsdatums.\n\nMit freundlichen Grüßen\n[Name]`,
    createdAt: now,
    id: `draft-${contract.id}`,
    status: "draft",
    title: `Kündigung vorbereiten: ${contract.name}`,
    type: "cancellation",
    updatedAt: now,
  };

  updateContractRecord(contract.id, { actionDraft: draft });

  return draft;
}

export function updateActionDraftBody(
  contractId: string,
  body: string,
): ContractActionDraft | null {
  const contract = getContractRecord(contractId);

  if (!contract?.actionDraft) {
    return null;
  }

  const draft: ContractActionDraft = {
    ...contract.actionDraft,
    body,
    updatedAt: new Date().toISOString(),
  };

  updateContractRecord(contractId, { actionDraft: draft });

  return draft;
}

export function markActionDraftPrepared(
  contractId: string,
): ContractActionDraft | null {
  const contract = getContractRecord(contractId);

  if (!contract?.actionDraft) {
    return null;
  }

  const draft: ContractActionDraft = {
    ...contract.actionDraft,
    status: "prepared",
    updatedAt: new Date().toISOString(),
  };

  updateContractRecord(contractId, { actionDraft: draft });

  return draft;
}

export function createOfferComparisonIntent(
  contractId: string,
): OfferComparisonIntent | null {
  const contract = getContractRecord(contractId);

  if (!contract) {
    return null;
  }

  const neededData: RequiredFactKey[] = [];

  if (!contract.provider) {
    neededData.push("provider");
  }

  if (!contract.cost?.amount) {
    neededData.push("monthlyPrice");
  }

  const intent: OfferComparisonIntent = {
    category: contract.category,
    currentPrice: contract.cost.amount,
    currentProvider: contract.provider,
    neededData,
    status: neededData.length > 0 ? "missing-data" : "planned",
  };

  updateContractRecord(contractId, { offerComparisonIntent: intent });

  return intent;
}

function updateFact(
  contractId: string,
  factKey: RequiredFactKey,
  value: string | undefined,
  verificationStatus: DocumentFact["verificationStatus"],
): ContractRecord | null {
  const contract = getContractRecord(contractId);

  if (!contract) {
    return null;
  }

  const fact: DocumentFact = {
    ...(contract.facts[factKey] ?? {
      confidence: "high",
      key: factKey,
      label: factLabels[factKey],
      updatedAt: new Date().toISOString(),
    }),
    confidence: verificationStatus === "missing" ? "low" : "high",
    updatedAt: new Date().toISOString(),
    value,
    verificationStatus,
  };

  return updateContractRecord(contractId, {
    facts: {
      ...contract.facts,
      [factKey]: fact,
    },
  });
}

function normalizeContractRecord(contract: unknown): ContractRecord {
  const now = new Date().toISOString();
  const safeContract: Partial<ContractRecord> = isRecord(contract)
    ? (contract as Partial<ContractRecord>)
    : {};
  const facts = asFactRecord(safeContract.facts);
  const category =
    normalizeContractCategory(
      safeContract.category ??
        (getFactString(facts.category) as ContractCategory | undefined),
    );
  const identifiers = getIdentifiers(facts);
  const cost = getContractCost(facts);
  const dates = getContractDates(facts);
  const cancellation = getCancellationInfo(facts, dates);
  const base: ContractRecord = {
    brain: {
      isCancellationDeadlineMissed: false,
      isCancellationPossibleNow: false,
      isCancellationWindowUpcoming: false,
      lifecycleStatus: "unknown",
      missingFacts: [],
      recommendedAction: "contract-review-needed",
    },
    cancellation,
    category,
    cost,
    createdAt: safeContract.createdAt ?? now,
    dates,
    documentId: safeContract.documentId,
    facts,
    id: safeContract.id ?? `contract-record-${Date.now()}`,
    identifiers,
    lifecycleStatus: "unknown",
    missingFacts: [],
    name:
      safeContract.name ??
      getFactString(facts.provider) ??
      getFactString(facts.authorityName) ??
      "Unbenannter Vorgang",
    provider:
      safeContract.provider ??
      getFactString(facts.provider) ??
      getFactString(facts.authorityName),
    relatedPersonProfileId:
      safeContract.relatedPersonProfileId ??
      getFactString(facts.relatedPersonProfileId) ??
      "profile-me",
    updatedAt: safeContract.updatedAt ?? now,
  };
  const brain = calculateContractBrain(base);

  return {
    ...base,
    actionDraft: isRecord(safeContract.actionDraft)
      ? (safeContract.actionDraft as ContractActionDraft)
      : undefined,
    brain,
    lifecycleStatus: brain.lifecycleStatus,
    missingFacts: brain.missingFacts,
    offerComparisonIntent: isRecord(safeContract.offerComparisonIntent)
      ? (safeContract.offerComparisonIntent as OfferComparisonIntent)
      : undefined,
  };
}

function getMissingFacts(
  category: ContractCategory,
  facts: Partial<Record<RequiredFactKey, DocumentFact>>,
): MissingFact[] {
  const groups = requiredFieldGroupsByCategory[category] ?? requiredFieldGroupsByCategory.other;

  return groups
    .filter((group) => !group.some((key) => hasUsableFact(facts[key])))
    .map((group) => ({
      isRequired: true,
      key: group[0],
      label: group.map((key) => factLabels[key]).join(" oder "),
      reason:
        "Diese Angaben brauche ich noch, damit LifePilot zuverlässig überwachen kann.",
    }));
}

function hasUsableFact(fact?: DocumentFact): boolean {
  return Boolean(
    fact &&
      fact.verificationStatus !== "missing" &&
      fact.verificationStatus !== "not-applicable" &&
      typeof fact.value === "string" &&
      fact.value.trim().length > 0,
  );
}

function getIdentifiers(
  facts: Partial<Record<RequiredFactKey, DocumentFact>>,
): ContractIdentifier {
  return {
    contractNumber: getFactString(facts.contractNumber),
    customerNumber: getFactString(facts.customerNumber),
    fileNumber: getFactString(facts.fileNumber),
    invoiceNumber: getFactString(facts.invoiceNumber),
    policyNumber: getFactString(facts.policyNumber),
  };
}

function getContractCost(
  facts: Partial<Record<RequiredFactKey, DocumentFact>>,
): ContractCost {
  const amountFact =
    facts.monthlyPrice ??
    facts.monthlyPayment ??
    facts.monthlyRent ??
    facts.amount ??
    facts.yearlyEstimate;
  const amount = parseCurrencyAmount(amountFact?.value);

  return {
    amount,
    currency: "EUR",
    interval: getPaymentInterval(facts.paymentInterval?.value, amountFact?.key),
    sourceFactKey: amountFact?.key,
  };
}

function getContractDates(
  facts: Partial<Record<RequiredFactKey, DocumentFact>>,
): ContractDates {
  return {
    appointmentDate: getFactString(facts.appointmentDate),
    contractDate: getFactString(facts.contractDate),
    dueDate: getFactString(facts.dueDate),
    endDate: getFactString(facts.endDate),
    renewalDate: getFactString(facts.renewalDate),
    startDate: getFactString(facts.startDate),
  };
}

function getCancellationInfo(
  facts: Partial<Record<RequiredFactKey, DocumentFact>>,
  dates: ContractDates,
): CancellationInfo {
  return {
    cancellationDate: dates.cancellationDate ?? getFactString(facts.cancellationDate),
    cancellationPeriod: getFactString(facts.cancellationPeriod),
    canPrepareCancellation: Boolean(
      getFactString(facts.cancellationDate) ||
        getFactString(facts.cancellationPeriod),
    ),
  };
}

function getNextImportantDate(dates: ContractDates): string | undefined {
  const today = startOfDay(new Date());

  return [
    dates.cancellationDate,
    dates.dueDate,
    dates.appointmentDate,
    dates.renewalDate,
    dates.endDate,
  ]
    .filter(Boolean)
    .filter((date): date is string => Boolean(date))
    .filter((date) => {
      const parsedDate = parseIsoDate(date);
      return Boolean(parsedDate && parsedDate >= today);
    })
    .sort()[0];
}

function getLifecycleStatus({
  isCancellationDeadlineMissed,
  isCancellationPossibleNow,
  isCancellationWindowUpcoming,
  missingFacts,
  nextImportantDate,
}: {
  isCancellationDeadlineMissed: boolean;
  isCancellationPossibleNow: boolean;
  isCancellationWindowUpcoming: boolean;
  missingFacts: MissingFact[];
  nextImportantDate?: string;
}): ContractLifecycleStatus {
  if (missingFacts.length > 0) {
    return "needs-review";
  }

  if (isCancellationDeadlineMissed) {
    return "cancellation-deadline-missed";
  }

  if (isCancellationPossibleNow) {
    return "cancellable-now";
  }

  if (isCancellationWindowUpcoming) {
    return "cancellation-window-upcoming";
  }

  return nextImportantDate ? "active" : "needs-review";
}

function getRecommendedAction({
  isCancellationPossibleNow,
  missingFacts,
  nextImportantDate,
}: {
  isCancellationPossibleNow: boolean;
  missingFacts: MissingFact[];
  nextImportantDate?: string;
}): SuggestedContractAction {
  if (missingFacts.length > 0) {
    return "missing-info-needed";
  }

  if (isCancellationPossibleNow) {
    return "cancellation-draft-ready";
  }

  if (nextImportantDate) {
    return "reminder-needed";
  }

  return "contract-review-needed";
}

function getPaymentInterval(
  value: string | undefined,
  sourceKey?: RequiredFactKey,
): ContractCost["interval"] {
  const normalizedValue = value?.toLowerCase() ?? "";

  if (sourceKey === "yearlyEstimate" || normalizedValue.includes("jähr")) {
    return "yearly";
  }

  if (
    sourceKey === "monthlyPrice" ||
    sourceKey === "monthlyPayment" ||
    sourceKey === "monthlyRent" ||
    normalizedValue.includes("monat")
  ) {
    return "monthly";
  }

  return value ? "unknown" : undefined;
}

function getFactString(fact?: DocumentFact): string | undefined {
  return typeof fact?.value === "string" && fact.value.trim()
    ? fact.value.trim()
    : undefined;
}

function parseCurrencyAmount(value?: string): number | undefined {
  if (!value) {
    return undefined;
  }

  const numericValue = value
    .replace(/[^\d.,-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const parsed = Number(numericValue);

  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseIsoDate(value?: string): Date | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return Number.isNaN(date.getTime()) ? undefined : date;
}

function startOfDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function readKnowledgeState(): KnowledgeState {
  if (typeof window === "undefined") {
    return {
      contracts: [],
      extractedFactsByDocumentId: {},
    };
  }

  try {
    const rawValue = window.localStorage.getItem(knowledgeStorageKey);

    if (!rawValue) {
      return {
        contracts: [],
        extractedFactsByDocumentId: {},
      };
    }

    const parsedValue = JSON.parse(rawValue);
    const storedState = isRecord(parsedValue) ? parsedValue : {};

    return {
      contracts: asArray<Partial<ContractRecord>>(storedState.contracts)
        .filter(isRecord)
        .map((contract) => normalizeContractRecord(contract)),
      extractedFactsByDocumentId:
        isRecord(storedState.extractedFactsByDocumentId)
          ? (storedState.extractedFactsByDocumentId as Record<
              string,
              ExtractedDocumentFacts
            >)
          : {},
    };
  } catch {
    return {
      contracts: [],
      extractedFactsByDocumentId: {},
    };
  }
}

function writeKnowledgeState(state: KnowledgeState): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(knowledgeStorageKey, JSON.stringify(state));
}

function normalizeContractCategory(value: unknown): ContractCategory {
  return isContractCategory(value) ? value : "other";
}

function isContractCategory(value: unknown): value is ContractCategory {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(requiredFieldGroupsByCategory, value)
  );
}

function asFactRecord(
  value: unknown,
): Partial<Record<RequiredFactKey, DocumentFact>> {
  return isRecord(value)
    ? (value as Partial<Record<RequiredFactKey, DocumentFact>>)
    : {};
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
