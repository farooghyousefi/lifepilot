"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
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
import type {
  ContractRecord,
  DocumentAnalysis,
  ReminderRecord,
} from "@lifepilot/shared";

import { readStoredDocumentAnalyses } from "../../src/services/documents";
import {
  listPersistedContracts,
  listPersistedReminders,
} from "../../src/services/memory";
import {
  LifePilotShell,
  PageHeader,
  SummaryCard,
  type Accent,
} from "./dashboard-ui";
import { DocumentIntelligenceSummary } from "./document-intelligence-summary";

const quickActions: Array<{
  description: string;
  href?: string;
  icon: LucideIcon;
  label: string;
  status?: string;
}> = [
  {
    description: "Datei hochladen und LifePilot den Rest vorbereiten lassen.",
    href: "/documents",
    icon: Upload,
    label: "Dokument hochladen",
  },
  {
    description: "Dokumente ansehen, bei denen etwas geprüft werden sollte.",
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
    label: "LifePilot bereitet vor",
    text: "TXT wird lokal gelesen. PDF und Foto-/Scan-Erkennung sind vorbereitet.",
  },
  {
    label: "Wichtiges erscheint",
    text: "Mögliche Fristen und Angaben werden ruhig zur Prüfung angezeigt.",
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
  const [reminders, setReminders] = useState<ReminderRecord[]>([]);
  const [persistenceMessage, setPersistenceMessage] = useState(
    "Backend-Speicherung vorbereitet, aber noch nicht deployed.",
  );

  useEffect(() => {
    setAnalyses(asArray(readStoredDocumentAnalyses()));

    async function loadMemory() {
      const [contractResult, reminderResult] = await Promise.all([
        listPersistedContracts(),
        listPersistedReminders(),
      ]);

      setContracts(asArray(contractResult.data));
      setReminders(asArray(reminderResult.data));
      setPersistenceMessage(
        contractResult.status === "backend-saved" ||
          reminderResult.status === "backend-saved"
          ? "Backend-Speicherung aktiv."
          : contractResult.message,
      );
    }

    void loadMemory();
  }, []);

  const safeAnalyses = useMemo(() => asArray(analyses), [analyses]);
  const safeContracts = useMemo(() => asArray(contracts), [contracts]);
  const safeReminders = useMemo(() => asArray(reminders), [reminders]);

  const openReminders = useMemo(
    () => safeReminders.filter((reminder) => reminder.status !== "done"),
    [safeReminders],
  );
  const overdueReminders = useMemo(
    () =>
      openReminders.filter(
        (reminder) => startOfDay(new Date(reminder.dueDate)) < startOfDay(new Date()),
      ),
    [openReminders],
  );

  const documentsForReview = useMemo(
    () =>
      safeAnalyses.filter(
        (analysis) =>
          analysis.status === "failed" ||
          analysis.status === "unsupported" ||
          asArray(analysis.detectedDeadlines).length > 0 ||
          asArray(analysis.detectedActions).length > 0,
      ),
    [safeAnalyses],
  );
  const missingFacts = useMemo(
    () =>
      safeContracts.flatMap((contract) =>
        asArray(contract.missingFacts).map((missingFact) => ({
          contract,
          missingFact,
        })),
      ),
    [safeContracts],
  );
  const cancellationSoonContracts = useMemo(
    () =>
      safeContracts.filter(
        (contract) =>
          contract.lifecycleStatus === "cancellable-now" ||
          contract.lifecycleStatus === "cancellation-window-upcoming",
      ),
    [safeContracts],
  );
  const agentSuggestions = useMemo(
    () => buildAgentSuggestions(safeContracts),
    [safeContracts],
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
      value: String(safeContracts.length),
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
        eyebrow="Dashboard"
        subtitle="Dokumente hochladen und LifePilot den Rest vorbereiten lassen."
        title="Dein Überblick"
      />

      <section className="mt-6 rounded-[20px] border border-[#FDECCB] bg-[#FFF7EA] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[#D98806]">
            <AlertTriangle className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="break-words text-[15px] font-bold text-[#101828]">
              {persistenceMessage}
            </p>
            <p className="mt-1 break-words text-[13px] font-semibold leading-6 text-[#667085]">
              Deine lokale Ansicht bleibt nutzbar. Für produktive Speicherung
              und geräteübergreifende Nutzung braucht LifePilot später das Backend.
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

      <section className="mt-7 rounded-[22px] border border-[#ECEFEB] bg-white p-4 shadow-card sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="break-words text-xl font-bold tracking-normal text-[#101828]">
              Nächste empfohlene Schritte
            </h2>
            <p className="mt-1 break-words text-[13px] font-semibold leading-6 text-[#667085]">
              Starte mit einem Dokument. LifePilot bereitet Name, Prüfung und
              mögliche nächste Schritte vor.
            </p>
          </div>
          <span className="inline-flex w-fit max-w-full items-center rounded-full bg-[#EAF7F0] px-3 py-1 text-[12px] font-bold text-[#2FA779]">
            Einfacher Upload aktiv
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {quickActions.map((action) => (
            <QuickActionCard key={action.label} {...action} />
          ))}
        </div>
      </section>

      <DocumentIntelligenceSummary />

      {safeContracts.length === 0 && safeReminders.length === 0 ? (
        <section className="mt-7 rounded-[22px] border border-[#ECEFEB] bg-white p-4 shadow-card sm:p-6">
          <p className="break-words text-[16px] font-bold text-[#101828]">
            Noch keine gespeicherten Verträge oder Erinnerungen. Lade ein
            Dokument hoch oder erstelle eine Erinnerung manuell.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Link
              className="inline-flex w-full justify-center rounded-xl bg-[#2FA779] px-4 py-3 text-[13px] font-bold text-white sm:w-auto"
              href="/documents"
            >
              Dokument hochladen
            </Link>
            <Link
              className="inline-flex w-full justify-center rounded-xl border border-[#ECEFEB] bg-white px-4 py-3 text-[13px] font-bold text-[#344054] sm:w-auto"
              href="/reminders"
            >
              Erinnerung erstellen
            </Link>
          </div>
        </section>
      ) : null}

      <section className="mt-7 grid gap-5 xl:grid-cols-2">
        <CommandPanel
          icon={Bell}
          title="Nächste Fristen & Erinnerungen"
          tone="orange"
        >
          {openReminders.length > 0 ? (
            openReminders.slice(0, 3).map((reminder) => (
              <StatusRow
                key={reminder.id}
                meta={formatReminderMeta(reminder)}
                title={reminder.title}
              />
            ))
          ) : (
            <EmptyState text="Noch keine offenen Erinnerungen." />
          )}
          <Link
            className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-[#2FA779] px-4 py-3 text-[13px] font-bold text-white transition hover:bg-[#258866] sm:w-auto"
            href="/reminders"
          >
            Erinnerungen öffnen
          </Link>
        </CommandPanel>

        <CommandPanel icon={AlertTriangle} title="Überfällig" tone="orange">
          {overdueReminders.length > 0 ? (
            overdueReminders.slice(0, 3).map((reminder) => (
              <StatusRow
                key={reminder.id}
                meta={formatReminderMeta(reminder)}
                title={reminder.title}
              />
            ))
          ) : (
            <EmptyState text="Keine überfälligen Erinnerungen." />
          )}
        </CommandPanel>
      </section>

      <section className="mt-7 grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <CommandPanel
          icon={ClipboardCheck}
          title="Wartet auf Prüfung"
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

        <CommandPanel icon={CreditCard} title="Zuletzt hochgeladen" tone="green">
          {safeAnalyses.length > 0 ? (
            safeAnalyses.slice(0, 4).map((analysis) => (
              <StatusRow
                key={analysis.documentId}
                meta={formatAnalysisMeta(analysis)}
                title={analysis.documentName ?? "Unbenanntes Dokument"}
              />
            ))
          ) : (
            <EmptyState text="Noch kein Dokument hochgeladen." />
          )}
          <Link
            className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-[#2FA779] px-4 py-3 text-[13px] font-bold text-white transition hover:bg-[#258866] sm:w-auto"
            href="/documents"
          >
            Dokumente öffnen
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

        <CommandPanel
          icon={FileSearch}
          title="Nächste empfohlene Schritte"
          tone="green"
        >
          {agentSuggestions.length > 0 ? (
            agentSuggestions.map((suggestion) => (
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

      <section className="mt-7 rounded-[22px] border border-life-border bg-white p-4 shadow-card sm:p-6">
        <div className="flex min-w-0 items-start gap-3 sm:items-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-[#EAF7F0] text-[#2FA779]">
            <FolderOpen className="size-6" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="break-words text-xl font-bold tracking-normal text-[#101828]">
              So arbeitet LifePilot
            </h2>
            <p className="mt-1 break-words text-[13px] font-semibold leading-6 text-[#667085]">
              Der Ablauf ist bewusst geführt, damit Nutzer nichts Technisches
              verstehen müssen.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-5">
          {lifePilotLoop.map((step, index) => (
            <article
              className="min-w-0 rounded-[18px] border border-[#ECEFEB] bg-[#FCFBFA] p-4"
              key={step.label}
            >
              <div className="flex size-9 items-center justify-center rounded-full bg-white text-[13px] font-bold text-[#2FA779] shadow-button">
                {index + 1}
              </div>
              <h3 className="mt-4 break-words text-[15px] font-bold text-[#101828]">
                {step.label}
              </h3>
              <p className="mt-2 break-words text-[13px] font-semibold leading-6 text-[#667085]">
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
    <article className="h-full min-w-0 rounded-[18px] border border-[#ECEFEB] bg-[#FCFBFA] p-4 transition hover:border-[#D5EBDD] hover:bg-white">
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-white text-[#2FA779]">
          <Icon className="size-5" aria-hidden="true" />
        </div>
        {status ? (
          <span className="min-w-0 rounded-full bg-[#FFF7EA] px-2.5 py-1 text-[11px] font-bold text-[#D98806]">
            {status}
          </span>
        ) : null}
      </div>
      <h3 className="mt-4 break-words text-[15px] font-bold text-[#101828]">{label}</h3>
      <p className="mt-2 break-words text-[12px] font-semibold leading-5 text-[#667085]">
        {description}
      </p>
    </article>
  );

  return href ? (
    <Link className="block min-w-0" href={href}>
      {content}
    </Link>
  ) : (
    <button className="w-full min-w-0 text-left" type="button">
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
    <section className="min-w-0 rounded-[22px] border border-[#ECEFEB] bg-white p-4 shadow-card sm:p-6">
      <div className="flex min-w-0 items-start gap-3 sm:items-center">
        <div className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${toneClass}`}>
          <Icon className="size-6" aria-hidden="true" />
        </div>
        <h2 className="min-w-0 break-words text-xl font-bold tracking-normal text-[#101828]">
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
      <p className="break-words text-[15px] font-bold text-[#101828]">{title}</p>
      <p className="mt-1 break-words text-[13px] font-semibold leading-6 text-[#667085]">
        {meta}
      </p>
    </div>
  );
}

function formatReminderMeta(reminder: ReminderRecord): string {
  const dueDate = new Date(reminder.dueDate).toLocaleDateString("de-DE");

  return reminder.reminderDate
    ? `Fällig am ${dueDate}. Erinnerung am ${new Date(
        reminder.reminderDate,
      ).toLocaleDateString("de-DE")}.`
    : `Fällig am ${dueDate}.`;
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

function buildAgentSuggestions(contracts: ContractRecord[]): string[] {
  return asArray(contracts)
    .flatMap((contract) => {
      const missingFacts = asArray(contract.missingFacts);

      if (missingFacts.length > 0) {
        return `${contract.provider ?? contract.name}: ${missingFacts[0].label} fehlt - bitte ergänzen.`;
      }

      if (contract.brain?.recommendedAction === "cancellation-draft-ready") {
        return `${contract.provider ?? contract.name}: Kündigung vorbereiten, sobald du die Angaben geprüft hast.`;
      }

      if (contract.category === "insurance" && contract.dates?.cancellationDate) {
        return `${contract.provider ?? contract.name}: Kündigungsfrist erkannt, bitte prüfen.`;
      }

      if (contract.category === "authority" && contract.dates?.dueDate) {
        return `${contract.provider ?? contract.name}: Frist erkannt, Antwort vorbereiten.`;
      }

      return [];
    })
    .slice(0, 4);
}

function formatAnalysisMeta(analysis: DocumentAnalysis): string {
  const detectedDeadlines = asArray(analysis.detectedDeadlines);
  const detectedActions = asArray(analysis.detectedActions);

  if (detectedActions.length > 0) {
    return `${detectedActions.length} mögliche Aktion(en) erkannt. Bitte prüfen und bestätigen.`;
  }

  if (detectedDeadlines.length > 0) {
    return `${detectedDeadlines.length} mögliche Frist(en) erkannt. Bitte prüfen und bestätigen.`;
  }

  if (analysis.status === "unsupported") {
    return analysis.errorMessage ?? "Dieser Dateityp braucht noch Ausbau.";
  }

  if (analysis.status === "failed") {
    return "Analyse konnte nicht abgeschlossen werden.";
  }

  return "Keine offene Prüfung.";
}

function startOfDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function asArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}
