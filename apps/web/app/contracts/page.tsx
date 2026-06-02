import type { Metadata } from "next";

import { ContractsClient } from "./contracts-client";

export const metadata: Metadata = {
  title: "Contracts | Life Pilot",
};

export default function ContractsPage() {
  return <ContractsClient />;
}
