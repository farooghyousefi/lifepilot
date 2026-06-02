import type {
  ApiResult,
  Contract,
  ContractSummary,
  CreateContractInput,
  CreateDocumentInput,
  Document,
  LifePilotSnapshot,
  VaultItem,
} from "@lifepilot/shared";

const mockSnapshot: LifePilotSnapshot = {
  userDisplayName: "Demo Pilot",
  goals: [
    {
      id: "goal-health-1",
      title: "Build a sustainable morning routine",
      area: "health",
      priority: "high",
      targetDate: "2026-09-01",
      progress: 42,
    },
    {
      id: "goal-finance-1",
      title: "Organize tax and insurance documents",
      area: "finance",
      priority: "medium",
      targetDate: "2026-07-15",
      progress: 68,
    },
  ],
  reminders: [
    {
      id: "reminder-1",
      title: "Review rental contract notice period",
      dueAt: "2026-06-10T09:00:00.000Z",
      completed: false,
      linkedGoalId: "goal-finance-1",
    },
    {
      id: "reminder-2",
      title: "Schedule annual health check",
      dueAt: "2026-06-18T12:00:00.000Z",
      completed: false,
      linkedGoalId: "goal-health-1",
    },
  ],
  documents: [
    {
      id: "document-1",
      title: "Rental Agreement",
      category: "contract",
      uploadedAt: "2026-05-30T10:30:00.000Z",
      storageKey: "mock/contracts/rental-agreement.pdf",
    },
  ],
};

const mockContracts: Contract[] = [
  {
    id: "contract-vodafone-internet",
    contractId: "contract-vodafone-internet",
    provider: "Vodafone Internet",
    category: "internet",
    monthlyCost: 39.99,
    contractEnd: "2026-08-26",
    cancellationDeadlineDays: 84,
    status: "cancellation-window",
    statusLabel: "Kündigungsfrist in 84 Tagen",
    riskLevel: "medium",
    annualSavingsPotential: 240,
  },
  {
    id: "contract-fitnessstudio",
    contractId: "contract-fitnessstudio",
    provider: "Fitnessstudio",
    category: "fitness",
    monthlyCost: 29.99,
    contractEnd: "2026-12-31",
    cancellationDeadlineDays: 120,
    status: "unused",
    statusLabel: "Seit 4 Monaten nicht genutzt",
    riskLevel: "high",
    annualSavingsPotential: 360,
  },
  {
    id: "contract-stromvertrag",
    contractId: "contract-stromvertrag",
    provider: "Stromvertrag",
    category: "energy",
    monthlyCost: 92,
    contractEnd: "2026-06-23",
    cancellationDeadlineDays: 21,
    status: "action-needed",
    statusLabel: "Kündigungsfrist in 21 Tagen",
    riskLevel: "high",
    annualSavingsPotential: 180,
  },
  {
    id: "contract-handyvertrag",
    contractId: "contract-handyvertrag",
    provider: "Handyvertrag",
    category: "mobile",
    monthlyCost: 24.99,
    contractEnd: "2026-10-15",
    cancellationDeadlineDays: 136,
    status: "alternative-found",
    statusLabel: "Mögliche Alternative gefunden",
    riskLevel: "low",
    annualSavingsPotential: 120,
  },
];

