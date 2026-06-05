import type {
  ContractRecord,
  ContractRecordCreateInput,
  ContractSummary,
} from "@lifepilot/shared";

export interface ContractService {
  createContract(input: ContractRecordCreateInput): Promise<ContractRecord>;
  deleteContract(contractId: string): Promise<boolean>;
  getContract(contractId: string): Promise<ContractRecord | null>;
  getSummary(contracts: ContractRecord[]): ContractSummary;
  listContracts(): Promise<ContractRecord[]>;
}
