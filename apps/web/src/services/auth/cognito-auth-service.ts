import type { AuthSession, User } from "@lifepilot/shared";
import type { AuthService } from "./auth-service";

export class CognitoAuthService implements AuthService {
  async signIn(): Promise<AuthSession> {
    throw new Error("CognitoAuthService is prepared but not implemented yet.");
  }

  async register(): Promise<AuthSession> {
    throw new Error("CognitoAuthService is prepared but not implemented yet.");
  }

  async signOut(): Promise<void> {
    return Promise.resolve();
  }

  async getCurrentUser(): Promise<User | null> {
    return null;
  }

  async isAuthenticated(): Promise<boolean> {
    return false;
  }
}
