"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  CreditCard,
  Plus,
  Scissors,
  Search,
  Sparkles,
  WalletCards,
} from "lucide-react";
import type {
  Contract,
  ContractCategory,
  CreateContractInput,
  RiskLevel,
} from "@lifepilot/shared";

import { contractService } from "../../src/services/contracts";
import {
  LifePilotShell,
  PageHeader,
  SummaryCard,
} from "../dashboard/dashboard-ui";

const categoryLabels: Record<ContractCategory, string> = {
  energy: "Energy",
  fitness: "Fitness",
  insurance: "Insurance",
  internet: "Internet",
  mobile: "Mobile",
  other: "Other",
  subscription: "Subscription",
};

const riskStyles: Record<
  RiskLevel,
  {
    bg: string;
    dot: string;
    label: string;
    text: string;
  }
> = {
  high: {
    bg: "bg-[#FFF3F1]",
    dot: "bg-[#FF5E57]",
    label: "High attention",
    text: "text-[#E14C45]",
  },
  low: {
    bg: "bg-[#F2FAF6]",
    dot: "bg-[#35B984]",
    label: "On track",
    text: "text-[#2FA779]",
  },
  medium: {
    bg: "bg-[#FFF7EA]",
    dot: "bg-[#F59E0B]",
    label: "Review soon",
    text: "text-[#D98806]",
  },
};

const emptyForm: CreateContractInput = {
  annualSavingsPotential: 0,
  cancellationDeadlineDays: 30,
  category: "internet",
  contractEnd: "",
  monthlyCost: 0,
  provider: "",
  riskLevel: "low",
  status: "draft",
  statusLabel: "New contract draft",
};

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat("de-DE", {
    currency: "EUR",
    maximumFractionDigits: 2,
    style: "currency",
  }).format(value);

