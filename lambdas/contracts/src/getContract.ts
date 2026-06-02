import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { errorResponse, jsonResponse } from "./http";
import { placeholderContracts } from "./mock";

export const getContract = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> => {
  const contractId = event.pathParameters?.contractId;

  if (!contractId) {
    return errorResponse(400, "Missing contractId path parameter.");
  }

  // TODO: Get item from ContractsTable using { userId, contractId }.
  const contract =
    placeholderContracts.find((item) => item.contractId === contractId) ?? null;

  return jsonResponse(contract ? 200 : 404, {
    contract,
    contractId,
    tableName: process.env.CONTRACTS_TABLE_NAME ?? "not-configured",
  });
};
