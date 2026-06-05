"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  FileSearch,
  FileText,
  FolderOpen,
  SearchCheck,
  Upload,
  type LucideIcon,
} from "lucide-react";
import type { ContractRecord, DocumentAnalysis, Reminder } from "@lifepilot/shared";

import {
  readStoredDocumentAnalyses,
} from "../../src/services/documents";
import { listContractRecords, listMissingFacts } from "../../src/services/knowledge";
import { readStoredReminders } from "../../src/services/reminders";
import {
  LifePilotShell,
  PageHeader,
  SummaryCard,
  type Accent,
} from "./dashboard-ui";
import { DocumentIntelligenceSummary } from "./document-intelligence-summary";

const localDevMessage =
  "Lokaler Dev-Modus: Dokumentanalyse, Vertragsdaten und Erinnerungen werden aktuell im Browser gespeichert.";

const quickActions: Array<{
  description: string;
  href?: string;
  icon: LucideIcon;
  label: string;
  status?: string;
}> = [
  {
    description: "PDF, TXT oder Bild als neues Dokument erfassen.",
    href: "/documents",
    icon: Upload,
    label: "Dokument hochladen",
  },
  {
    description: "Foto/OCR ist vorbereitet und kommt als nächster Schritt.",
    href: "/documents",
    icon: Camera,
    label: "Brief fotografieren",
    status: "OCR kommt",
  },
  {
    description: "Erkannte Datumsangaben prüfen und bestätigen.",
    href: "/documents",
    icon: SearchCheck,
    label: "Frist prüfen",
  },
  {
    description: "Vertrag erfassen und Kündigung vorbereiten.",
    href: "/contracts",
    icon: CreditCard,
    label: "Vertrag anlegen",
  },
  {
    description: "Bestätigte Fristen und Aufgaben ansehen.",
    href: "/reminders",
    icon: Bell,
    label: "Erinnerungen anzeigen",
  },
];

const lifePilotLoop = [
  {
    label: "Dokument kommt rein",
    text: "Du lädst einen Brief, Vertrag oder eine Rechnung hoch.",
  },
  {
    label: "LifePilot liest es",
    text: "TXT wird lokal gelesen. PDF und Foto/OCR sind vorbereitet.",
  },
  {
    label: "Wichtiges wird erkannt",
    text: "LifePilot findet mögliche Fristen und relevante Datumsstellen.",
  },
  {
    label: "Du bestätigst",
    text: "Nichts wird blind übernommen. Du entscheidest, was wichtig ist.",
  },
  {
    label: "LifePilot erinnert",
    text: "Bestätigte Fristen erscheinen im Dashboard und bei Erinnerungen.",
  },
];

