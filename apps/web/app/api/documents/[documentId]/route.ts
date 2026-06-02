import {
  apiError,
  apiResult,
  createRequestId,
  deleteLocalDocument,
  getLocalAuthContext,
  getLocalDocument,
} from "../../_lib/local-api";

interface RouteContext {
  params: Promise<{
    documentId: string;
  }>;
}

export async function GET(request: Request, context: RouteContext) {
  const requestId = createRequestId("local-documents-get");
  getLocalAuthContext(request);
  const { documentId } = await context.params;
  const document = getLocalDocument(documentId);

  if (!document) {
    return apiError("document_not_found", "Document not found.", 404, requestId);
  }

  return apiResult(document, requestId);
}

export async function DELETE(request: Request, context: RouteContext) {
  const requestId = createRequestId("local-documents-delete");
  getLocalAuthContext(request);
  const { documentId } = await context.params;
  const deleted = deleteLocalDocument(documentId);

  return apiResult({ deleted, documentId }, requestId);
}