const mockDocuments: Document[] = [
  {
    id: "document-vodafone-contract",
    name: "Vodafone Contract",
    category: "contracts",
    status: "linked-to-contract",
    addedAt: "2026-05-26T09:00:00.000Z",
    linkedContract: "Vodafone Internet",
    securityNote: "Demo metadata only. No real document is stored.",
    recommendedAction: "Review cancellation window before Aug 30.",
  },
  {
    id: "document-axa-insurance-policy",
    name: "AXA Insurance Policy",
    category: "insurance",
    status: "needs-review",
    addedAt: "2026-05-23T10:00:00.000Z",
    securityNote: "Ready for future private S3 storage.",
    recommendedAction: "Check coverage and renewal date.",
  },
  {
    id: "document-electricity-bill",
    name: "Electricity Bill",
    category: "bills",
    status: "expiring-soon",
    addedAt: "2026-05-18T12:30:00.000Z",
    linkedContract: "Stromvertrag",
    securityNote: "Demo metadata only. Avoid real bill uploads.",
    recommendedAction: "Compare a better energy offer this week.",
  },
  {
    id: "document-tax-notice",
    name: "Tax Notice",
    category: "finance",
    status: "protected",
    addedAt: "2026-05-12T08:15:00.000Z",
    securityNote: "Prepared for encryption and user isolation.",
    recommendedAction: "Move to vault when real storage is enabled.",
  },
  {
    id: "document-id-copy-placeholder",
    name: "ID Copy Placeholder",
    category: "identity",
    status: "protected",
    addedAt: "2026-05-02T11:45:00.000Z",
    securityNote: "Placeholder only. Do not upload identity documents yet.",
    recommendedAction: "Use demo data until Cognito and KMS are active.",
  },
];

const mockVaultItems: VaultItem[] = [
  {
    id: "vault-id-copy-placeholder",
    documentId: "document-id-copy-placeholder",
    name: "ID Copy Placeholder",
    category: "identity",
    protectedAt: "2026-05-02T11:45:00.000Z",
    securityLevel: "encryption-ready",
  },
  {
    id: "vault-tax-notice",
    documentId: "document-tax-notice",
    name: "Tax Notice",
    category: "finance",
    protectedAt: "2026-05-12T08:15:00.000Z",
    securityLevel: "encryption-ready",
  },
  {
    id: "vault-insurance-policy",
    documentId: "document-axa-insurance-policy",
    name: "Insurance Policy",
    category: "insurance",
    protectedAt: "2026-05-23T10:00:00.000Z",
    securityLevel: "demo",
  },
  {
    id: "vault-lease-agreement",
    documentId: "document-lease-agreement",
    name: "Lease Agreement",
    category: "contracts",
    protectedAt: "2026-04-15T09:00:00.000Z",
    securityLevel: "demo",
  },
];

export const getMockContracts = (): Contract[] =>
  mockContracts.map((contract) => ({ ...contract }));

export const getMockDocuments = (): Document[] =>
  mockDocuments.map((document) => ({ ...document }));

export const getMockVaultItems = (): VaultItem[] =>
  mockVaultItems.map((item) => ({ ...item }));

const getMockContractById = (contractId: string): Contract | undefined =>
  mockContracts.find((contract) => contract.contractId === contractId);

const getMockDocumentById = (documentId: string): Document | undefined =>
  mockDocuments.find((document) => document.id === documentId);

const createMockContract = (input: CreateContractInput): Contract => {
  const contractId = `contract-${Date.now()}`;
  const now = new Date().toISOString();

  return {
    id: contractId,
    contractId,
    provider: input.provider,
    category: input.category,
    monthlyCost: input.monthlyCost,
    contractEnd: input.contractEnd,
    cancellationDeadlineDays: input.cancellationDeadlineDays,
    status: input.status ?? "draft",
    statusLabel:
      input.statusLabel ??
      `Kündigungsfrist in ${input.cancellationDeadlineDays} Tagen`,
    riskLevel: input.riskLevel ?? "low",
    annualSavingsPotential: input.annualSavingsPotential ?? 0,
    createdAt: now,
    updatedAt: now,
  };
};

const createMockDocument = (input: CreateDocumentInput): Document => {
  const documentId = `document-${Date.now()}`;

  return {
    id: documentId,
    name: input.name,
    category: input.category,
    status: input.status,
    addedAt: new Date().toISOString(),
    notes: input.notes,
    securityNote: "Demo mode: no real file was uploaded or stored.",
    recommendedAction: "Review this demo item before connecting real storage.",
  };
};

export const calculateContractSummary = (
  contracts: Contract[],
): ContractSummary => ({
  monthlyFixedCosts: contracts.reduce(
    (total, contract) => total + contract.monthlyCost,
    0,
  ),
  activeContracts: contracts.length,
  criticalDeadlines: contracts.filter(
    (contract) => contract.cancellationDeadlineDays <= 30,
  ).length,
  annualSavingsPotential: contracts.reduce(
    (total, contract) => total + contract.annualSavingsPotential,
    0,
  ),
});

