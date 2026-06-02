import type { Metadata } from "next";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in | Life Pilot",
};

export default function LoginPage() {
  return <LoginForm />;
}
