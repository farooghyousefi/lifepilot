import { createLifePilotClient, getMockContracts } from "@lifepilot/api-client";
import type {
  ContractRecord,
  ContractRecordCreateInput,
  ContractSummary,
} from "@lifepilot/shared";
import type { ContractService } from "./contract-service";

export class MockContractService implements ContractService {
  private readonly mockClient = createLifePilotClient({ useMockData: true });

  async listContracts(): Promise<ContractRecord[]> {
    const result = await this.mockClient.listContracts();

    return result.data;
  }

  async createContract(input: ContractRecordCreateInput): Promise<ContractRecord> {
    const result = await this.mockClient.createContract(input);

    return result.data;
  }

  async getContract(contractId: string): Promise<ContractRecord | null> {
    const result = await this.mockClient.getContract(contractId);

    return result.data;
  }

  async deleteContract(contractId: string): Promise<boolean> {
    const result = await this.mockClient.deleteContract(contractId);

    return result.data.deleted;
  }

  getSummary(contracts: ContractRecord[]): ContractSummary {
    return {
      activeContracts: contracts.length,
      annualSavingsPotential: getMockContracts().reduce(
        (total, contract) => total + contract.annualSavingsPotential,
        0,
      ),
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
}
