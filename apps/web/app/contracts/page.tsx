import type { Metadata } from "next";

import { ContractsClient } from "./contracts-client";

export const metadata: Metadata = {
  title: "Contract Brain | LifePilot",
};

export default function ContractsPage() {
  return <ContractsClient />;
}