export interface LifePilotClientOptions {
  authToken?: string;
  baseUrl?: string;
  useMockData?: boolean;
}

export class LifePilotApiClient {
  private authToken?: string;
  private readonly baseUrl: string;
  private readonly useMockData: boolean;

  constructor(options: LifePilotClientOptions = {}) {
    this.authToken = options.authToken;
    this.baseUrl = options.baseUrl ?? "http://localhost:3000/api";
    this.useMockData = options.useMockData ?? true;
  }

  setAuthToken(token: string): void {
    this.authToken = token;
  }

  clearAuthToken(): void {
    this.authToken = undefined;
  }

  getAuthHeaders(): Record<string, string> {
    if (!this.authToken) {
      return {};
    }

    return {
      authorization: `Bearer ${this.authToken}`,
    };
  }

  async getSnapshot(): Promise<ApiResult<LifePilotSnapshot>> {
    if (this.useMockData) {
      return {
        data: mockSnapshot,
        requestId: "mock-request",
        source: "mock",
      };
    }

    const response = await fetch(`${this.baseUrl}/snapshot`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Life Pilot API request failed: ${response.status}`);
    }

    return response.json() as Promise<ApiResult<LifePilotSnapshot>>;
  }

  async listContracts(): Promise<ApiResult<Contract[]>> {
    if (this.useMockData) {
      return {
        data: getMockContracts(),
        requestId: "mock-contracts-list",
        source: "mock",
      };
    }

    const response = await fetch(`${this.baseUrl}/contracts`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Life Pilot API request failed: ${response.status}`);
    }

    return response.json() as Promise<ApiResult<Contract[]>>;
  }

  async createContract(
    input: CreateContractInput,
  ): Promise<ApiResult<Contract>> {
    if (this.useMockData) {
      return {
        data: createMockContract(input),
        requestId: "mock-contracts-create",
        source: "mock",
      };
    }

    const response = await fetch(`${this.baseUrl}/contracts`, {
      body: JSON.stringify(input),
      headers: {
        ...this.getAuthHeaders(),
        "content-type": "application/json",
      },
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(`Life Pilot API request failed: ${response.status}`);
    }

    return response.json() as Promise<ApiResult<Contract>>;
  }

  async getContract(contractId: string): Promise<ApiResult<Contract | null>> {
    if (this.useMockData) {
      return {
        data: getMockContractById(contractId) ?? null,
        requestId: "mock-contracts-get",
        source: "mock",
      };
    }

    const response = await fetch(`${this.baseUrl}/contracts/${contractId}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Life Pilot API request failed: ${response.status}`);
    }

    return response.json() as Promise<ApiResult<Contract | null>>;
  }

  async deleteContract(
    contractId: string,
  ): Promise<ApiResult<{ contractId: string; deleted: boolean }>> {
    if (this.useMockData) {
      return {
        data: {
          contractId,
          deleted: Boolean(getMockContractById(contractId)),
        },
        requestId: "mock-contracts-delete",
        source: "mock",
      };
    }

    const response = await fetch(`${this.baseUrl}/contracts/${contractId}`, {
      headers: this.getAuthHeaders(),
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error(`Life Pilot API request failed: ${response.status}`);
    }

    return response.json() as Promise<
      ApiResult<{ contractId: string; deleted: boolean }>
    >;
  }

  async listDocuments(): Promise<ApiResult<Document[]>> {
    if (this.useMockData) {
      return {
        data: getMockDocuments(),
        requestId: "mock-documents-list",
        source: "mock",
      };
    }

    const response = await fetch(`${this.baseUrl}/documents`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Life Pilot API request failed: ${response.status}`);
    }

    return response.json() as Promise<ApiResult<Document[]>>;
  }

  async getDocument(documentId: string): Promise<ApiResult<Document | null>> {
    if (this.useMockData) {
      return {
        data: getMockDocumentById(documentId) ?? null,
        requestId: "mock-documents-get",
        source: "mock",
      };
    }

    const response = await fetch(`${this.baseUrl}/documents/${documentId}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Life Pilot API request failed: ${response.status}`);
    }

    return response.json() as Promise<ApiResult<Document | null>>;
  }

  async createDocument(
    input: CreateDocumentInput,
  ): Promise<ApiResult<Document>> {
    if (this.useMockData) {
      return {
        data: createMockDocument(input),
        requestId: "mock-documents-create",
        source: "mock",
      };
    }

    const response = await fetch(`${this.baseUrl}/documents`, {
      body: JSON.stringify(input),
      headers: {
        ...this.getAuthHeaders(),
        "content-type": "application/json",
      },
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(`Life Pilot API request failed: ${response.status}`);
    }

    return response.json() as Promise<ApiResult<Document>>;
  }

  async deleteDocument(
    documentId: string,
  ): Promise<ApiResult<{ deleted: boolean; documentId: string }>> {
    if (this.useMockData) {
      return {
        data: {
          deleted: Boolean(getMockDocumentById(documentId)),
          documentId,
        },
        requestId: "mock-documents-delete",
        source: "mock",
      };
    }

    const response = await fetch(`${this.baseUrl}/documents/${documentId}`, {
      headers: this.getAuthHeaders(),
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error(`Life Pilot API request failed: ${response.status}`);
    }

    return response.json() as Promise<
      ApiResult<{ deleted: boolean; documentId: string }>
    >;
  }

  async listVaultItems(): Promise<ApiResult<VaultItem[]>> {
    if (this.useMockData) {
      return {
        data: getMockVaultItems(),
        requestId: "mock-vault-list",
        source: "mock",
      };
    }

    const response = await fetch(`${this.baseUrl}/vault`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Life Pilot API request failed: ${response.status}`);
    }

    return response.json() as Promise<ApiResult<VaultItem[]>>;
  }
}

