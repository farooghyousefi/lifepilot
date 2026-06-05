import { clearAuthToken, setAuthToken } from "@lifepilot/api-client";
import { Amplify } from "aws-amplify";
import {
  confirmResetPassword,
  confirmSignUp,
  fetchAuthSession,
  getCurrentUser,
  resendSignUpCode,
  resetPassword,
  signIn,
  signOut,
  signUp,
} from "aws-amplify/auth";

import type { AuthSession, User } from "@lifepilot/shared";

import type {
  AuthService,
  ConfirmForgotPasswordInput,
  ConfirmSignUpInput,
  ForgotPasswordInput,
  RegisterInput,
  ResendConfirmationCodeInput,
  SignInInput,
  SignUpInput,
  SignUpResult,
} from "./auth-service";

let amplifyConfigured = false;
let cachedSession: AuthSession | null = null;
let cachedSessionAt = 0;
const sessionCacheMs = 5 * 60 * 1000;

function configureAmplify() {
  if (amplifyConfigured) {
    return;
  }

  const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
  const userPoolClientId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID;

  if (!userPoolId || !userPoolClientId) {
    throw new Error("Missing Cognito environment variables.");
  }

  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId,
        userPoolClientId,
      },
    },
  });

  amplifyConfigured = true;
}

function createUserFromEmail(email: string, id: string, name?: string): User {
  return {
    email,
    id,
    name: name || email.split("@")[0] || "Life Pilot User",
    provider: "cognito",
    role: "user",
  };
}

function getDeliveryDestination(nextStep: unknown): string | undefined {
  if (
    typeof nextStep === "object" &&
    nextStep !== null &&
    "codeDeliveryDetails" in nextStep
  ) {
    const details = nextStep.codeDeliveryDetails;

    if (
      typeof details === "object" &&
      details !== null &&
      "destination" in details &&
      typeof details.destination === "string"
    ) {
      return details.destination;
    }
  }

  return undefined;
}

export class CognitoAuthService implements AuthService {
  constructor() {
    configureAmplify();
  }

  async signIn(input: SignInInput): Promise<AuthSession> {
    const existingSession = await this.getCurrentSession();

    if (existingSession) {
      return existingSession;
    }

    const result = await signIn({
      username: input.email,
      password: input.password,
    });

    if (!result.isSignedIn) {
      throw new Error("Sign in requires another step.");
    }

    const session = await this.getCurrentSession();

    if (!session) {
      throw new Error("Anmeldung konnte nicht abgeschlossen werden.");
    }

    return session;
  }

  async signUp(input: SignUpInput): Promise<SignUpResult> {
    const result = await signUp({
      username: input.email,
      password: input.password,
      options: {
        userAttributes: {
          email: input.email,
          ...(input.name ? { name: input.name } : {}),
        },
      },
    });

    return {
      deliveryDestination: getDeliveryDestination(result.nextStep),
      email: input.email,
      isComplete: result.nextStep.signUpStep === "DONE",
      needsConfirmation: result.nextStep.signUpStep === "CONFIRM_SIGN_UP",
    };
  }

  async register(input: RegisterInput): Promise<SignUpResult> {
    return this.signUp(input);
  }

  async confirmSignUp(input: ConfirmSignUpInput): Promise<SignUpResult> {
    const result = await confirmSignUp({
      username: input.email,
      confirmationCode: input.code,
    });

    return {
      deliveryDestination: getDeliveryDestination(result.nextStep),
      email: input.email,
      isComplete: result.nextStep.signUpStep === "DONE",
      needsConfirmation: result.nextStep.signUpStep === "CONFIRM_SIGN_UP",
    };
  }

  async resendConfirmationCode(
    input: ResendConfirmationCodeInput,
  ): Promise<void> {
    await resendSignUpCode({ username: input.email });
  }

  async forgotPassword(input: ForgotPasswordInput): Promise<void> {
    await resetPassword({ username: input.email });
  }

  async confirmForgotPassword(
    input: ConfirmForgotPasswordInput,
  ): Promise<void> {
    await confirmResetPassword({
      username: input.email,
      confirmationCode: input.code,
      newPassword: input.newPassword,
    });
  }

  async signOut(): Promise<void> {
    await signOut();
    cachedSession = null;
    cachedSessionAt = 0;
    clearAuthToken();
  }

  async getCurrentSession(): Promise<AuthSession | null> {
    if (isCachedSessionUsable()) {
      if (cachedSession?.accessToken) {
        setAuthToken(cachedSession.accessToken);
      }

      return cachedSession;
    }

    try {
      const currentUser = await getCurrentUser();
      const session = await fetchAuthSession();
      const accessToken =
        session.tokens?.idToken?.toString() ??
        session.tokens?.accessToken?.toString() ??
        "";
      const email =
        currentUser.signInDetails?.loginId ??
        currentUser.username;

      setAuthToken(accessToken);

      const authSession: AuthSession = {
        accessToken,
        expiresAt: session.tokens?.accessToken?.payload.exp
          ? new Date(
              Number(session.tokens.accessToken.payload.exp) * 1000,
            ).toISOString()
          : undefined,
        provider: "cognito",
        user: createUserFromEmail(email, currentUser.userId),
      };

      cachedSession = authSession;
      cachedSessionAt = Date.now();

      return authSession;
    } catch {
      cachedSession = null;
      cachedSessionAt = 0;
      clearAuthToken();
      return null;
    }
  }

  async getCurrentUser(): Promise<User | null> {
    const session = await this.getCurrentSession();
    return session?.user ?? null;
  }

  async isAuthenticated(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return Boolean(user);
  }
}

function isCachedSessionUsable(): boolean {
  if (!cachedSession) {
    return false;
  }

  if (Date.now() - cachedSessionAt > sessionCacheMs) {
    return false;
  }

  if (!cachedSession.expiresAt) {
    return true;
  }

  return new Date(cachedSession.expiresAt).getTime() > Date.now() + 60_000;
}
