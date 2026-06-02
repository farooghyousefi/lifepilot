import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { createContract } from "./createContract";
import { deleteContract } from "./deleteContract";
import { errorResponse } from "./http";
import { getContract } from "./getContract";
import { listContracts } from "./listContracts";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const method = event.requestContext.http.method;
  const hasContractId = Boolean(event.pathParameters?.contractId);

  if (method === "GET" && !hasContractId) {
    return listContracts(event);
  }

  if (method === "POST" && !hasContractId) {
    return createContract(event);
  }

  if (method === "GET" && hasContractId) {
    return getContract(event);
  }

  if (method === "DELETE" && hasContractId) {
    return deleteContract(event);
  }

  return errorResponse(405, "Unsupported contracts route.");
};

export { createContract, deleteContract, getContract, listContracts };
