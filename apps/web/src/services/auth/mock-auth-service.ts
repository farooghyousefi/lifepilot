import type { AuthSession, User } from "@lifepilot/shared";
import { setAuthToken, clearAuthToken } from "@lifepilot/api-client";
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

const demoUser: User = {
  email: "demo@lifepilot.local",
  id: "mock-user-demo",
  name: "Life Pilot",
  provider: "mock",
  role: "user",
};

export class MockAuthService implements AuthService {
  private currentSession: AuthSession | null = {
    accessToken: "mock-access-token",
    provider: "mock",
    user: demoUser,
  };

  async signIn(input: SignInInput): Promise<AuthSession> {
    const session: AuthSession = {
      accessToken: "mock-access-token",
      provider: "mock",
      user: {
        ...demoUser,
        email: input.email,
        name: input.email.split("@")[0] || demoUser.name,
      },
    };

    this.currentSession = session;
    setAuthToken(session.accessToken ?? "");

    return session;
  }

  async signUp(input: SignUpInput): Promise<SignUpResult> {
    const session: AuthSession = {
      accessToken: "mock-access-token",
      provider: "mock",
      user: {
        ...demoUser,
        email: input.email,
        name: input.name ?? input.email.split("@")[0] ?? demoUser.name,
      },
    };

    this.currentSession = session;
    setAuthToken(session.accessToken ?? "");

    return {
      email: input.email,
      isComplete: true,
      needsConfirmation: false,
    };
  }

  async register(input: RegisterInput): Promise<SignUpResult> {
    return this.signUp(input);
  }

  async confirmSignUp(input: ConfirmSignUpInput): Promise<SignUpResult> {
    return {
      email: input.email,
      isComplete: true,
      needsConfirmation: false,
    };
  }

  async resendConfirmationCode(
    input: ResendConfirmationCodeInput,
  ): Promise<void> {
    void input;
    return undefined;
  }

  async forgotPassword(input: ForgotPasswordInput): Promise<void> {
    void input;
    return undefined;
  }

  async confirmForgotPassword(
    input: ConfirmForgotPasswordInput,
  ): Promise<void> {
    void input;
    return undefined;
  }

  async signOut(): Promise<void> {
    this.currentSession = null;
    clearAuthToken();
  }

  async getCurrentUser(): Promise<User | null> {
    return this.currentSession?.user ?? null;
  }

  async getCurrentSession(): Promise<AuthSession | null> {
    return this.currentSession;
  }

  async isAuthenticated(): Promise<boolean> {
    return Boolean(this.currentSession);
  }
}
