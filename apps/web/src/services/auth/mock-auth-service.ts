import type { AuthSession, User } from "@lifepilot/shared";
import { setAuthToken, clearAuthToken } from "@lifepilot/api-client";
import type {
  AuthService,
  RegisterInput,
  SignInInput,
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

  async register(input: RegisterInput): Promise<AuthSession> {
    const session: AuthSession = {
      accessToken: "mock-access-token",
      provider: "mock",
      user: {
        ...demoUser,
        email: input.email,
        name: input.name,
      },
    };

    this.currentSession = session;
    setAuthToken(session.accessToken ?? "");

    return session;
  }

  async signOut(): Promise<void> {
    this.currentSession = null;
    clearAuthToken();
  }

  async getCurrentUser(): Promise<User | null> {
    return this.currentSession?.user ?? null;
  }

  async isAuthenticated(): Promise<boolean> {
    return Boolean(this.currentSession);
  }
}
