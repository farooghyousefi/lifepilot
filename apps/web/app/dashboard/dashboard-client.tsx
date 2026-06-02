"use client";

import { useEffect, useMemo, useState } from "react";
import type { Contract } from "@lifepilot/shared";
import { contractService } from "../../src/services/contracts";
import {
  DashboardHeader,
  DashboardSection,
  InsightCard,
  ListItem,
  MobileBottomNav,
  Sidebar,
  SummaryCard,
  type Accent,
} from "./dashboard-ui";

const documentRows = [
  {
    accent: "blue",
    meta: "PDF",
    title: "Insurance Policy",
    value: "Added 3 days ago",
  },
  {
    accent: "blue",
    meta: "PDF",
    title: "Electricity Bill",
    value: "Added 1 week ago",
  },
  {
    accent: "blue",
    meta: "PDF",
    title: "Mobile Contract",
    value: "Added 2 weeks ago",
  },
  {
    accent: "blue",
    meta: "PDF",
    title: "Lease Agreement",
    value: "Added 3 weeks ago",
  },
] as const;

const reminderRows = [
  {
    accent: "orange",
    meta: "Today",
    title: "Review insurance policy",
    value: "10:00",
  },
  {
    accent: "orange",
    meta: "Tomorrow",
    title: "Pay credit card bill",
    value: "9:00",
  },
  {
    accent: "red",
    meta: "May 27",
    title: "Cancel gym membership",
    value: "2:00",
  },
  {
    accent: "green",
    meta: "This week",
    title: "Compare internet contract",
    value: "Open",
  },
] as const;

const insightRows = [
  {
    tone: "green",
    title: "Savings opportunity",
    text: "You may save 240 €/year by reviewing your internet contract.",
  },
  {
    tone: "orange",
    title: "Upcoming deadline",
    text: "Your electricity contract renewal is approaching.",
  },
  {
    tone: "purple",
    title: "Smart suggestion",
    text: "One subscription has not been used recently.",
  },
] as const;

const summaryCards = [
  {
    accent: "green",
    label: "Active Contracts",
    meta: "3 need review",
    value: "12",
  },
  {
    accent: "blue",
    label: "Documents",
    meta: "2 added this week",
    value: "8",
  },
  {
    accent: "orange",
    label: "Reminders",
    meta: "2 due today",
    value: "5",
  },
  {
    accent: "purple",
    label: "AI Insights",
    meta: "New recommendations",
    value: "3",
  },
] as const;

const formatMonthlyCost = (value: number): string =>
  `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value)} €/month`;

const getContractDisplayTitle = (contract: Contract): string => {
  if (contract.provider === "Fitnessstudio") {
    return "Gym Membership";
  }

  return contract.provider;
};

const getContractDisplayValue = (contract: Contract): string => {
  const displayTitles: Record<string, string> = {
    "Vodafone Internet": "Review by Aug 30",
    Fitnessstudio: "Unused for 4 months",
    Stromvertrag: "Better offer found",
  };

  return displayTitles[contract.provider] ?? contract.statusLabel;
};

interface DashboardListRow {
  accent: Accent;
  meta: string;
  title: string;
  value: string;
}

const getContractRows = (contracts: Contract[]): DashboardListRow[] => {
  const serviceRows = contracts
    .filter((contract) =>
      ["Vodafone Internet", "Fitnessstudio", "Stromvertrag"].includes(
        contract.provider,
      ),
    )
    .map<DashboardListRow>((contract) => ({
      accent: contract.riskLevel === "high" ? "red" : "green",
      meta: formatMonthlyCost(contract.monthlyCost),
      title: getContractDisplayTitle(contract),
      value: getContractDisplayValue(contract),
    }));
  const axaRow: DashboardListRow = {
    accent: "blue",
    meta: "18.50 €/month",
    title: "AXA Insurance",
    value: "Renewal soon",
  };

  return [
    ...serviceRows.slice(0, 1),
    axaRow,
    ...serviceRows.slice(1),
  ].slice(0, 4);
};

export function DashboardClient() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadContracts = async () => {
      try {
        const loadedContracts = await contractService.listContracts();

        if (isMounted) {
          setContracts(loadedContracts);
          setErrorMessage(null);
        }
      } catch {
        if (isMounted) {
          setErrorMessage("Contract data is temporarily unavailable.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadContracts();

    return () => {
      isMounted = false;
    };
  }, []);

  const contractRows = useMemo(() => getContractRows(contracts), [contracts]);

  return (
    <div className="min-h-screen bg-life-bg text-life-text">
      <div className="mx-auto grid min-h-screen w-full max-w-[1600px] md:grid-cols-[280px_1fr]">
        <Sidebar />

        <div className="min-w-0 pb-24 md:pb-0">
          <main className="px-5 py-5 sm:px-8 md:px-10 md:py-8 xl:px-12">
            <DashboardHeader />

            <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {summaryCards.map((card) => (
                <SummaryCard
                  accent={card.accent}
                  key={card.label}
                  label={card.label}
                  meta={card.meta}
                  value={card.value}
                />
              ))}
            </section>

            <section className="mt-6 grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
              <DashboardSection
                actionLabel="Review"
                eyebrow="Contracts"
                title="Contracts"
              >
                {isLoading ? (
                  <ListItem
                    accent="green"
                    meta="Loading"
                    title="Contracts are being prepared"
                    value="A moment"
                  />
                ) : errorMessage ? (
                  <ListItem
                    accent="red"
                    meta="Service"
                    title={errorMessage}
                    value="Try again"
                  />
                ) : (
                  contractRows.map((row) => (
                    <ListItem
                      accent={row.accent}
                      key={row.title}
                      meta={row.meta}
                      title={row.title}
                      value={row.value}
                    />
                  ))
                )}
              </DashboardSection>

              <DashboardSection
                actionLabel="Open vault"
                eyebrow="Documents"
                title="Documents"
              >
                {documentRows.map((row) => (
                  <ListItem
                    accent={row.accent}
                    key={row.title}
                    meta={row.meta}
                    title={row.title}
                    value={row.value}
                  />
                ))}
              </DashboardSection>
            </section>

            <section className="mt-5 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
              <DashboardSection
                actionLabel="Plan day"
                eyebrow="Today"
                title="Reminders"
              >
                {reminderRows.map((row) => (
                  <ListItem
                    accent={row.accent}
                    key={row.title}
                    meta={row.meta}
                    title={row.title}
                    value={row.value}
                  />
                ))}
              </DashboardSection>

              <div>
                <div className="mb-4 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[13px] font-semibold text-life-muted">
                      AI Insights
                    </p>
                    <h2 className="mt-1 text-2xl font-semibold tracking-normal text-life-text">
                      Recommended next steps
                    </h2>
                  </div>
                  <button
                    className="hidden rounded-xl border border-life-border bg-white px-4 py-2 text-sm font-semibold text-life-text shadow-soft transition hover:border-life-green/50 hover:text-life-green-dark sm:block"
                    type="button"
                  >
                    View all
                  </button>
                </div>
                <div className="grid gap-4 lg:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
                  {insightRows.map((insight) => (
                    <InsightCard
                      key={insight.title}
                      text={insight.text}
                      title={insight.title}
                      tone={insight.tone}
                    />
                  ))}
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
