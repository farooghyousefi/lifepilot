import { ApiContractService } from "./api-contract-service";
import { MockContractService } from "./mock-contract-service";
import type { ContractService } from "./contract-service";

const shouldUseMocks = (): boolean =>
  process.env.NEXT_PUBLIC_USE_MOCKS !== "false";

const getApiBaseUrl = (): string | undefined =>
  process.env.NEXT_PUBLIC_API_BASE_URL;

export const createContractService = (): ContractService => {
  if (shouldUseMocks()) {
    return new MockContractService();
  }

  return new ApiContractService({
    baseUrl: getApiBaseUrl(),
  });
};

export const contractService = createContractService();

export type { ContractService } from "./contract-service";
export { ApiContractService } from "./api-contract-service";
export { MockContractService } from "./mock-contract-service";

