import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { getAuthorizedUserId, jsonResponse } from "./http";
import { placeholderContracts } from "./mock";

export const listContracts = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> => {
  const userId = getAuthorizedUserId(event.requestContext);

  // TODO: Query ContractsTable by userId once DynamoDB persistence is enabled.
  return jsonResponse(200, {
    contracts: placeholderContracts,
    tableName: process.env.CONTRACTS_TABLE_NAME ?? "not-configured",
    userId,
  });
};
