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

const mockSessionStorageKey = "lifepilot:mock-auth-session:v1";

export class MockAuthService implements AuthService {
  private currentSession: AuthSession | null = readStoredMockSession();

  async signIn(input: SignInInput): Promise<AuthSession> {
    const session: AuthSession = {
      accessToken: "mock-access-token",
      loginMethod: "development",
      provider: "mock",
      user: {
        ...demoUser,
        email: input.email,
        name: input.email.split("@")[0] || demoUser.name,
      },
    };

    this.currentSession = session;
    storeMockSession(session);
    setAuthToken(session.accessToken ?? "");

    return session;
  }

  async signUp(input: SignUpInput): Promise<SignUpResult> {
    const session: AuthSession = {
      accessToken: "mock-access-token",
      loginMethod: "development",
      provider: "mock",
      user: {
        ...demoUser,
        email: input.email,
        name: input.name ?? input.email.split("@")[0] ?? demoUser.name,
      },
    };

    this.currentSession = session;
    storeMockSession(session);
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
    clearStoredMockSession();
    clearAuthToken();
  }

  async getCurrentUser(): Promise<User | null> {
    return this.currentSession?.user ?? null;
  }

  async getCurrentSession(): Promise<AuthSession | null> {
    if (!this.currentSession) {
      this.currentSession = readStoredMockSession();
    }

    if (this.currentSession?.accessToken) {
      setAuthToken(this.currentSession.accessToken);
    }

    return this.currentSession;
  }

  async isAuthenticated(): Promise<boolean> {
    return Boolean(this.currentSession);
  }

  getSocialLoginAvailability() {
    return {
      apple: false,
      google: false,
      isHostedUiConfigured: false,
    };
  }

  async startAppleLogin(): Promise<void> {
    throw new Error("Apple Login ist vorbereitet, aber noch nicht aktiviert.");
  }

  async startGoogleLogin(): Promise<void> {
    throw new Error("Google Login ist vorbereitet, aber noch nicht aktiviert.");
  }

  async handleOAuthCallback(): Promise<AuthSession> {
    throw new Error("Diese Anmeldemethode ist noch nicht aktiviert.");
  }

  async refreshSessionIfNeeded(): Promise<AuthSession | null> {
    return this.getCurrentSession();
  }
}

function readStoredMockSession(): AuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(mockSessionStorageKey);

    return rawValue ? (JSON.parse(rawValue) as AuthSession) : null;
  } catch {
    return null;
  }
}

function storeMockSession(session: AuthSession): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(mockSessionStorageKey, JSON.stringify(session));
}

function clearStoredMockSession(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(mockSessionStorageKey);
}
