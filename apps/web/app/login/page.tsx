import type { Metadata } from "next";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Anmelden | Life Pilot",
};

export default function LoginPage() {
  return <LoginForm />;
}
