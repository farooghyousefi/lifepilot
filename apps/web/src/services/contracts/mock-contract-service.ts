import {
  calculateContractSummary,
  createLifePilotClient,
  getMockContracts,
} from "@lifepilot/api-client";
import type {
  Contract,
  ContractSummary,
  CreateContractInput,
} from "@lifepilot/shared";
import type { ContractService } from "./contract-service";

export class MockContractService implements ContractService {
  private contracts: Contract[] = getMockContracts();
  private readonly mockClient = createLifePilotClient({ useMockData: true });

  async listContracts(): Promise<Contract[]> {
    return this.contracts.map((contract) => ({ ...contract }));
  }

  async createContract(input: CreateContractInput): Promise<Contract> {
    const result = await this.mockClient.createContract(input);
    const contract = result.data;

    this.contracts = [contract, ...this.contracts];

    return { ...contract };
  }

  async getContract(contractId: string): Promise<Contract | null> {
    const contract =
      this.contracts.find((item) => item.contractId === contractId) ?? null;

    return contract ? { ...contract } : null;
  }

  async deleteContract(contractId: string): Promise<boolean> {
    const initialLength = this.contracts.length;

    this.contracts = this.contracts.filter(
      (contract) => contract.contractId !== contractId,
    );

    return this.contracts.length !== initialLength;
  }

  getSummary(contracts: Contract[]): ContractSummary {
    return calculateContractSummary(contracts);
  }
}

