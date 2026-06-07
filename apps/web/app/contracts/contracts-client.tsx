"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clipboard,
  CreditCard,
  FileText,
  PenLine,
  Printer,
  Scissors,
  Search,
  Trash2,
} from "lucide-react";
import type {
  ContractCategory,
  ContractRecord,
} from "@lifepilot/shared";

import {
  correctFact,
  createCancellationDraft,
  createOfferComparisonIntent,
  markActionDraftPrepared,
  updateActionDraftBody,
} from "../../src/services/knowledge";
import {
  deletePersistedContract,
  listPersistedContracts,
  updatePersistedContract,
} from "../../src/services/memory";
import {
  LifePilotShell,
  PageHeader,
  SummaryCard,
} from "../dashboard/dashboard-ui";

type ContractFilter =
  | "all"
  | "missing"
  | "cancellation-soon"
  | "active"
  | "insurance"
  | "internet-mobile"
  | "electricity-gas"
  | "authority";

const categoryLabels: Record<ContractCategory, string> = {
  authority: "Behörde",
  banking: "Banking",
  electricity: "Strom",
  gas: "Gas",
  healthcare: "Gesundheit",
  insurance: "Versicherung",
  internet: "Internet",
  loan: "Kredit",
  mobile: "Mobilfunk",
  other: "Sonstiges",
  rent: "Miete",
  subscription: "Abo",
  tax: "Steuer",
};

const lifecycleLabels: Record<ContractRecord["lifecycleStatus"], string> = {
  active: "Aktiv",
  "cancellable-now": "Kündigung bald möglich",
  "cancellation-deadline-missed": "Frist vermutlich verpasst",
  "cancellation-window-upcoming": "Kündigungsfenster kommt",
  draft: "Entwurf",
  ended: "Beendet",
  "needs-review": "Prüfung nötig",
  unknown: "Unklar",
};

const actionLabels: Record<ContractRecord["brain"]["recommendedAction"], string> = {
  "cancellation-draft-ready": "Kündigungsentwurf möglich",
  "contract-review-needed": "Kündigungsfrist prüfen",
  "missing-info-needed": "Fehlende Angaben ergänzen",
  "offer-comparison-planned": "Angebotsvergleich vorbereitet",
  "reminder-needed": "Erinnerung nötig",
};

const filters: Array<{ label: string; value: ContractFilter }> = [
  { label: "Alle", value: "all" },
  { label: "Fehlende Angaben", value: "missing" },
  { label: "Kündigung bald", value: "cancellation-soon" },
  { label: "Aktiv", value: "active" },
  { label: "Versicherung", value: "insurance" },
  { label: "Internet/Mobilfunk", value: "internet-mobile" },
  { label: "Strom/Gas", value: "electricity-gas" },
  { label: "Behörden", value: "authority" },
];

const formatCurrency = (value?: number): string =>
  typeof value === "number"
    ? new Intl.NumberFormat("de-DE", {
        currency: "EUR",
        maximumFractionDigits: 2,
        style: "currency",
      }).format(value)
    : "Fehlt";

