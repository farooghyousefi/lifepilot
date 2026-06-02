import {
  apiResult,
  createRequestId,
  getLocalAuthContext,
  listLocalVaultItems,
} from "../_lib/local-api";

export function GET(request: Request) {
  getLocalAuthContext(request);

  return apiResult(listLocalVaultItems(), createRequestId("local-vault"));
}
