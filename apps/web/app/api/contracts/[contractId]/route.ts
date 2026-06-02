import {
  apiError,
  apiResult,
  createRequestId,
  deleteLocalContract,
  getLocalAuthContext,
  getLocalContract,
} from "../../_lib/local-api";

interface RouteContext {
  params: Promise<{
    contractId: string;
  }>;
}

export async function GET(request: Request, context: RouteContext) {
  const requestId = createRequestId("local-contracts-get");
  const auth = getLocalAuthContext(request);
  const { contractId } = await context.params;
  const contract = getLocalContract(auth, contractId);

  if (!contract) {
    return apiError("contract_not_found", "Contract not found.", 404, requestId);
  }

  return apiResult(contract, requestId);
}

export async function DELETE(request: Request, context: RouteContext) {
  const requestId = createRequestId("local-contracts-delete");
  const auth = getLocalAuthContext(request);
  const { contractId } = await context.params;
  const deleted = deleteLocalContract(auth, contractId);

  return apiResult({ contractId, deleted }, requestId);
}
