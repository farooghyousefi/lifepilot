import { CognitoAuthService } from "./cognito-auth-service";
import { MockAuthService } from "./mock-auth-service";
import type { AuthService } from "./auth-service";

const shouldUseMockAuth = (): boolean =>
  process.env.NEXT_PUBLIC_USE_MOCK_AUTH !== "false";

export const createAuthService = (): AuthService => {
  if (shouldUseMockAuth()) {
    return new MockAuthService();
  }

  return new CognitoAuthService();
};

export const authService = createAuthService();

export type { AuthService, RegisterInput, SignInInput } from "./auth-service";
export { CognitoAuthService } from "./cognito-auth-service";
export { MockAuthService } from "./mock-auth-service";