export function ContractsClient() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [form, setForm] = useState<CreateContractInput>(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    contractService
      .listContracts()
      .then((items) => {
        if (isMounted) {
          setContracts(items);
        }
      })
      .catch(() => {
        if (isMounted) {
          setError("Contracts could not be loaded. Mock mode may be disabled.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const summary = useMemo(
    () => contractService.getSummary(contracts),
    [contracts],
  );

  const summaryCards = [
    {
      accent: "green",
      icon: WalletCards,
      label: "Monthly fixed costs",
      meta: "Across active contracts",
      value: formatCurrency(summary.monthlyFixedCosts),
      visual: "chart",
    },
    {
      accent: "blue",
      icon: CreditCard,
      label: "Active contracts",
      meta: "Managed locally",
      value: String(summary.activeContracts),
      visual: "document",
    },
    {
      accent: "red",
      icon: CalendarClock,
      label: "Critical deadlines",
      meta: "Need review soon",
      value: String(summary.criticalDeadlines),
      visual: "bell",
    },
    {
      accent: "purple",
      icon: Sparkles,
      label: "Annual savings",
      meta: "Estimated potential",
      value: formatCurrency(summary.annualSavingsPotential),
      visual: "sparkles",
    },
  ] as const;

  const updateForm = <Key extends keyof CreateContractInput>(
    key: Key,
    value: CreateContractInput[Key],
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.provider.trim()) {
      setError("Please add a provider name.");
      return;
    }

    setError(null);

    const created = await contractService.createContract({
      ...form,
      contractEnd: form.contractEnd || undefined,
      monthlyCost: Number(form.monthlyCost),
      provider: form.provider.trim(),
    });

    setContracts((current) => [created, ...current]);
    setForm(emptyForm);
  };

  return (
    <LifePilotShell activeItem="Contracts">
      <PageHeader
        eyebrow="Contracts"
        subtitle="Review costs, deadlines and savings opportunities without leaving the calm Life Pilot workspace."
        title="Contract overview"
      />

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <SummaryCard
            accent={card.accent}
            icon={card.icon}
            key={card.label}
            label={card.label}
            meta={card.meta}
            value={card.value}
            visual={card.visual}
          />
        ))}
      </section>

      <section className="mt-7 grid gap-5 xl:grid-cols-[1fr_380px]">
        <section className="rounded-[22px] border border-[#ECEFEB] bg-white p-5 shadow-card sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-[-0.01em] text-[#101828]">
                Managed contracts
              </h2>
              <p className="mt-1 text-[13px] font-semibold text-[#667085]">
                Loaded through ContractService with local mock mode by default.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-[#ECEFEB] bg-[#FCFBFA] px-4 py-2 text-[13px] font-bold text-[#667085]">
              <Search className="size-4" aria-hidden="true" />
              {isLoading ? "Loading..." : `${contracts.length} contracts`}
            </div>
          </div>

          {error ? (
            <div className="mt-5 rounded-[18px] border border-[#FBE3DF] bg-[#FFF3F1] p-4 text-[14px] font-semibold text-[#E14C45]">
              {error}
            </div>
          ) : null}

          <div className="mt-5 grid gap-4">
            {contracts.map((contract) => (
              <ContractCard contract={contract} key={contract.contractId} />
            ))}
          </div>
        </section>

        <section className="rounded-[22px] border border-[#ECEFEB] bg-white p-5 shadow-card sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-[#EAF7F0] text-[#2FA779]">
              <Plus className="size-6" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-[-0.01em] text-[#101828]">
                Add contract
              </h2>
              <p className="mt-1 text-[13px] font-semibold text-[#667085]">
                Local state only in this phase.
              </p>
            </div>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="text-[13px] font-bold text-[#344054]">
                Provider
              </span>
              <input
                className="mt-2 w-full rounded-xl border border-[#ECEFEB] bg-[#FCFBFA] px-4 py-3 text-[14px] font-semibold text-[#101828] outline-none transition placeholder:text-[#98A2B3] focus:border-[#B9DEC7] focus:bg-white"
                onChange={(event) => updateForm("provider", event.target.value)}
                placeholder="e.g. Internet provider"
                type="text"
                value={form.provider}
              />
            </label>

            <label className="block">
              <span className="text-[13px] font-bold text-[#344054]">
                Category
              </span>
              <select
                className="mt-2 w-full rounded-xl border border-[#ECEFEB] bg-[#FCFBFA] px-4 py-3 text-[14px] font-semibold text-[#101828] outline-none transition focus:border-[#B9DEC7] focus:bg-white"
                onChange={(event) =>
                  updateForm("category", event.target.value as ContractCategory)
                }
                value={form.category}
              >
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <label className="block">
                <span className="text-[13px] font-bold text-[#344054]">
                  Monthly cost
                </span>
                <input
                  className="mt-2 w-full rounded-xl border border-[#ECEFEB] bg-[#FCFBFA] px-4 py-3 text-[14px] font-semibold text-[#101828] outline-none transition focus:border-[#B9DEC7] focus:bg-white"
                  min="0"
                  onChange={(event) =>
                    updateForm("monthlyCost", Number(event.target.value))
                  }
                  step="0.01"
                  type="number"
                  value={form.monthlyCost}
                />
              </label>

              <label className="block">
                <span className="text-[13px] font-bold text-[#344054]">
                  Cancellation deadline
                </span>
                <input
                  className="mt-2 w-full rounded-xl border border-[#ECEFEB] bg-[#FCFBFA] px-4 py-3 text-[14px] font-semibold text-[#101828] outline-none transition focus:border-[#B9DEC7] focus:bg-white"
                  min="0"
                  onChange={(event) =>
                    updateForm(
                      "cancellationDeadlineDays",
                      Number(event.target.value),
                    )
                  }
                  type="number"
                  value={form.cancellationDeadlineDays}
                />
              </label>
            </div>

            <label className="block">
              <span className="text-[13px] font-bold text-[#344054]">
                Contract end
              </span>
              <input
                className="mt-2 w-full rounded-xl border border-[#ECEFEB] bg-[#FCFBFA] px-4 py-3 text-[14px] font-semibold text-[#101828] outline-none transition focus:border-[#B9DEC7] focus:bg-white"
                onChange={(event) =>
                  updateForm("contractEnd", event.target.value)
                }
                type="date"
                value={form.contractEnd}
              />
            </label>

            <button
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2FA779] px-4 py-3 text-[14px] font-bold text-white shadow-button transition hover:bg-[#258866]"
              type="submit"
            >
              <Plus className="size-4" aria-hidden="true" />
              Add contract
            </button>
          </form>
        </section>
      </section>
    </LifePilotShell>
  );
}

function ContractCard({ contract }: { contract: Contract }) {
  const risk = riskStyles[contract.riskLevel];

  return (
    <article className="rounded-[20px] border border-[#ECEFEB] bg-[#FCFBFA] p-5 transition hover:border-[#D5EBDD] hover:bg-white">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[17px] font-bold tracking-[-0.01em] text-[#101828]">
              {contract.provider}
            </h3>
            <span className="rounded-full bg-white px-3 py-1 text-[12px] font-bold text-[#667085]">
              {categoryLabels[contract.category]}
            </span>
          </div>
          <p className="mt-2 text-[14px] font-semibold text-[#667085]">
            {contract.statusLabel}
          </p>
        </div>

        <div className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-bold ${risk.bg} ${risk.text}`}>
          <span className={`size-2 rounded-full ${risk.dot}`} />
          {risk.label}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <MetricBlock
          label="Monthly"
          value={formatCurrency(contract.monthlyCost)}
        />
        <MetricBlock
          label="Deadline"
          value={`${contract.cancellationDeadlineDays} days`}
        />
        <MetricBlock
          label="Savings/year"
          value={formatCurrency(contract.annualSavingsPotential)}
        />
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#ECEFEB] bg-white px-4 py-3 text-[13px] font-bold text-[#344054] shadow-button transition hover:border-[#D5EBDD] hover:text-[#2FA779]"
          type="button"
        >
          <Search className="size-4" aria-hidden="true" />
          View details
        </button>
        <button
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#EAF7F0] px-4 py-3 text-[13px] font-bold text-[#2FA779] transition hover:bg-[#DDEFE6]"
          type="button"
        >
          <Scissors className="size-4" aria-hidden="true" />
          Prepare cancellation
        </button>
      </div>
    </article>
  );
}

function MetricBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] border border-[#ECEFEB] bg-white p-4">
      <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#98A2B3]">
        {label}
      </p>
      <p className="mt-2 text-[16px] font-bold text-[#101828]">{value}</p>
    </div>
  );
}
