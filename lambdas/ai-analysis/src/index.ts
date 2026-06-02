import type { APIGatewayProxyHandlerV2 } from "aws-lambda";

export const handler: APIGatewayProxyHandlerV2 = async () => ({
  statusCode: 200,
  headers: {
    "content-type": "application/json",
  },
  body: JSON.stringify({
    service: "ai-analysis",
    status: "placeholder",
    message: "AI analysis will use approved providers and explicit secrets management later.",
  }),
});

