import type { Contract, ContractCategory, RiskLevel } from "@lifepilot/shared";

const categoryLabels: Record<ContractCategory, string> = {
  internet: "Internet",
  fitness: "Fitness",
  energy: "Energie",
  mobile: "Mobilfunk",
  insurance: "Versicherung",
  subscription: "Abo",
  other: "Sonstiges",
};

const riskLabels: Record<RiskLevel, string> = {
  low: "Niedrig",
  medium: "Mittel",
  high: "Hoch",
};

const riskClasses: Record<RiskLevel, string> = {
  low: "border-emerald-200 bg-emerald-50 text-emerald-800",
  medium: "border-amber-200 bg-amber-50 text-amber-800",
  high: "border-rose-200 bg-rose-50 text-rose-800",
};

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat("de-DE", {
    currency: "EUR",
    style: "currency",
  }).format(value);

export interface ContractCardProps {
  contract: Contract;
}

export function ContractCard({ contract }: ContractCardProps) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {categoryLabels[contract.category]}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-graphite">
            {contract.provider}
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {contract.status}
          </p>
        </div>
        <span
          className={`inline-flex w-fit rounded-full border px-3 py-1 text-sm font-semibold ${riskClasses[contract.riskLevel]}`}
        >
          Risiko: {riskLabels[contract.riskLevel]}
        </span>
      </div>

      <dl className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-slate-50 p-3">
          <dt className="text-xs font-semibold uppercase text-slate-500">
            Monatlich
          </dt>
          <dd className="mt-1 text-lg font-semibold text-graphite">
            {formatCurrency(contract.monthlyCost)}
          </dd>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <dt className="text-xs font-semibold uppercase text-slate-500">
            Kündigungsfrist
          </dt>
          <dd className="mt-1 text-lg font-semibold text-graphite">
            {contract.cancellationDeadlineDays} Tage
          </dd>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <dt className="text-xs font-semibold uppercase text-slate-500">
            Sparpotenzial
          </dt>
          <dd className="mt-1 text-lg font-semibold text-graphite">
            {formatCurrency(contract.annualSavingsPotential)} / Jahr
          </dd>
        </div>
      </dl>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-graphite transition hover:border-slate-500"
          type="button"
        >
          Details ansehen
        </button>
        <button
          className="rounded-lg bg-graphite px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          type="button"
        >
          Kündigung vorbereiten
        </button>
      </div>
    </article>
  );
}

