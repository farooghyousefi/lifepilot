import {
  calculateContractSummary,
  createLifePilotClient,
  type LifePilotApiClient,
} from "@lifepilot/api-client";
import type {
  Contract,
  ContractSummary,
  CreateContractInput,
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

  async listContracts(): Promise<Contract[]> {
    const result = await this.apiClient.listContracts();

    return result.data;
  }

  async createContract(input: CreateContractInput): Promise<Contract> {
    const result = await this.apiClient.createContract(input);

    return result.data;
  }

  async getContract(contractId: string): Promise<Contract | null> {
    const result = await this.apiClient.getContract(contractId);

    return result.data;
  }

  async deleteContract(contractId: string): Promise<boolean> {
    const result = await this.apiClient.deleteContract(contractId);

    return result.data.deleted;
  }

  getSummary(contracts: Contract[]): ContractSummary {
    return calculateContractSummary(contracts);
  }
}
