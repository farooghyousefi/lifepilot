import type {
  ApiResult,
  Contract,
  ContractSummary,
  LifePilotSnapshot,
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
    provider: "Vodafone Internet",
    category: "internet",
    monthlyCost: 39.99,
    contractEnd: "2026-08-26",
    cancellationDeadlineDays: 84,
    status: "Kündigungsfrist in 84 Tagen",
    riskLevel: "medium",
    annualSavingsPotential: 240,
  },
  {
    id: "contract-fitnessstudio",
    provider: "Fitnessstudio",
    category: "fitness",
    monthlyCost: 29.99,
    contractEnd: "2026-12-31",
    cancellationDeadlineDays: 120,
    status: "Seit 4 Monaten nicht genutzt",
    riskLevel: "high",
    annualSavingsPotential: 360,
  },
  {
    id: "contract-stromvertrag",
    provider: "Stromvertrag",
    category: "energy",
    monthlyCost: 92,
    contractEnd: "2026-06-23",
    cancellationDeadlineDays: 21,
    status: "Kündigungsfrist in 21 Tagen",
    riskLevel: "high",
    annualSavingsPotential: 180,
  },
  {
    id: "contract-handyvertrag",
    provider: "Handyvertrag",
    category: "mobile",
    monthlyCost: 24.99,
    contractEnd: "2026-10-15",
    cancellationDeadlineDays: 136,
    status: "Mögliche Alternative gefunden",
    riskLevel: "low",
    annualSavingsPotential: 120,
  },
];

export const getMockContracts = (): Contract[] =>
  mockContracts.map((contract) => ({ ...contract }));

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
  baseUrl?: string;
  useMockData?: boolean;
}

export class LifePilotApiClient {
  private readonly baseUrl: string;
  private readonly useMockData: boolean;

  constructor(options: LifePilotClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? "http://localhost:3000/api";
    this.useMockData = options.useMockData ?? true;
  }

  async getSnapshot(): Promise<ApiResult<LifePilotSnapshot>> {
    if (this.useMockData) {
      return {
        data: mockSnapshot,
        requestId: "mock-request",
        source: "mock",
      };
    }

    const response = await fetch(`${this.baseUrl}/snapshot`);

    if (!response.ok) {
      throw new Error(`Life Pilot API request failed: ${response.status}`);
    }

    return response.json() as Promise<ApiResult<LifePilotSnapshot>>;
  }
}

export const createLifePilotClient = (
  options?: LifePilotClientOptions,
): LifePilotApiClient => new LifePilotApiClient(options);

export { mockContracts, mockSnapshot };
