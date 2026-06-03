import { setAuthToken } from "@lifepilot/api-client";
import { Amplify } from "aws-amplify";
import {
  fetchAuthSession,
  getCurrentUser,
  signIn,
  signOut,
  signUp,
} from "aws-amplify/auth";

import type { AuthSession, User } from "@lifepilot/shared";

import type {
  AuthService,
  RegisterInput,
  SignInInput,
} from "./auth-service";

let amplifyConfigured = false;

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

function createUserFromEmail(email: string, id: string): User {
  return {
    email,
    id,
    name: email.split("@")[0] || "Life Pilot User",
    provider: "cognito",
    role: "user",
  };
}

export class CognitoAuthService implements AuthService {
  constructor() {
    configureAmplify();
  }

  async signIn(input: SignInInput): Promise<AuthSession> {
    const result = await signIn({
      username: input.email,
      password: input.password,
    });

    if (!result.isSignedIn) {
      throw new Error("Sign in requires another step.");
    }

    const session = await fetchAuthSession();
    const currentUser = await getCurrentUser();

    const accessToken = session.tokens?.accessToken?.toString() ?? "";

    setAuthToken(accessToken);

    return {
      accessToken,
      provider: "cognito",
      user: createUserFromEmail(input.email, currentUser.userId),
    };
  }

  async register(input: RegisterInput): Promise<AuthSession> {
    await signUp({
      username: input.email,
      password: input.password,
      options: {
        userAttributes: {
          email: input.email,
          name: input.name,
        },
      },
    });

    return {
      accessToken: "",
      provider: "cognito",
      user: {
        email: input.email,
        id: input.email,
        name: input.name,
        provider: "cognito",
        role: "user",
      },
    };
  }

  async signOut(): Promise<void> {
    await signOut();
    setAuthToken("");
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const currentUser = await getCurrentUser();
      const session = await fetchAuthSession();
      const accessToken = session.tokens?.accessToken?.toString() ?? "";

      setAuthToken(accessToken);

      return createUserFromEmail(currentUser.username, currentUser.userId);
    } catch {
      return null;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return Boolean(user);
  }
}