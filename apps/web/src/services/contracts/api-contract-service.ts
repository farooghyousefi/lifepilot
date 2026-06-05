import { createLifePilotClient, type LifePilotApiClient } from "@lifepilot/api-client";
import type {
  ContractRecord,
  ContractRecordCreateInput,
  ContractSummary,
} from "@lifepilot/shared";
import type { ContractService } from "./contract-service";

export interface ApiContractServiceOptions {
  baseUrl?: string;
}

export class ApiContractService implements ContractService {
  private readonly apiClient: LifePilotApiClient;

  constructor(options: ApiContractServiceOptions = {}) {
    this.apiClient = createLifePilotClient({
      baseUrl: options.baseUrl,
      useMockData: false,
    });
  }

  async listContracts(): Promise<ContractRecord[]> {
    const result = await this.apiClient.listContracts();

    return result.data;
  }

  async createContract(input: ContractRecordCreateInput): Promise<ContractRecord> {
    const result = await this.apiClient.createContract(input);

    return result.data;
  }

  async getContract(contractId: string): Promise<ContractRecord | null> {
    const result = await this.apiClient.getContract(contractId);

    return result.data;
  }

  async deleteContract(contractId: string): Promise<boolean> {
    const result = await this.apiClient.deleteContract(contractId);

    return result.data.deleted;
  }

  getSummary(contracts: ContractRecord[]): ContractSummary {
    return summarizeContractRecords(contracts);
  }
}

function summarizeContractRecords(
  contracts: ContractRecord[],
): ContractSummary {
  return {
    activeContracts: contracts.length,
    annualSavingsPotential: 0,
    criticalDeadlines: contracts.filter(
      (contract) =>
        contract.lifecycleStatus === "cancellable-now" ||
        contract.lifecycleStatus === "cancellation-window-upcoming",
    ).length,
    monthlyFixedCosts: contracts.reduce(
      (total, contract) => total + (contract.cost.amount ?? 0),
      0,
    ),
  };
}
