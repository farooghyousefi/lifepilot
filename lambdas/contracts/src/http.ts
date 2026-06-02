import type { APIGatewayProxyStructuredResultV2 } from "aws-lambda";

export interface LambdaApiResult<T> {
  data: T;
  requestId: string;
  source: "placeholder";
}

export const jsonResponse = <T>(
  statusCode: number,
  data: T,
  requestId = "contracts-placeholder",
): APIGatewayProxyStructuredResultV2 => ({
  statusCode,
  headers: {
    "content-type": "application/json",
  },
  body: JSON.stringify({
    data,
    requestId,
    source: "placeholder",
  } satisfies LambdaApiResult<T>),
});

export const errorResponse = (
  statusCode: number,
  message: string,
): APIGatewayProxyStructuredResultV2 =>
  jsonResponse(statusCode, {
    message,
  });

export const getAuthorizedUserId = (requestContext: unknown): string => {
  const context = requestContext as {
    authorizer?: {
      jwt?: {
        claims?: {
          sub?: string;
        };
      };
    };
  };

  return context.authorizer?.jwt?.claims?.sub ?? "placeholder-user";
};
