import type { Metadata } from "next";

import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Konto erstellen | Life Pilot",
};

export default function RegisterPage() {
  return <RegisterForm />;
}
