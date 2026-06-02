import type {
  Contract,
  ContractSummary,
  CreateContractInput,
} from "@lifepilot/shared";

export interface ContractService {
  createContract(input: CreateContractInput): Promise<Contract>;
  deleteContract(contractId: string): Promise<boolean>;
  getContract(contractId: string): Promise<Contract | null>;
  getSummary(contracts: Contract[]): ContractSummary;
  listContracts(): Promise<Contract[]>;
}