export const createLifePilotClient = (
  options?: LifePilotClientOptions,
): LifePilotApiClient => new LifePilotApiClient(options);

const defaultClient = createLifePilotClient();

export const setAuthToken = (token: string): void => {
  defaultClient.setAuthToken(token);
};

export const clearAuthToken = (): void => {
  defaultClient.clearAuthToken();
};

export const getAuthHeaders = (): Record<string, string> =>
  defaultClient.getAuthHeaders();

export const listContracts = (
  options?: LifePilotClientOptions,
): Promise<ApiResult<Contract[]>> =>
  createLifePilotClient(options).listContracts();

export const createContract = (
  input: CreateContractInput,
  options?: LifePilotClientOptions,
): Promise<ApiResult<Contract>> =>
  createLifePilotClient(options).createContract(input);

export const getContract = (
  contractId: string,
  options?: LifePilotClientOptions,
): Promise<ApiResult<Contract | null>> =>
  createLifePilotClient(options).getContract(contractId);

export const deleteContract = (
  contractId: string,
  options?: LifePilotClientOptions,
): Promise<ApiResult<{ contractId: string; deleted: boolean }>> =>
  createLifePilotClient(options).deleteContract(contractId);

export const listDocuments = (
  options?: LifePilotClientOptions,
): Promise<ApiResult<Document[]>> =>
  createLifePilotClient(options).listDocuments();

export const getDocument = (
  documentId: string,
  options?: LifePilotClientOptions,
): Promise<ApiResult<Document | null>> =>
  createLifePilotClient(options).getDocument(documentId);

export const createDocument = (
  input: CreateDocumentInput,
  options?: LifePilotClientOptions,
): Promise<ApiResult<Document>> =>
  createLifePilotClient(options).createDocument(input);

export const deleteDocument = (
  documentId: string,
  options?: LifePilotClientOptions,
): Promise<ApiResult<{ deleted: boolean; documentId: string }>> =>
  createLifePilotClient(options).deleteDocument(documentId);

export const listVaultItems = (
  options?: LifePilotClientOptions,
): Promise<ApiResult<VaultItem[]>> =>
  createLifePilotClient(options).listVaultItems();

export { mockContracts, mockDocuments, mockSnapshot, mockVaultItems };
