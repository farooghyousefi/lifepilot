import { apiResult, createRequestId, getDemoSession } from "../../_lib/local-api";

export function GET() {
  return apiResult(getDemoSession(), createRequestId("local-auth-session"));
}
