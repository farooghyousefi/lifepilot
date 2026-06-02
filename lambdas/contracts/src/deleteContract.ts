import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { errorResponse, jsonResponse } from "./http";

export const deleteContract = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> => {
  const contractId = event.pathParameters?.contractId;

  if (!contractId) {
    return errorResponse(400, "Missing contractId path parameter.");
  }

  // TODO: Delete item from ContractsTable using { userId, contractId }.
  return jsonResponse(200, {
    contractId,
    deleted: false,
    message: "Placeholder only. No DynamoDB delete has been performed.",
    tableName: process.env.CONTRACTS_TABLE_NAME ?? "not-configured",
  });
};
