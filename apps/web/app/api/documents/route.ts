import type { CreateDocumentInput } from "@lifepilot/shared";
import {
  apiError,
  apiResult,
  createLocalDocument,
  createRequestId,
  getLocalAuthContext,
  listLocalDocuments,
} from "../_lib/local-api";

export function GET(request: Request) {
  getLocalAuthContext(request);

  return apiResult(listLocalDocuments(), createRequestId("local-documents"));
}

export async function POST(request: Request) {
  const requestId = createRequestId("local-documents-create");
  getLocalAuthContext(request);
  const input = (await request.json()) as Partial<CreateDocumentInput>;

  if (!input.name || !input.category || !input.status) {
    return apiError(
      "invalid_document_input",
      "Name, category, and status are required.",
      400,
      requestId,
    );
  }

  return apiResult(
    createLocalDocument({
      category: input.category,
      name: input.name,
      notes: input.notes,
      status: input.status,
    }),
    requestId,
  );
}
