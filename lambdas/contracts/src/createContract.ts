import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import type { CreateContractInput } from "@lifepilot/shared";
import { errorResponse, getAuthorizedUserId, jsonResponse } from "./http";

const parseBody = (body: string | undefined): CreateContractInput | null => {
  if (!body) {
    return null;
  }

  try {
    return JSON.parse(body) as CreateContractInput;
  } catch {
    return null;
  }
};

const isValidCreateContractInput = (
  input: CreateContractInput | null,
): input is CreateContractInput =>
  Boolean(
    input?.provider &&
      input.category &&
      typeof input.monthlyCost === "number" &&
      typeof input.cancellationDeadlineDays === "number",
  );

export const createContract = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> => {
  const input = parseBody(event.body);

  if (!isValidCreateContractInput(input)) {
    return errorResponse(400, "Invalid create contract payload.");
  }

  const contractId = `placeholder-${Date.now()}`;
  const userId = getAuthorizedUserId(event.requestContext);

  // TODO: Put item into ContractsTable with keys { userId, contractId }.
  return jsonResponse(201, {
    contract: {
      ...input,
      contractId,
      id: contractId,
      status: input.status ?? "draft",
      statusLabel:
        input.statusLabel ??
        `Kündigungsfrist in ${input.cancellationDeadlineDays} Tagen`,
      riskLevel: input.riskLevel ?? "low",
      annualSavingsPotential: input.annualSavingsPotential ?? 0,
      userId,
    },
    tableName: process.env.CONTRACTS_TABLE_NAME ?? "not-configured",
  });
};
