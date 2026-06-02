import type { Contract } from "@lifepilot/shared";

export const placeholderContracts: Contract[] = [
  {
    id: "placeholder-contract-internet",
    contractId: "placeholder-contract-internet",
    userId: "placeholder-user",
    provider: "Placeholder Internet",
    category: "internet",
    monthlyCost: 39.99,
    contractEnd: "2026-08-26",
    cancellationDeadlineDays: 84,
    status: "cancellation-window",
    statusLabel: "Placeholder contract record. DynamoDB read is not wired yet.",
    riskLevel: "medium",
    annualSavingsPotential: 240,
  },
];

