import type { APIGatewayProxyHandlerV2 } from "aws-lambda";

export const handler: APIGatewayProxyHandlerV2 = async () => ({
  statusCode: 200,
  headers: {
    "content-type": "application/json",
  },
  body: JSON.stringify({
    service: "documents",
    status: "placeholder",
    message: "Document upload metadata and S3 coordination will be implemented here.",
  }),
});

