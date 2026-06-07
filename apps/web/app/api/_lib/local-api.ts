import {
  getMockContracts,
  getMockDocuments,
  getMockVaultItems,
} from "@lifepilot/api-client";
import type {
  ApiErrorResult,
  ApiResult,
  AuthSession,
  Contract,
  CreateContractInput,
  CreateDocumentInput,
  Document,
  User,
  VaultItem,
} from "@lifepilot/shared";

const demoUserId = "demo-user-local-api";
const demoToken = "mock-access-token";

const contracts = new Map<string, Contract>(
  getMockContracts().map((contract) => [
    contract.contractId,
    {
      ...contract,
      userId: demoUserId,
    },
  ]),
);

const documents = new Map<string, Document>(
  getMockDocuments().map((document) => [document.id, { ...document }]),
);

const vaultItems = new Map<string, VaultItem>(
  getMockVaultItems().map((item) => [item.id, { ...item }]),
);

export interface LocalAuthContext {
  authMode: "demo-token" | "demo-fallback";
  isAuthenticated: boolean;
  userId: string;
}

export const getLocalAuthContext = (request: Request): LocalAuthContext => {
  const authorization = request.headers.get("authorization");
  const isAuthenticated = authorization === `Bearer ${demoToken}`;

  return {
    authMode: isAuthenticated ? "demo-token" : "demo-fallback",
    isAuthenticated,
    userId: demoUserId,
  };
};

export const demoUser: User = {
  email: "demo@lifepilot.local",
  id: demoUserId,
  name: "Life Pilot Demo",
  provider: "mock",
  role: "user",
};

export const getDemoSession = (): AuthSession => ({
  accessToken: demoToken,
  provider: "mock",
  user: demoUser,
});

export const createRequestId = (prefix: string): string =>
  `${prefix}-${Date.now()}`;

export const apiResult = <T>(data: T, requestId: string): Response =>
  Response.json({
    data,
    requestId,
    source: "mock",
  } satisfies ApiResult<T>);

export const apiError = (
  code: string,
  message: string,
  status: number,
  requestId: string,
): Response =>
  Response.json(
    {
      error: {
        code,
        message,
      },
      requestId,
      source: "mock",
    } satisfies ApiErrorResult,
    { status },
  );

export const listLocalContracts = (auth: LocalAuthContext): Contract[] =>
  Array.from(contracts.values())
    .filter((contract) => contract.userId === auth.userId)
    .map((contract) => ({ ...contract }));

export const getLocalContract = (
  auth: LocalAuthContext,
  contractId: string,
): Contract | null => {
  const contract = contracts.get(contractId);

  if (!contract || contract.userId !== auth.userId) {
    return null;
  }

  return { ...contract };
};

export const createLocalContract = (
  auth: LocalAuthContext,
  input: CreateContractInput,
): Contract => {
  const contractId = `contract-local-${Date.now()}`;
  const now = new Date().toISOString();
  const contract: Contract = {
    annualSavingsPotential: input.annualSavingsPotential ?? 0,
    cancellationDeadlineDays: input.cancellationDeadlineDays,
    category: input.category,
    contractEnd: input.contractEnd,
    contractId,
    createdAt: now,
    id: contractId,
    monthlyCost: input.monthlyCost,
    provider: input.provider,
    riskLevel: input.riskLevel ?? "low",
    status: input.status ?? "draft",
    statusLabel:
      input.statusLabel ??
      `Kündigungsfrist in ${input.cancellationDeadlineDays} Tagen`,
    updatedAt: now,
    userId: auth.userId,
  };

  contracts.set(contractId, contract);

  return { ...contract };
};

export const deleteLocalContract = (
  auth: LocalAuthContext,
  contractId: string,
): boolean => {
  const contract = contracts.get(contractId);

  if (!contract || contract.userId !== auth.userId) {
    return false;
  }

  return contracts.delete(contractId);
};

export const listLocalDocuments = (): Document[] =>
  Array.from(documents.values()).map((document) => ({ ...document }));

export const getLocalDocument = (documentId: string): Document | null => {
  const document = documents.get(documentId);

  return document ? { ...document } : null;
};

export const createLocalDocument = (
  input: CreateDocumentInput,
): Document => {
  const documentId = `document-local-${Date.now()}`;
  const document: Document = {
    addedAt: new Date().toISOString(),
    autoNamed: input.autoNamed,
    category: input.category,
    id: documentId,
    name: input.name,
    namingConfidence: input.namingConfidence,
    notes: input.notes,
    recommendedAction:
      "Nächster Schritt: Angaben prüfen.",
    securityNote:
      "Lokaler Entwicklungsmodus: Es wurde keine echte Datei produktiv gespeichert.",
    status: input.status,
  };

  documents.set(documentId, document);

  return { ...document };
};

export const deleteLocalDocument = (documentId: string): boolean =>
  documents.delete(documentId);

export const listLocalVaultItems = (): VaultItem[] =>
  Array.from(vaultItems.values()).map((item) => ({ ...item }));
