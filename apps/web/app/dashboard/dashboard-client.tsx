"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  calculateContractSummary,
  getMockContracts,
} from "@lifepilot/api-client";
import type { Contract, ContractCategory, RiskLevel } from "@lifepilot/shared";
import { ContractCard } from "./contract-card";

const categoryOptions: Array<{ label: string; value: ContractCategory }> = [
  { label: "Internet", value: "internet" },
  { label: "Fitness", value: "fitness" },
  { label: "Energie", value: "energy" },
  { label: "Mobilfunk", value: "mobile" },
  { label: "Versicherung", value: "insurance" },
  { label: "Abo", value: "subscription" },
  { label: "Sonstiges", value: "other" },
];

const initialForm = {
  provider: "",
  category: "other" as ContractCategory,
  monthlyCost: "",
  contractEnd: "",
  cancellationDeadlineDays: "",
};

const fieldLabelClasses = "grid gap-2 text-sm font-semibold text-slate-700";
const fieldControlClasses =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-graphite";

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat("de-DE", {
    currency: "EUR",
    style: "currency",
  }).format(value);

const getRiskLevel = (deadlineDays: number): RiskLevel => {
  if (deadlineDays <= 30) {
    return "high";
  }

  if (deadlineDays <= 90) {
    return "medium";
  }

  return "low";
};

export function DashboardClient() {
  const [contracts, setContracts] = useState<Contract[]>(() =>
    getMockContracts(),
  );
  const [form, setForm] = useState(initialForm);

  const summary = useMemo(
    () => calculateContractSummary(contracts),
    [contracts],
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const monthlyCost = Number.parseFloat(form.monthlyCost);
    const cancellationDeadlineDays = Number.parseInt(
      form.cancellationDeadlineDays,
      10,
    );

    if (
      !form.provider.trim() ||
      Number.isNaN(monthlyCost) ||
      Number.isNaN(cancellationDeadlineDays)
    ) {
      return;
    }

    const newContract: Contract = {
      id: `contract-${Date.now()}`,
      provider: form.provider.trim(),
      category: form.category,
      monthlyCost,
      contractEnd: form.contractEnd || undefined,
      cancellationDeadlineDays,
      status: `Kündigungsfrist in ${cancellationDeadlineDays} Tagen`,
      riskLevel: getRiskLevel(cancellationDeadlineDays),
      annualSavingsPotential: 0,
    };

    setContracts((currentContracts) => [newContract, ...currentContracts]);
    setForm(initialForm);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-5 py-5 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500">Life Pilot</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-normal text-graphite sm:text-4xl">
              Life Pilot Dashboard
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
              Verträge, Kosten, Fristen und Sparpotenziale im Blick.
            </p>
          </div>
          <a
            className="w-fit rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-graphite transition hover:border-slate-500"
            href="/"
          >
            Zur Landing Page
          </a>
        </div>
      </header>

      <main className="px-5 py-8 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-8">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Monatliche Fixkosten"
              value={formatCurrency(summary.monthlyFixedCosts)}
            />
            <SummaryCard
              label="Verträge aktiv"
              value={`${summary.activeContracts}`}
            />
            <SummaryCard
              label="Kritische Fristen"
              value={`${summary.criticalDeadlines}`}
            />
            <SummaryCard
              label="Geschätztes Sparpotenzial pro Jahr"
              value={formatCurrency(summary.annualSavingsPotential)}
            />
          </section>

          <section className="grid gap-8 lg:grid-cols-[1.5fr_0.8fr] lg:items-start">
            <div className="grid gap-4">
              <div>
                <h2 className="text-2xl font-semibold tracking-normal text-graphite">
                  Vertragsliste
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Mock-Daten für Vertragskosten, Risiken und Sparpotenziale.
                </p>
              </div>
              <div className="grid gap-4">
                {contracts.map((contract) => (
                  <ContractCard contract={contract} key={contract.id} />
                ))}
              </div>
            </div>

            <form
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
              onSubmit={handleSubmit}
            >
              <h2 className="text-xl font-semibold text-graphite">
                Vertrag hinzufügen
              </h2>
              <div className="mt-5 grid gap-4">
                <label className={fieldLabelClasses}>
                  Anbieter
                  <input
                    className={fieldControlClasses}
                    onChange={(event) =>
                      setForm((currentForm) => ({
                        ...currentForm,
                        provider: event.target.value,
                      }))
                    }
                    placeholder="z. B. Versicherung"
                    type="text"
                    value={form.provider}
                  />
                </label>
                <label className={fieldLabelClasses}>
                  Kategorie
                  <select
                    className={fieldControlClasses}
                    onChange={(event) =>
                      setForm((currentForm) => ({
                        ...currentForm,
                        category: event.target.value as ContractCategory,
                      }))
                    }
                    value={form.category}
                  >
                    {categoryOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={fieldLabelClasses}>
                  Monatliche Kosten
                  <input
                    className={fieldControlClasses}
                    min="0"
                    onChange={(event) =>
                      setForm((currentForm) => ({
                        ...currentForm,
                        monthlyCost: event.target.value,
                      }))
                    }
                    placeholder="39.99"
                    step="0.01"
                    type="number"
                    value={form.monthlyCost}
                  />
                </label>
                <label className={fieldLabelClasses}>
                  Vertragsende
                  <input
                    className={fieldControlClasses}
                    onChange={(event) =>
                      setForm((currentForm) => ({
                        ...currentForm,
                        contractEnd: event.target.value,
                      }))
                    }
                    type="date"
                    value={form.contractEnd}
                  />
                </label>
                <label className={fieldLabelClasses}>
                  Kündigungsfrist
                  <input
                    className={fieldControlClasses}
                    min="0"
                    onChange={(event) =>
                      setForm((currentForm) => ({
                        ...currentForm,
                        cancellationDeadlineDays: event.target.value,
                      }))
                    }
                    placeholder="30"
                    type="number"
                    value={form.cancellationDeadlineDays}
                  />
                </label>
              </div>
              <button
                className="mt-5 w-full rounded-lg bg-graphite px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                type="submit"
              >
                Vertrag hinzufügen
              </button>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}

interface SummaryCardProps {
  label: string;
  value: string;
}

function SummaryCard({ label, value }: SummaryCardProps) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-normal text-graphite">
        {value}
      </p>
    </article>
  );
}