export function DashboardClient() {
  const [analyses, setAnalyses] = useState<DocumentAnalysis[]>([]);
  const [contracts, setContracts] = useState<ContractRecord[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);

  useEffect(() => {
    setAnalyses(readStoredDocumentAnalyses());
    setContracts(listContractRecords());
    setReminders(readStoredReminders());
  }, []);

  const openReminders = useMemo(
    () => reminders.filter((reminder) => !reminder.completed),
    [reminders],
  );

  const documentsForReview = useMemo(
    () =>
      analyses.filter(
        (analysis) =>
          analysis.status === "failed" ||
          analysis.status === "unsupported" ||
          analysis.detectedDeadlines.length > 0,
      ),
    [analyses],
  );
  const missingFacts = useMemo(() => listMissingFacts(), []);
  const cancellationSoonContracts = useMemo(
    () =>
      contracts.filter(
        (contract) =>
          contract.lifecycleStatus === "cancellable-now" ||
          contract.lifecycleStatus === "cancellation-window-upcoming",
      ),
    [contracts],
  );

  const summaryCards = [
    {
      accent: "orange",
      icon: AlertTriangle,
      label: "Nächste Fristen",
      meta:
        openReminders.length > 0
          ? "Bestätigte Erinnerungen"
          : "Noch nichts bestätigt",
      value: String(openReminders.length),
      visual: "bell",
    },
    {
      accent: "green",
      icon: CheckCircle2,
      label: "Verträge",
      meta: "Unter Beobachtung",
      value: String(contracts.length),
      visual: "chart",
    },
    {
      accent: "blue",
      icon: FileText,
      label: "Fehlende Angaben",
      meta: "Nur Pflichtfelder",
      value: String(missingFacts.length),
      visual: "document",
    },
    {
      accent: "purple",
      icon: FileSearch,
      label: "Kündigung bald",
      meta: "Fenster/Entwurf",
      value: String(cancellationSoonContracts.length),
      visual: "sparkles",
    },
  ] satisfies Array<{
    accent: Accent;
    icon: LucideIcon;
    label: string;
    meta: string;
    value: string;
    visual: "bell" | "chart" | "document" | "sparkles";
  }>;

  return (
    <LifePilotShell activeItem="Dashboard">
      <PageHeader
        eyebrow="Command Center"
        subtitle="Dein Überblick über Dokumente, Fristen, Verträge und nächste Schritte."
        title="LifePilot Command Center"
      />

      <section className="mt-6 rounded-[20px] border border-[#FDECCB] bg-[#FFF7EA] p-5">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[#D98806]">
            <AlertTriangle className="size-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-[15px] font-bold text-[#101828]">
              {localDevMessage}
            </p>
            <p className="mt-1 text-[13px] font-semibold leading-6 text-[#667085]">
              Das ist bewusst ehrlich: produktive Speicherung,
              geräteübergreifende Synchronisierung und sichere Reminder im
              Backend brauchen noch AWS Deployment.
            </p>
          </div>
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

      <section className="mt-7 rounded-[22px] border border-[#ECEFEB] bg-white p-5 shadow-card sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-normal text-[#101828]">
              Schnellaktionen
            </h2>
            <p className="mt-1 text-[13px] font-semibold leading-6 text-[#667085]">
              Starte dort, wo normale Verwaltung meistens beginnt: mit einem
              Dokument, einer Frist oder einem Vertrag.
            </p>
          </div>
          <span className="inline-flex w-fit items-center rounded-full bg-[#EAF7F0] px-3 py-1 text-[12px] font-bold text-[#2FA779]">
            Kein AI-Provider aktiv
          </span>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {quickActions.map((action) => (
            <QuickActionCard key={action.label} {...action} />
          ))}
        </div>
      </section>

      <DocumentIntelligenceSummary />

      <section className="mt-7 grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <CommandPanel
          icon={ClipboardCheck}
          title="Dokumente zur Prüfung"
          tone="orange"
        >
          {documentsForReview.length > 0 ? (
            documentsForReview.slice(0, 4).map((analysis) => (
              <StatusRow
                key={analysis.documentId}
                meta={formatAnalysisMeta(analysis)}
                title={analysis.documentName ?? "Unbenanntes Dokument"}
              />
            ))
          ) : (
            <EmptyState text="Noch kein Dokument braucht deine Prüfung." />
          )}
        </CommandPanel>

        <CommandPanel
          icon={CreditCard}
          title="Verträge und Kündigungen"
          tone="green"
        >
          {contracts.length > 0 ? (
            contracts.slice(0, 4).map((contract) => (
              <StatusRow
                key={contract.id}
                meta={formatContractMeta(contract)}
                title={contract.provider ?? contract.name}
              />
            ))
          ) : (
            <EmptyState text="Noch kein Vertrag gespeichert. Prüfe ein Dokument und speichere es als Vertrag." />
          )}
          <Link
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-[#2FA779] px-4 py-3 text-[13px] font-bold text-white transition hover:bg-[#258866]"
            href="/contracts"
          >
            Verträge öffnen
          </Link>
        </CommandPanel>
      </section>

      <section className="mt-7 grid gap-5 xl:grid-cols-2">
        <CommandPanel
          icon={AlertTriangle}
          title="Fehlende Angaben"
          tone="orange"
        >
          {missingFacts.length > 0 ? (
            missingFacts.slice(0, 4).map(({ contract, missingFact }) => (
              <StatusRow
                key={`${contract.id}-${missingFact.key}`}
                meta={missingFact.reason}
                title={`${contract.provider ?? contract.name}: ${missingFact.label}`}
              />
            ))
          ) : (
            <EmptyState text="Keine kritischen Pflichtangaben offen." />
          )}
        </CommandPanel>

        <CommandPanel icon={FileSearch} title="Agent-Vorschläge" tone="green">
          {buildAgentSuggestions(contracts).length > 0 ? (
            buildAgentSuggestions(contracts).map((suggestion) => (
              <StatusRow
                key={suggestion}
                meta="Nur Vorschlag. LifePilot führt nichts automatisch aus."
                title={suggestion}
              />
            ))
          ) : (
            <EmptyState text="Sobald Verträge gespeichert sind, schlägt LifePilot nächste Schritte vor." />
          )}
        </CommandPanel>
      </section>

      <section className="mt-7 rounded-[22px] border border-life-border bg-white p-5 shadow-card sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-[#EAF7F0] text-[#2FA779]">
            <FolderOpen className="size-6" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-normal text-[#101828]">
              So arbeitet LifePilot
            </h2>
            <p className="mt-1 text-[13px] font-semibold leading-6 text-[#667085]">
              Der Ablauf ist bewusst geführt, damit Nutzer nichts Technisches
              verstehen müssen.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-5">
          {lifePilotLoop.map((step, index) => (
            <article
              className="rounded-[18px] border border-[#ECEFEB] bg-[#FCFBFA] p-4"
              key={step.label}
            >
              <div className="flex size-9 items-center justify-center rounded-full bg-white text-[13px] font-bold text-[#2FA779] shadow-button">
                {index + 1}
              </div>
              <h3 className="mt-4 text-[15px] font-bold text-[#101828]">
                {step.label}
              </h3>
              <p className="mt-2 text-[13px] font-semibold leading-6 text-[#667085]">
                {step.text}
              </p>
            </article>
          ))}
        </div>
      </section>
    </LifePilotShell>
  );
}

function QuickActionCard({
  description,
  href,
  icon: Icon,
  label,
  status,
}: {
  description: string;
  href?: string;
  icon: LucideIcon;
  label: string;
  status?: string;
}) {
  const content = (
    <article className="h-full rounded-[18px] border border-[#ECEFEB] bg-[#FCFBFA] p-4 transition hover:border-[#D5EBDD] hover:bg-white">
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-white text-[#2FA779]">
          <Icon className="size-5" aria-hidden="true" />
        </div>
        {status ? (
          <span className="rounded-full bg-[#FFF7EA] px-2.5 py-1 text-[11px] font-bold text-[#D98806]">
            {status}
          </span>
        ) : null}
      </div>
      <h3 className="mt-4 text-[15px] font-bold text-[#101828]">{label}</h3>
      <p className="mt-2 text-[12px] font-semibold leading-5 text-[#667085]">
        {description}
      </p>
    </article>
  );

  return href ? (
    <Link className="block" href={href}>
      {content}
    </Link>
  ) : (
    <button className="text-left" type="button">
      {content}
    </button>
  );
}

function CommandPanel({
  children,
  icon: Icon,
  title,
  tone,
}: {
  children: React.ReactNode;
  icon: LucideIcon;
  title: string;
  tone: "green" | "orange";
}) {
  const toneClass =
    tone === "green"
      ? "bg-[#EAF7F0] text-[#2FA779]"
      : "bg-[#FFF7EA] text-[#D98806]";

  return (
    <section className="rounded-[22px] border border-[#ECEFEB] bg-white p-5 shadow-card sm:p-6">
      <div className="flex items-center gap-3">
        <div className={`flex size-12 items-center justify-center rounded-2xl ${toneClass}`}>
          <Icon className="size-6" aria-hidden="true" />
        </div>
        <h2 className="text-xl font-bold tracking-normal text-[#101828]">
          {title}
        </h2>
      </div>
      <div className="mt-5 divide-y divide-[#F0F2EF]">{children}</div>
    </section>
  );
}

function StatusRow({ meta, title }: { meta: string; title: string }) {
  return (
    <div className="py-4 first:pt-1 last:pb-1">
      <p className="text-[15px] font-bold text-[#101828]">{title}</p>
      <p className="mt-1 text-[13px] font-semibold leading-6 text-[#667085]">
        {meta}
      </p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="py-4 first:pt-1 last:pb-1">
      <p className="rounded-[18px] border border-[#ECEFEB] bg-[#FCFBFA] p-5 text-[13px] font-semibold leading-6 text-[#667085]">
        {text}
      </p>
    </div>
  );
}

function formatContractMeta(contract: ContractRecord): string {
  if (contract.missingFacts.length > 0) {
    return `${contract.missingFacts.length} Pflichtangabe(n) fehlen.`;
  }

  if (contract.brain.nextImportantDate) {
    return `Nächste wichtige Frist: ${new Date(
      contract.brain.nextImportantDate,
    ).toLocaleDateString("de-DE")}.`;
  }

  return "Vertrag vollständig erfasst, aber ohne nächste Frist.";
}

function buildAgentSuggestions(contracts: ContractRecord[]): string[] {
  return contracts
    .flatMap((contract) => {
      if (contract.missingFacts.length > 0) {
        return `${contract.provider ?? contract.name}: ${contract.missingFacts[0].label} fehlt - bitte ergänzen.`;
      }

      if (contract.brain.recommendedAction === "cancellation-draft-ready") {
        return `${contract.provider ?? contract.name}: Kündigung vorbereiten, sobald du die Angaben geprüft hast.`;
      }

      if (contract.category === "insurance" && contract.dates.cancellationDate) {
        return `${contract.provider ?? contract.name}: Kündigungsfrist erkannt, bitte prüfen.`;
      }

      if (contract.category === "authority" && contract.dates.dueDate) {
        return `${contract.provider ?? contract.name}: Frist erkannt, Antwort vorbereiten.`;
      }

      return [];
    })
    .slice(0, 4);
}

function formatAnalysisMeta(analysis: DocumentAnalysis): string {
  if (analysis.detectedDeadlines.length > 0) {
    return `${analysis.detectedDeadlines.length} mögliche Frist(en) erkannt. Bitte prüfen und bestätigen.`;
  }

  if (analysis.status === "unsupported") {
    return analysis.errorMessage ?? "Dieser Dateityp braucht noch Ausbau.";
  }

  if (analysis.status === "failed") {
    return "Analyse konnte nicht abgeschlossen werden.";
  }

  return "Keine offene Prüfung.";
}
