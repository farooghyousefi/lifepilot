import type {
  ApiResult,
  AuthSession,
  CompleteDocumentUploadResult,
  Contract,
  ContractRecord,
  ContractRecordCreateInput,
  ContractRecordUpdateInput,
  ContractSummary,
  CompleteDocumentUploadInput,
  CreateDocumentInput,
  Document,
  LifePilotSnapshot,
  ReminderCreateInput,
  ReminderRecord,
  ReminderUpdateInput,
  RequestDocumentUploadInput,
  RequestDocumentUploadResult,
  VaultItem,
} from "@lifepilot/shared";

const mockAuthSession: AuthSession = {
  accessToken: "mock-access-token",
  provider: "mock",
  user: {
    email: "demo@lifepilot.local",
    id: "demo-user-local-api",
    name: "Life Pilot Demo",
    provider: "mock",
    role: "user",
  },
};

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
    category: "subscription",
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
    category: "electricity",
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
    name: "Vodafone Vertrag",
    category: "contracts",
    status: "linked-to-contract",
    addedAt: "2026-05-26T09:00:00.000Z",
    linkedContract: "Vodafone Internet",
    securityNote: "Demo-Metadaten. Es ist kein echtes Dokument gespeichert.",
    recommendedAction: "Prüfe die Kündigungsfrist vor dem 30. August.",
  },
  {
    id: "document-axa-insurance-policy",
    name: "AXA Versicherung",
    category: "insurance",
    status: "needs-review",
    addedAt: "2026-05-23T10:00:00.000Z",
    securityNote: "Für spätere private S3-Speicherung vorbereitet.",
    recommendedAction: "Prüfe Schutzumfang und Verlängerungsdatum.",
  },
  {
    id: "document-electricity-bill",
    name: "Stromrechnung",
    category: "bills",
    status: "expiring-soon",
    addedAt: "2026-05-18T12:30:00.000Z",
    linkedContract: "Stromvertrag",
    securityNote: "Demo-Metadaten. Bitte noch keine echten Rechnungen hochladen.",
    recommendedAction: "Prüfe diese Woche, ob ein besserer Stromtarif sinnvoll ist.",
  },
  {
    id: "document-tax-notice",
    name: "Steuerbescheid",
    category: "finance",
    status: "protected",
    addedAt: "2026-05-12T08:15:00.000Z",
    securityNote: "Für Verschlüsselung und Nutzertrennung vorbereitet.",
    recommendedAction: "Später in den Tresor verschieben, wenn echte Speicherung aktiv ist.",
  },
  {
    id: "document-id-copy-placeholder",
    name: "Ausweis Platzhalter",
    category: "identity",
    status: "protected",
    addedAt: "2026-05-02T11:45:00.000Z",
    securityNote: "Nur Platzhalter. Bitte noch keine Ausweisdokumente hochladen.",
    recommendedAction: "Nutze Demo-Daten, bis Cognito und KMS produktiv aktiv sind.",
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

const mockRuntimeDocuments: Document[] = [];
const mockContractRecords: ContractRecord[] = [];
const mockReminderRecords: ReminderRecord[] = [];

export const getMockContracts = (): Contract[] =>
  mockContracts.map((contract) => ({ ...contract }));

export const getMockDocuments = (): Document[] =>
  [...mockRuntimeDocuments, ...mockDocuments].map((document) => ({
    ...document,
  }));

export const getMockVaultItems = (): VaultItem[] =>
  mockVaultItems.map((item) => ({ ...item }));

const getMockDocumentById = (documentId: string): Document | undefined =>
  getMockDocuments().find((document) => document.id === documentId);

const createMockContractRecord = (
  input: ContractRecordCreateInput,
): ContractRecord => {
  const now = new Date().toISOString();
  const contractId = `contract-record-${Date.now()}`;
  const missingFacts = input.missingFacts ?? [];
  const provider = input.provider ?? input.company ?? "Unbenannter Anbieter";
  const contract: ContractRecord = {
    brain: {
      isCancellationDeadlineMissed: false,
      isCancellationPossibleNow: false,
      isCancellationWindowUpcoming: false,
      lifecycleStatus: missingFacts.length > 0 ? "needs-review" : "active",
      missingFacts,
      nextImportantDate: input.dates?.cancellationDate,
      recommendedAction:
        missingFacts.length > 0 ? "missing-info-needed" : "reminder-needed",
    },
    cancellation: {
      cancellationDate: input.dates?.cancellationDate,
      canPrepareCancellation: missingFacts.length === 0,
    },
    category: input.category ?? "other",
    company: input.company ?? provider,
    confirmedFacts: input.confirmedFacts,
    cost: {
      currency: "EUR",
      ...(input.cost ?? {}),
    },
    createdAt: now,
    dates: input.dates ?? {},
    documentId: input.sourceDocumentId,
    facts: input.facts ?? {},
    id: contractId,
    identifiers: input.identifiers ?? {},
    lifecycleStatus: missingFacts.length > 0 ? "needs-review" : "active",
    missingFacts,
    name: input.name ?? provider,
    persistenceStatus: "local-dev",
    provider,
    source: input.source ?? "manual",
    sourceDocumentId: input.sourceDocumentId,
    updatedAt: now,
    userId: "mock-user",
  };

  mockContractRecords.unshift(contract);

  return { ...contract };
};

const updateMockContractRecord = (
  contractId: string,
  input: ContractRecordUpdateInput,
): ContractRecord | null => {
  const index = mockContractRecords.findIndex(
    (contract) => contract.id === contractId,
  );

  if (index < 0) {
    return null;
  }

  const existing = mockContractRecords[index];
  const updated: ContractRecord = {
    ...existing,
    ...input,
    cost: {
      ...existing.cost,
      ...(input.cost ?? {}),
    },
    dates: {
      ...existing.dates,
      ...(input.dates ?? {}),
    },
    facts: {
      ...existing.facts,
      ...(input.facts ?? {}),
    },
    identifiers: {
      ...existing.identifiers,
      ...(input.identifiers ?? {}),
    },
    updatedAt: new Date().toISOString(),
  };

  mockContractRecords[index] = updated;

  return { ...updated };
};

const createMockReminderRecord = (
  input: ReminderCreateInput,
): ReminderRecord => {
  const now = new Date().toISOString();
  const reminder: ReminderRecord = {
    createdAt: now,
    description: input.description,
    dueDate: input.dueDate,
    id: `reminder-record-${Date.now()}`,
    priority: input.priority ?? "medium",
    reminderDate: input.reminderDate,
    sourceContractId: input.sourceContractId,
    sourceDocumentId: input.sourceDocumentId,
    sourceType: input.sourceType ?? "manual",
    status: "open",
    title: input.title,
    updatedAt: now,
    userId: "mock-user",
  };

  mockReminderRecords.unshift(reminder);

  return { ...reminder };
};

const updateMockReminderRecord = (
  reminderId: string,
  input: ReminderUpdateInput,
): ReminderRecord | null => {
  const index = mockReminderRecords.findIndex(
    (reminder) => reminder.id === reminderId,
  );

  if (index < 0) {
    return null;
  }

  const updated: ReminderRecord = {
    ...mockReminderRecords[index],
    ...input,
    updatedAt: new Date().toISOString(),
  };

  mockReminderRecords[index] = updated;

  return { ...updated };
};

const createMockDocument = (input: CreateDocumentInput): Document => {
  const documentId = `document-${Date.now()}`;

  const document: Document = {
    id: documentId,
    name: input.name,
    category: input.category,
    status: input.status,
    addedAt: new Date().toISOString(),
    autoNamed: input.autoNamed,
    namingConfidence: input.namingConfidence,
    notes: input.notes,
    uploadStatus: "metadata-only",
    securityNote:
      "Lokaler Entwicklungsmodus: Es wurde keine echte Datei produktiv gespeichert.",
    recommendedAction: "Nächster Schritt: Angaben prüfen.",
  };

  mockRuntimeDocuments.unshift(document);

  return document;
};

const createMockUploadRequest = (
  input: RequestDocumentUploadInput,
): RequestDocumentUploadResult => {
  const documentId = `document-upload-${Date.now()}`;
  const safeFileName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
  const document: Document = {
    id: documentId,
    name: input.name,
    category: input.category,
    status: input.status,
    addedAt: new Date().toISOString(),
    autoNamed: input.autoNamed,
    namingConfidence: input.namingConfidence,
    notes: input.notes,
    fileName: input.fileName,
    contentType: input.contentType,
    sizeBytes: input.sizeBytes,
    s3Key: `mock/users/mock-user/documents/${documentId}/${safeFileName}`,
    uploadStatus: "upload-pending",
    securityNote:
      "Lokaler Entwicklungsmodus: Der Upload ist vorbereitet; produktive Speicherung braucht das Backend.",
    recommendedAction: "Nächster Schritt: Angaben prüfen.",
  };

  mockRuntimeDocuments.unshift(document);

  return {
    document,
    uploadHeaders: {
      "content-type": input.contentType,
    },
    uploadUrl: `mock://documents/${documentId}/${safeFileName}`,
  };
};

const completeMockDocumentUpload = (
  input: CompleteDocumentUploadInput,
): CompleteDocumentUploadResult => {
  const document = mockRuntimeDocuments.find(
    (item) => item.id === input.documentId,
  );

  if (!document) {
    throw new Error("Mock document upload could not be completed.");
  }

  document.uploadStatus = "uploaded";
  document.securityNote =
    "Lokaler Entwicklungsmodus: Die Datei wurde nicht produktiv in S3 gespeichert.";
  document.recommendedAction =
    "Nächster Schritt: Angaben prüfen.";

  return { document: { ...document } };
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

  async getAuthSession(): Promise<ApiResult<AuthSession>> {
    if (this.useMockData) {
      return {
        data: mockAuthSession,
        requestId: "mock-auth-session",
        source: "mock",
      };
    }

    const response = await fetch(`${this.baseUrl}/auth/session`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Life Pilot API request failed: ${response.status}`);
    }

    return response.json() as Promise<ApiResult<AuthSession>>;
  }

  async listContracts(): Promise<ApiResult<ContractRecord[]>> {
    if (this.useMockData) {
      return {
        data: mockContractRecords.map((contract) => ({ ...contract })),
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

    return response.json() as Promise<ApiResult<ContractRecord[]>>;
  }

  async createContract(
    input: ContractRecordCreateInput,
  ): Promise<ApiResult<ContractRecord>> {
    if (this.useMockData) {
      return {
        data: createMockContractRecord(input),
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

    return response.json() as Promise<ApiResult<ContractRecord>>;
  }

  async getContract(
    contractId: string,
  ): Promise<ApiResult<ContractRecord | null>> {
    if (this.useMockData) {
      return {
        data:
          mockContractRecords.find((contract) => contract.id === contractId) ??
          null,
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

    return response.json() as Promise<ApiResult<ContractRecord | null>>;
  }

  async updateContract(
    contractId: string,
    input: ContractRecordUpdateInput,
  ): Promise<ApiResult<ContractRecord | null>> {
    if (this.useMockData) {
      return {
        data: updateMockContractRecord(contractId, input),
        requestId: "mock-contracts-update",
        source: "mock",
      };
    }

    const response = await fetch(`${this.baseUrl}/contracts/${contractId}`, {
      body: JSON.stringify(input),
      headers: {
        ...this.getAuthHeaders(),
        "content-type": "application/json",
      },
      method: "PATCH",
    });

    if (!response.ok) {
      throw new Error(`Life Pilot API request failed: ${response.status}`);
    }

    return response.json() as Promise<ApiResult<ContractRecord | null>>;
  }

  async deleteContract(
    contractId: string,
  ): Promise<ApiResult<{ contractId: string; deleted: boolean }>> {
    if (this.useMockData) {
      const index = mockContractRecords.findIndex(
        (contract) => contract.id === contractId,
      );
      const deleted = index >= 0;

      if (deleted) {
        mockContractRecords.splice(index, 1);
      }

      return {
        data: {
          contractId,
          deleted,
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

  async listReminders(): Promise<ApiResult<ReminderRecord[]>> {
    if (this.useMockData) {
      return {
        data: mockReminderRecords.map((reminder) => ({ ...reminder })),
        requestId: "mock-reminders-list",
        source: "mock",
      };
    }

    const response = await fetch(`${this.baseUrl}/reminders`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Life Pilot API request failed: ${response.status}`);
    }

    return response.json() as Promise<ApiResult<ReminderRecord[]>>;
  }

  async createReminder(
    input: ReminderCreateInput,
  ): Promise<ApiResult<ReminderRecord>> {
    if (this.useMockData) {
      return {
        data: createMockReminderRecord(input),
        requestId: "mock-reminders-create",
        source: "mock",
      };
    }

    const response = await fetch(`${this.baseUrl}/reminders`, {
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

    return response.json() as Promise<ApiResult<ReminderRecord>>;
  }

  async getReminder(
    reminderId: string,
  ): Promise<ApiResult<ReminderRecord | null>> {
    if (this.useMockData) {
      return {
        data:
          mockReminderRecords.find((reminder) => reminder.id === reminderId) ??
          null,
        requestId: "mock-reminders-get",
        source: "mock",
      };
    }

    const response = await fetch(`${this.baseUrl}/reminders/${reminderId}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Life Pilot API request failed: ${response.status}`);
    }

    return response.json() as Promise<ApiResult<ReminderRecord | null>>;
  }

  async updateReminder(
    reminderId: string,
    input: ReminderUpdateInput,
  ): Promise<ApiResult<ReminderRecord | null>> {
    if (this.useMockData) {
      return {
        data: updateMockReminderRecord(reminderId, input),
        requestId: "mock-reminders-update",
        source: "mock",
      };
    }

    const response = await fetch(`${this.baseUrl}/reminders/${reminderId}`, {
      body: JSON.stringify(input),
      headers: {
        ...this.getAuthHeaders(),
        "content-type": "application/json",
      },
      method: "PATCH",
    });

    if (!response.ok) {
      throw new Error(`Life Pilot API request failed: ${response.status}`);
    }

    return response.json() as Promise<ApiResult<ReminderRecord | null>>;
  }

  async deleteReminder(
    reminderId: string,
  ): Promise<ApiResult<{ deleted: boolean; reminderId: string }>> {
    if (this.useMockData) {
      const index = mockReminderRecords.findIndex(
        (reminder) => reminder.id === reminderId,
      );
      const deleted = index >= 0;

      if (deleted) {
        mockReminderRecords.splice(index, 1);
      }

      return {
        data: {
          deleted,
          reminderId,
        },
        requestId: "mock-reminders-delete",
        source: "mock",
      };
    }

    const response = await fetch(`${this.baseUrl}/reminders/${reminderId}`, {
      headers: this.getAuthHeaders(),
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error(`Life Pilot API request failed: ${response.status}`);
    }

    return response.json() as Promise<
      ApiResult<{ deleted: boolean; reminderId: string }>
    >;
  }

  async markReminderDone(
    reminderId: string,
  ): Promise<ApiResult<ReminderRecord | null>> {
    return this.updateReminder(reminderId, { status: "done" });
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
  async requestDocumentUpload(
    input: RequestDocumentUploadInput,
  ): Promise<ApiResult<RequestDocumentUploadResult>> {
    if (this.useMockData) {
      return {
        data: createMockUploadRequest(input),
        requestId: "mock-documents-upload-url",
        source: "mock",
      };
    }

    const response = await fetch(`${this.baseUrl}/documents/upload-url`, {
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

    return response.json() as Promise<ApiResult<RequestDocumentUploadResult>>;
  }

  async completeDocumentUpload(
    documentId: string,
  ): Promise<ApiResult<CompleteDocumentUploadResult>> {
    if (this.useMockData) {
      return {
        data: completeMockDocumentUpload({ documentId }),
        requestId: "mock-documents-upload-complete",
        source: "mock",
      };
    }

    const response = await fetch(
      `${this.baseUrl}/documents/${documentId}/complete`,
      {
        body: JSON.stringify({ documentId }),
        headers: {
          ...this.getAuthHeaders(),
          "content-type": "application/json",
        },
        method: "POST",
      },
    );

    if (!response.ok) {
      throw new Error(`Life Pilot API request failed: ${response.status}`);
    }

    return response.json() as Promise<ApiResult<CompleteDocumentUploadResult>>;
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

export const getAuthSession = (
  options?: LifePilotClientOptions,
): Promise<ApiResult<AuthSession>> =>
  createLifePilotClient(options).getAuthSession();

export const listContracts = (
  options?: LifePilotClientOptions,
): Promise<ApiResult<ContractRecord[]>> =>
  createLifePilotClient(options).listContracts();

export const createContract = (
  input: ContractRecordCreateInput,
  options?: LifePilotClientOptions,
): Promise<ApiResult<ContractRecord>> =>
  createLifePilotClient(options).createContract(input);

export const getContract = (
  contractId: string,
  options?: LifePilotClientOptions,
): Promise<ApiResult<ContractRecord | null>> =>
  createLifePilotClient(options).getContract(contractId);

export const updateContract = (
  contractId: string,
  input: ContractRecordUpdateInput,
  options?: LifePilotClientOptions,
): Promise<ApiResult<ContractRecord | null>> =>
  createLifePilotClient(options).updateContract(contractId, input);

export const deleteContract = (
  contractId: string,
  options?: LifePilotClientOptions,
): Promise<ApiResult<{ contractId: string; deleted: boolean }>> =>
  createLifePilotClient(options).deleteContract(contractId);

export const listReminders = (
  options?: LifePilotClientOptions,
): Promise<ApiResult<ReminderRecord[]>> =>
  createLifePilotClient(options).listReminders();

export const createReminder = (
  input: ReminderCreateInput,
  options?: LifePilotClientOptions,
): Promise<ApiResult<ReminderRecord>> =>
  createLifePilotClient(options).createReminder(input);

export const getReminder = (
  reminderId: string,
  options?: LifePilotClientOptions,
): Promise<ApiResult<ReminderRecord | null>> =>
  createLifePilotClient(options).getReminder(reminderId);

export const updateReminder = (
  reminderId: string,
  input: ReminderUpdateInput,
  options?: LifePilotClientOptions,
): Promise<ApiResult<ReminderRecord | null>> =>
  createLifePilotClient(options).updateReminder(reminderId, input);

export const deleteReminder = (
  reminderId: string,
  options?: LifePilotClientOptions,
): Promise<ApiResult<{ deleted: boolean; reminderId: string }>> =>
  createLifePilotClient(options).deleteReminder(reminderId);

export const markReminderDone = (
  reminderId: string,
  options?: LifePilotClientOptions,
): Promise<ApiResult<ReminderRecord | null>> =>
  createLifePilotClient(options).markReminderDone(reminderId);

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
export const requestDocumentUpload = (
  input: RequestDocumentUploadInput,
  options?: LifePilotClientOptions,
): Promise<ApiResult<RequestDocumentUploadResult>> =>
  createLifePilotClient(options).requestDocumentUpload(input);

export const completeDocumentUpload = (
  documentId: string,
  options?: LifePilotClientOptions,
): Promise<ApiResult<CompleteDocumentUploadResult>> =>
  createLifePilotClient(options).completeDocumentUpload(documentId);

export const deleteDocument = (
  documentId: string,
  options?: LifePilotClientOptions,
): Promise<ApiResult<{ deleted: boolean; documentId: string }>> =>
  createLifePilotClient(options).deleteDocument(documentId);

export const listVaultItems = (
  options?: LifePilotClientOptions,
): Promise<ApiResult<VaultItem[]>> =>
  createLifePilotClient(options).listVaultItems();

export {
  mockAuthSession,
  mockContracts,
  mockDocuments,
  mockSnapshot,
  mockVaultItems,
};
