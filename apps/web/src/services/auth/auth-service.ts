import type { AuthSession, User } from "@lifepilot/shared";

export interface SignInInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  name: string;
  password: string;
}

export interface AuthService {
  getCurrentUser(): Promise<User | null>;
  isAuthenticated(): Promise<boolean>;
  register(input: RegisterInput): Promise<AuthSession>;
  signIn(input: SignInInput): Promise<AuthSession>;
  signOut(): Promise<void>;
}
