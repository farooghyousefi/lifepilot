import type { AuthSession, User } from "@lifepilot/shared";

export type SocialLoginProvider = "apple" | "google";

export interface SocialLoginAvailability {
  apple: boolean;
  google: boolean;
  isHostedUiConfigured: boolean;
}

export interface SignInInput {
  email: string;
  password: string;
}

export interface SignUpInput {
  email: string;
  name?: string;
  password: string;
}

export type RegisterInput = SignUpInput;

export interface ConfirmSignUpInput {
  code: string;
  email: string;
}

export interface ResendConfirmationCodeInput {
  email: string;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ConfirmForgotPasswordInput {
  code: string;
  email: string;
  newPassword: string;
}

export interface SignUpResult {
  deliveryDestination?: string;
  email: string;
  isComplete: boolean;
  needsConfirmation: boolean;
}

export interface AuthService {
  confirmForgotPassword(input: ConfirmForgotPasswordInput): Promise<void>;
  confirmSignUp(input: ConfirmSignUpInput): Promise<SignUpResult>;
  forgotPassword(input: ForgotPasswordInput): Promise<void>;
  getCurrentSession(): Promise<AuthSession | null>;
  getCurrentUser(): Promise<User | null>;
  getSocialLoginAvailability(): SocialLoginAvailability;
  handleOAuthCallback(): Promise<AuthSession>;
  isAuthenticated(): Promise<boolean>;
  refreshSessionIfNeeded(): Promise<AuthSession | null>;
  register(input: RegisterInput): Promise<SignUpResult>;
  resendConfirmationCode(input: ResendConfirmationCodeInput): Promise<void>;
  signIn(input: SignInInput): Promise<AuthSession>;
  startAppleLogin(): Promise<void>;
  startGoogleLogin(): Promise<void>;
  signUp(input: SignUpInput): Promise<SignUpResult>;
  signOut(): Promise<void>;
}
