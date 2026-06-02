import type { CreateContractInput } from "@lifepilot/shared";
import {
  apiError,
  apiResult,
  createLocalContract,
  createRequestId,
  getLocalAuthContext,
  listLocalContracts,
} from "../_lib/local-api";

export function GET(request: Request) {
  const auth = getLocalAuthContext(request);

  return apiResult(listLocalContracts(auth), createRequestId("local-contracts"));
}

export async function POST(request: Request) {
  const requestId = createRequestId("local-contracts-create");
  const auth = getLocalAuthContext(request);
  const input = (await request.json()) as Partial<CreateContractInput>;

  if (
    !input.provider ||
    !input.category ||
    typeof input.monthlyCost !== "number" ||
    typeof input.cancellationDeadlineDays !== "number"
  ) {
    return apiError(
      "invalid_contract_input",
      "Provider, category, monthlyCost, and cancellationDeadlineDays are required.",
      400,
      requestId,
    );
  }

  return apiResult(
    createLocalContract(auth, {
      annualSavingsPotential: input.annualSavingsPotential,
      cancellationDeadlineDays: input.cancellationDeadlineDays,
      category: input.category,
      contractEnd: input.contractEnd,
      monthlyCost: input.monthlyCost,
      provider: input.provider,
      riskLevel: input.riskLevel,
      status: input.status,
      statusLabel: input.statusLabel,
    }),
    requestId,
  );
}