export function ContractsClient() {
  const [contracts, setContracts] = useState<ContractRecord[]>([]);
  const [activeFilter, setActiveFilter] = useState<ContractFilter>("all");
  const [message, setMessage] = useState<string | null>(null);
  const [persistenceMessage, setPersistenceMessage] = useState(
    "Backend-Speicherung vorbereitet, aber noch nicht deployed.",
  );

  useEffect(() => {
    void refreshContracts();
  }, []);

  const safeContracts = useMemo(() => asArray(contracts), [contracts]);
  const filteredContracts = useMemo(
    () =>
      safeContracts.filter((contract) =>
        matchesFilter(contract, activeFilter),
      ),
    [activeFilter, safeContracts],
  );
  const missingCount = safeContracts.filter(
    (contract) => asArray(contract.missingFacts).length > 0,
  ).length;
  const cancellationSoonCount = safeContracts.filter(
    (contract) =>
      contract.lifecycleStatus === "cancellable-now" ||
      contract.lifecycleStatus === "cancellation-window-upcoming",
  ).length;

  const summaryCards = [
    {
      accent: "blue",
      icon: CreditCard,
      label: "Unter Beobachtung",
      meta: "Aus geprüften Dokumenten",
      value: String(safeContracts.length),
      visual: "document",
    },
    {
      accent: "orange",
      icon: AlertTriangle,
      label: "Fehlende Angaben",
      meta: "Minimalfelder ergänzen",
      value: String(missingCount),
      visual: "bell",
    },
    {
      accent: "green",
      icon: Scissors,
      label: "Kündigung bald",
      meta: "Fenster oder Entwurf",
      value: String(cancellationSoonCount),
      visual: "chart",
    },
    {
      accent: "purple",
      icon: FileText,
      label: "Entwürfe",
      meta: "Nur lokal vorbereitet",
      value: String(safeContracts.filter((contract) => contract.actionDraft).length),
      visual: "sparkles",
    },
  ] as const;

  const refreshContracts = async () => {
    const result = await listPersistedContracts();

    setContracts(asArray(result.data));
    setPersistenceMessage(result.message);
  };

  const handleCreateDraft = (contract: ContractRecord) => {
    const draft = createCancellationDraft(contract.id);

    if (!draft) {
      setMessage(
        "Für diesen Kündigungsentwurf fehlen noch Pflichtangaben wie Anbieter und Kundennummer/Vertragsnummer.",
      );
      return;
    }

    setMessage("Kündigungsentwurf wurde lokal vorbereitet.");
    void refreshContracts();
  };

  const handleComparisonIntent = (contract: ContractRecord) => {
    const intent = createOfferComparisonIntent(contract.id);

    if (!intent) {
      return;
    }

    setMessage(
      intent.status === "planned"
        ? "Angebotsvergleich vorbereitet. Live-Vergleichsportale werden später integriert."
        : "Angebotsvergleich vorbereitet. Es fehlen noch Angaben für einen späteren Live-Vergleich.",
    );
    void refreshContracts();
  };

  const handleDeleteContract = async (contract: ContractRecord) => {
    const result = await deletePersistedContract(contract.id);

    setMessage(
      result.data
        ? `Vertrag wurde gelöscht. ${result.message}`
        : "Vertrag konnte nicht gelöscht werden.",
    );
    await refreshContracts();
  };

  return (
    <LifePilotShell activeItem="Contracts">
      <PageHeader
        eyebrow="Contract Brain"
        subtitle="Geprüfte Verträge, fehlende Angaben, Kündigungsfenster und nächste Aktionen."
        title="Verträge unter Beobachtung"
      />

      <section className="mt-6 rounded-[20px] border border-[#FDECCB] bg-[#FFF7EA] p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-[#D98806]" />
          <p className="text-[13px] font-semibold leading-6 text-[#667085]">
            {persistenceMessage} Es werden keine Kündigungen versendet und
            keine Vergleichsportale aufgerufen.
          </p>
        </div>
      </section>

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

      {message ? (
        <div className="mt-5 rounded-[18px] border border-[#DDEFE6] bg-[#F2FAF6] px-5 py-4 text-[14px] font-bold text-[#2FA779]">
          {message}
        </div>
      ) : null}

      <section className="mt-7 rounded-[22px] border border-[#ECEFEB] bg-white p-5 shadow-card sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-[-0.01em] text-[#101828]">
              Contract Brain
            </h2>
            <p className="mt-1 text-[13px] font-semibold text-[#667085]">
              Nutzt nur lokal gespeicherte, geprüfte ContractRecords aus der
              Knowledge Base.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-[#ECEFEB] bg-[#FCFBFA] px-4 py-2 text-[13px] font-bold text-[#667085]">
            <Search className="size-4" aria-hidden="true" />
            {filteredContracts.length} sichtbar
          </div>
        </div>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {filters.map((filter) => (
            <button
              className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-bold transition ${
                activeFilter === filter.value
                  ? "bg-[#EAF7F0] text-[#2FA779]"
                  : "bg-[#FCFBFA] text-[#667085] hover:text-[#101828]"
              }`}
              key={filter.value}
              onClick={() => setActiveFilter(filter.value)}
              type="button"
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-4">
          {filteredContracts.length > 0 ? (
            filteredContracts.map((contract) => (
              <ContractBrainCard
                contract={contract}
                key={contract.id}
                onComparisonIntent={() => handleComparisonIntent(contract)}
                onCreateDraft={() => handleCreateDraft(contract)}
                onDelete={() => void handleDeleteContract(contract)}
                onRefresh={() => void refreshContracts()}
              />
            ))
          ) : (
            <div className="rounded-[20px] border border-[#ECEFEB] bg-[#FCFBFA] p-6">
              <p className="text-[15px] font-bold text-[#101828]">
                Noch keine Verträge im Contract Brain.
              </p>
              <p className="mt-2 text-[13px] font-semibold leading-6 text-[#667085]">
                Gehe zu Dokumente, lade eine TXT-Datei hoch, prüfe die
                gefundenen Daten und speichere sie als Vertrag.
              </p>
              <Link
                className="mt-4 inline-flex rounded-xl bg-[#2FA779] px-4 py-3 text-[13px] font-bold text-white"
                href="/documents"
              >
                Dokument erfassen
              </Link>
            </div>
          )}
        </div>
      </section>
    </LifePilotShell>
  );
}

function ContractBrainCard({
  contract,
  onComparisonIntent,
  onCreateDraft,
  onDelete,
  onRefresh,
}: {
  contract: ContractRecord;
  onComparisonIntent: () => void;
  onCreateDraft: () => void;
  onDelete: () => void;
  onRefresh: () => void;
}) {
  const [missingValues, setMissingValues] = useState<Record<string, string>>({});
  const [draftBody, setDraftBody] = useState(contract.actionDraft?.body ?? "");
  const missingFacts = asArray(contract.missingFacts);

  useEffect(() => {
    setDraftBody(contract.actionDraft?.body ?? "");
  }, [contract.actionDraft?.body]);

  const saveMissingValues = async () => {
    let updatedContract: ContractRecord | null = contract;

    missingFacts.forEach((missingFact) => {
      const value = missingValues[missingFact.key]?.trim();

      if (value) {
        updatedContract = correctFact(contract.id, missingFact.key, value);
      }
    });

    if (updatedContract) {
      await updatePersistedContract(contract.id, updatedContract);
    }

    setMissingValues({});
    onRefresh();
  };

  const updateDraft = () => {
    updateActionDraftBody(contract.id, draftBody);
    onRefresh();
  };

  const markPrepared = () => {
    markActionDraftPrepared(contract.id);
    onRefresh();
  };

  const copyDraft = async () => {
    if (!draftBody) {
      return;
    }

    await navigator.clipboard.writeText(draftBody);
  };

  const printDraft = () => {
    window.print();
  };

  return (
    <article className="rounded-[20px] border border-[#ECEFEB] bg-[#FCFBFA] p-5 transition hover:border-[#D5EBDD] hover:bg-white">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[17px] font-bold tracking-[-0.01em] text-[#101828]">
              {contract.provider ?? contract.name}
            </h3>
          <span className="rounded-full bg-white px-3 py-1 text-[12px] font-bold text-[#667085]">
            {categoryLabels[contract.category] ?? categoryLabels.other}
          </span>
          <span className="rounded-full bg-white px-3 py-1 text-[12px] font-bold text-[#667085]">
            Datenquelle:{" "}
            {contract.source === "document-analysis"
              ? "Dokumentanalyse"
              : "Manuell"}
          </span>
        </div>
          <p className="mt-2 text-[14px] font-semibold text-[#667085]">
            {actionLabels[contract.brain?.recommendedAction ?? "contract-review-needed"]}
          </p>
        </div>

        <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[12px] font-bold text-[#2FA779]">
          <span className="size-2 rounded-full bg-[#2FA779]" />
          {lifecycleLabels[contract.lifecycleStatus] ?? lifecycleLabels.unknown}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricBlock label="Kosten" value={formatCurrency(contract.cost?.amount)} />
        <MetricBlock
          label="Start/Laufzeit"
          value={
            contract.dates?.startDate ??
            contract.facts?.minimumTerm?.value?.toString() ??
            "Fehlt"
          }
        />
        <MetricBlock
          label="Nächste Frist"
          value={formatDate(contract.brain?.nextImportantDate)}
        />
        <MetricBlock
          label="Fehlende Angaben"
          value={String(missingFacts.length)}
        />
      </div>

      {missingFacts.length > 0 ? (
        <div className="mt-5 rounded-[18px] border border-[#FDECCB] bg-[#FFF7EA] p-4">
          <p className="text-[14px] font-bold text-[#101828]">
            Fehlende Angaben ergänzen
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {missingFacts.map((missingFact) => (
              <label className="block" key={missingFact.key}>
                <span className="text-[12px] font-bold text-[#344054]">
                  {missingFact.label}
                </span>
                <input
                  className="mt-2 w-full rounded-xl border border-[#FDECCB] bg-white px-4 py-3 text-[13px] font-bold text-[#101828] outline-none"
                  onChange={(event) =>
                    setMissingValues((current) => ({
                      ...current,
                      [missingFact.key]: event.target.value,
                    }))
                  }
                  placeholder="Bitte ergänzen"
                  value={missingValues[missingFact.key] ?? ""}
                />
              </label>
            ))}
          </div>
          <button
            className="mt-4 rounded-xl bg-[#2FA779] px-4 py-3 text-[13px] font-bold text-white"
            onClick={saveMissingValues}
            type="button"
          >
            Angaben speichern
          </button>
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#ECEFEB] bg-white px-4 py-3 text-[13px] font-bold text-[#344054] shadow-button transition hover:border-[#D5EBDD] hover:text-[#2FA779]"
          onClick={onCreateDraft}
          type="button"
        >
          <Scissors className="size-4" aria-hidden="true" />
          Kündigung vorbereiten
        </button>
        <button
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#EAF7F0] px-4 py-3 text-[13px] font-bold text-[#2FA779] transition hover:bg-[#DDEFE6]"
          onClick={onComparisonIntent}
          type="button"
        >
          <Search className="size-4" aria-hidden="true" />
          Angebotsvergleich vorbereiten
        </button>
        <button
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#F3D9D4] bg-white px-4 py-3 text-[13px] font-bold text-[#E14C45] shadow-button transition hover:bg-[#FFF3F1]"
          onClick={onDelete}
          type="button"
        >
          <Trash2 className="size-4" aria-hidden="true" />
          Löschen
        </button>
      </div>

      {contract.offerComparisonIntent ? (
        <div className="mt-4 rounded-[16px] border border-[#EDE5FF] bg-[#F8F4FF] p-4 text-[13px] font-semibold leading-6 text-[#667085]">
          Angebotsvergleich vorbereitet. Live-Vergleichsportale werden später
          integriert.
        </div>
      ) : null}

      {contract.actionDraft ? (
        <div className="mt-5 rounded-[18px] border border-[#DDEFE6] bg-white p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[14px] font-bold text-[#101828]">
                Kündigungsentwurf
              </p>
              <p className="mt-1 text-[12px] font-semibold leading-5 text-[#667085]">
                LifePilot bereitet nur einen Entwurf vor. Bitte prüfe alle
                Angaben vor dem Absenden.
              </p>
            </div>
            <span className="rounded-full bg-[#F2FAF6] px-3 py-1 text-[11px] font-bold text-[#2FA779]">
              {contract.actionDraft.status === "prepared"
                ? "Vorbereitet"
                : "Entwurf"}
            </span>
          </div>
          <textarea
            className="mt-4 min-h-64 w-full rounded-xl border border-[#ECEFEB] bg-[#FCFBFA] px-4 py-3 text-[13px] font-semibold leading-6 text-[#101828] outline-none"
            onChange={(event) => setDraftBody(event.target.value)}
            value={draftBody}
          />
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <button
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#ECEFEB] bg-white px-4 py-3 text-[13px] font-bold text-[#344054]"
              onClick={updateDraft}
              type="button"
            >
              <PenLine className="size-4" aria-hidden="true" />
              Speichern
            </button>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#ECEFEB] bg-white px-4 py-3 text-[13px] font-bold text-[#344054]"
              onClick={copyDraft}
              type="button"
            >
              <Clipboard className="size-4" aria-hidden="true" />
              Kopieren
            </button>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#ECEFEB] bg-white px-4 py-3 text-[13px] font-bold text-[#344054]"
              onClick={printDraft}
              type="button"
            >
              <Printer className="size-4" aria-hidden="true" />
              Drucken
            </button>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2FA779] px-4 py-3 text-[13px] font-bold text-white"
              onClick={markPrepared}
              type="button"
            >
              <CheckCircle2 className="size-4" aria-hidden="true" />
              Als vorbereitet markieren
            </button>
          </div>
        </div>
      ) : null}
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

function matchesFilter(
  contract: ContractRecord,
  filter: ContractFilter,
): boolean {
  if (filter === "all") {
    return true;
  }

  if (filter === "missing") {
    return asArray(contract.missingFacts).length > 0;
  }

  if (filter === "cancellation-soon") {
    return (
      contract.lifecycleStatus === "cancellable-now" ||
      contract.lifecycleStatus === "cancellation-window-upcoming"
    );
  }

  if (filter === "active") {
    return contract.lifecycleStatus === "active";
  }

  if (filter === "internet-mobile") {
    return ["internet", "mobile"].includes(contract.category);
  }

  if (filter === "electricity-gas") {
    return ["electricity", "gas"].includes(contract.category);
  }

  return contract.category === filter;
}

function formatDate(value?: string): string {
  return value ? new Date(value).toLocaleDateString("de-DE") : "Fehlt";
}

function asArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}
