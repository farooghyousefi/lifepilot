"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  FileText,
  MessageSquareText,
  Send,
  Sparkles,
} from "lucide-react";
import type {
  LifeBrainAction,
  LifeBrainInputType,
  LifeBrainResult,
} from "../../src/services/brain";
import { downloadLifeBrainIcsFile } from "../../src/services/brain";
import {
  createReminder,
  readStoredReminders,
} from "../../src/services/reminders";

const examples: Array<{
  inputType: LifeBrainInputType;
  label: string;
  text: string;
}> = [
  {
    inputType: "document",
    label: "Rechnung",
    text: "Sehr geehrter Herr Yousefi, bitte zahlen Sie den offenen Betrag in Höhe von 129,04 EUR bis spätestens 21.04.2025.",
  },
  {
    inputType: "document",
    label: "Termin",
    text: "Bitte erscheinen Sie am 17.04.2025 um 10:30 Uhr in unserer Geschäftsstelle.",
  },
  {
    inputType: "document",
    label: "Vertrag",
    text: "Vertragsbeginn ist der 01.08.2024. Die Laufzeit beträgt 24 Monate. Die Kündigung muss bis spätestens 30.07.2026 eingehen.",
  },
  {
    inputType: "document",
    label: "Kontoauszug",
    text: "Kontostand am 01.01.2026. 02.01.2026 Überweisung. 03.01.2026 Lastschrift. 04.01.2026 Kartenzahlung.",
  },
  {
    inputType: "email",
    label: "E-Mail mit Frist",
    text: "Hallo Herr Yousefi, bitte senden Sie uns die fehlenden Unterlagen bis Freitag zu. Danach können wir Ihren Antrag weiter bearbeiten.",
  },
];

const inputTypeLabels: Record<LifeBrainInputType, string> = {
  conversation: "Gespräch",
  document: "Dokument",
  email: "E-Mail",
  manual_note: "Notiz",
  message: "Nachricht",
  uploaded_file: "Hochgeladene Datei",
};

const documentTypeLabels: Record<LifeBrainResult["documentType"], string> = {
  appointment_notice: "Termin",
  bank_statement: "Kontoauszug",
  contract: "Vertrag",
  conversation: "Gespräch",
  email_request: "E-Mail",
  email_thread: "E-Mail-Verlauf",
  insurance: "Versicherung",
  invoice: "Rechnung",
  jobcenter_or_employment_agency: "Jobcenter / Agentur",
  legal_notice: "Rechtlicher Hinweis",
  medical: "Gesundheit",
  official_letter: "Behördenschreiben",
  payment_reminder: "Zahlungserinnerung",
  rental: "Wohnen",
  tax: "Steuer",
  termination: "Kündigung",
  unknown: "Unklarer Inhalt",
};

const priorityLabels: Record<LifeBrainAction["priority"], string> = {
  critical: "Sehr wichtig",
  high: "Wichtig",
  low: "Niedrig",
  medium: "Normal",
};

const actionTypeLabels: Record<LifeBrainAction["type"], string> = {
  archive_only: "Ablegen",
  attend_appointment: "Termin",
  call_someone: "Anruf",
  cancel_contract: "Kündigung prüfen",
  create_reminder: "Erinnerung",
  create_task: "Aufgabe",
  no_action: "Keine Handlung",
  pay: "Zahlung",
  provide_missing_info: "Angaben ergänzen",
  reply: "Antwort",
  review_document: "Prüfen",
  send_document: "Unterlagen senden",
  wait: "Warten",
};

export function LifeBrainPanel() {
  const [inputType, setInputType] = useState<LifeBrainInputType>("document");
  const [rawText, setRawText] = useState("");
  const [result, setResult] = useState<LifeBrainResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [ctaMessage, setCtaMessage] = useState<string | null>(null);
  const [isReplyVisible, setIsReplyVisible] = useState(false);

  const realActions = useMemo(
    () =>
      asArray(result?.actions).filter(
        (action) =>
          action.type !== "archive_only" && action.type !== "no_action",
      ),
    [result],
  );

  const primaryAction = result ? getPrimaryAction(result) : null;

  const analyzeText = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setCtaMessage(null);
    setIsReplyVisible(false);

    if (!rawText.trim()) {
      setErrorMessage("Bitte füge zuerst einen Text ein.");
      return;
    }

    setIsAnalyzing(true);

    try {
      const brainTestCode =
        typeof window !== "undefined"
          ? window.localStorage.getItem("lifepilot:brain-test-code")
          : null;

      const response = await fetch("/api/ai/life-brain", {
        body: JSON.stringify({
          inputType,
          metadata: {
            userLocale: "de-DE",
            userTimezone: "Europe/Berlin",
          },
          rawText,
          source: "pasted_text",
        }),
        headers: {
          "Content-Type": "application/json",
          ...(brainTestCode
            ? { "x-lifepilot-brain-test-code": brainTestCode }
            : {}),
        },
        method: "POST",
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;

        throw new Error(
          errorPayload?.error ??
            "LifePilot Brain konnte den Text nicht prüfen.",
        );
      }

      setResult((await response.json()) as LifeBrainResult);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "LifePilot konnte den Inhalt gerade nicht vollständig prüfen. Bitte versuche es erneut.",
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePrimaryAction = () => {
    if (!result || !primaryAction) {
      return;
    }

    if (primaryAction === "download_ics") {
      const didDownload = downloadLifeBrainIcsFile(result);

      setCtaMessage(
        didDownload
          ? "Kalenderdatei wurde erstellt. Bitte prüfe sie beim Import."
          : "Kein eindeutiger Kalendereintrag vorhanden.",
      );
      return;
    }

    if (primaryAction === "create_reminder") {
      const reminder = result.reminders[0];
      const deadline = result.deadlines[0];
      const remindAt = reminder?.remindAt ?? deadline?.date;

      if (!remindAt) {
        setCtaMessage("Für eine Erinnerung fehlt noch ein klares Datum.");
        return;
      }

      const reminderTitle = getReminderTitle(result);
      const reminderDueAt = toReminderDateTime(remindAt);
      const reminderSourceText = rawText.slice(0, 500);

      const existingReminder = readStoredReminders().find((reminder) => {
        const sameSource = reminder.source === "document-deadline";
        const sameTitle = reminder.title === reminderTitle;
        const sameDueDate =
          reminder.dueAt?.slice(0, 10) === reminderDueAt.slice(0, 10);
        const sameOriginalText =
          normalizeReminderSourceText(reminder.sourceOriginalText ?? "") ===
          normalizeReminderSourceText(reminderSourceText);

        return sameSource && sameTitle && sameDueDate && sameOriginalText;
      });

      if (existingReminder) {
        setCtaMessage("Diese Erinnerung existiert bereits.");
        return;
      }

      const reminderPriority = getReminderPriority(result, rawText);

      createReminder({
        dueAt: reminderDueAt,
        notes: getReminderNotes(result, rawText),
        priority: reminderPriority,
        source: "document-deadline",
        sourceLabel: reminderTitle,
        sourceOriginalText: reminderSourceText,
        title: reminderTitle,
      });

      setCtaMessage("Erinnerung wurde lokal vorbereitet.");
      return;
    }

    if (primaryAction === "show_reply") {
      setIsReplyVisible(true);
      setCtaMessage(
        "Antwortentwurf ist sichtbar. Bitte vor dem Senden prüfen.",
      );
      return;
    }

    if (primaryAction === "create_task") {
      setCtaMessage(
        "Aufgabe ist vorbereitet. Bitte prüfe sie vor dem Speichern.",
      );
      return;
    }

    setCtaMessage("Keine direkte Handlung erkannt. Sinnvoll ablegen.");
  };

  return (
    <section className="mt-7 min-w-0 rounded-[22px] border border-[#DDEFE6] bg-white p-4 shadow-card sm:p-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="min-w-0">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#EAF7F0] text-[#2FA779]">
              <Sparkles className="size-6" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#2FA779]">
                LifePilot Brain
              </p>
              <h2 className="mt-2 break-words text-2xl font-bold tracking-normal text-[#101828]">
                Text, Dokument oder E-Mail analysieren
              </h2>
              <p className="mt-2 break-words text-[14px] font-semibold leading-6 text-[#667085]">
                Füge einen Brief, eine Rechnung, einen Vertrag, eine Kündigung,
                ein Behördenschreiben oder eine E-Mail ein. LifePilot erkennt,
                was wichtig ist.
              </p>
            </div>
          </div>

          <form className="mt-5 grid gap-4" onSubmit={analyzeText}>
            <label className="block">
              <span className="text-[12px] font-bold text-[#344054]">
                Art des Inhalts
              </span>
              <select
                className="mt-2 w-full rounded-xl border border-[#ECEFEB] bg-[#FCFBFA] px-4 py-3 text-[14px] font-bold text-[#101828] outline-none focus:border-[#B9DEC7]"
                onChange={(event) =>
                  setInputType(event.target.value as LifeBrainInputType)
                }
                value={inputType}
              >
                {Object.entries(inputTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-[12px] font-bold text-[#344054]">
                Inhalt
              </span>
              <textarea
                className="mt-2 min-h-56 w-full resize-y rounded-xl border border-[#ECEFEB] bg-[#FCFBFA] px-4 py-3 text-[14px] font-semibold leading-6 text-[#101828] outline-none focus:border-[#B9DEC7]"
                onChange={(event) => setRawText(event.target.value)}
                placeholder="Text hier einfügen ... zum Beispiel eine Rechnung, E-Mail, Kündigung, Terminbestätigung oder ein Schreiben vom Amt."
                value={rawText}
              />
            </label>

            <div className="flex flex-wrap gap-2">
              {examples.map((example) => (
                <button
                  className="rounded-full border border-[#DDEFE6] bg-[#F8FCFA] px-3 py-2 text-[12px] font-bold text-[#2FA779] transition hover:border-[#B9DEC7] hover:bg-[#EAF7F0]"
                  key={example.label}
                  onClick={() => {
                    setInputType(example.inputType);
                    setRawText(example.text);
                    setResult(null);
                    setCtaMessage(null);
                    setErrorMessage(null);
                  }}
                  type="button"
                >
                  {example.label}
                </button>
              ))}
            </div>

            <button
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2FA779] px-5 py-3 text-[14px] font-bold text-white shadow-button transition hover:bg-[#258866] disabled:cursor-not-allowed disabled:bg-[#98D7B9] sm:w-fit"
              disabled={isAnalyzing}
              type="submit"
            >
              <Sparkles className="size-4" aria-hidden="true" />
              {isAnalyzing
                ? "LifePilot Brain prüft den Inhalt..."
                : "Mit LifePilot Brain analysieren"}
            </button>
          </form>

          {errorMessage ? (
            <StatusMessage tone="warning" text={errorMessage} />
          ) : null}
          {ctaMessage ? (
            <StatusMessage tone="success" text={ctaMessage} />
          ) : null}
        </div>

        <div className="min-w-0">
          {result ? (
            <div className="grid gap-4">
              <ResultCard
                icon={FileText}
                label="Was ist das?"
                title={documentTypeLabels[result.documentType]}
              >
                <p>{result.shortSummary}</p>
                <p className="mt-2 text-[13px] text-[#667085]">
                  Kategorie: {result.category}
                </p>
              </ResultCard>

              <ResultCard
                icon={AlertTriangle}
                label="Was ist wichtig?"
                title={result.title}
              >
                {asArray(result.importantFacts).length > 0 ? (
                  <div className="grid gap-2">
                    {asArray(result.importantFacts).map((fact) => (
                      <div
                        className="rounded-xl bg-[#FCFBFA] px-3 py-2"
                        key={`${fact.label}-${fact.value}`}
                      >
                        <p className="text-[12px] font-bold text-[#667085]">
                          {fact.label}
                        </p>
                        <p className="break-words text-[14px] font-bold text-[#101828]">
                          {fact.value}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>Keine besonderen Fakten erkannt.</p>
                )}
              </ResultCard>

              <ResultCard
                icon={CheckCircle2}
                label="Was muss ich tun?"
                title={getHumanNextStep(result).title}
              >
                <p>{getHumanNextStep(result).description}</p>

                {primaryAction ? (
                  <button
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2FA779] px-4 py-3 text-[13px] font-bold text-white transition hover:bg-[#258866] sm:w-fit"
                    onClick={handlePrimaryAction}
                    type="button"
                  >
                    {getPrimaryActionIcon(primaryAction)}
                    {getPrimaryActionLabel(primaryAction)}
                  </button>
                ) : null}
              </ResultCard>

              <ResultCard
                icon={Sparkles}
                label="Erkannte Aktionen"
                title={
                  realActions.length > 0
                    ? `${realActions.length} Handlung erkannt`
                    : "Keine direkte Handlung erkannt"
                }
              >
                {realActions.length > 0 ? (
                  <div className="grid gap-2">
                    {realActions.map((action) => (
                      <ActionRow action={action} key={action.id} />
                    ))}
                  </div>
                ) : (
                  <p>Keine direkte Handlung erkannt. Sinnvoll ablegen.</p>
                )}
              </ResultCard>

              <ResultCard
                icon={CalendarClock}
                label="Fristen & Termine"
                title={createDateSummary(result)}
              >
                <DatesAndAppointments result={result} />
              </ResultCard>

              {result.clarificationQuestion ? (
                <ResultCard
                  icon={MessageSquareText}
                  label="Rückfrage"
                  title="Eine Angabe ist noch unklar"
                >
                  <p>{result.clarificationQuestion}</p>
                </ResultCard>
              ) : null}

              {result.suggestedReply && isReplyVisible ? (
                <ResultCard
                  icon={Send}
                  label="Antwortentwurf"
                  title={result.suggestedReply.subject ?? "Antwort vorbereiten"}
                >
                  <pre className="whitespace-pre-wrap break-words rounded-xl bg-[#FCFBFA] p-3 text-[13px] font-semibold leading-6 text-[#344054]">
                    {result.suggestedReply.body}
                  </pre>
                </ResultCard>
              ) : null}

              <details className="rounded-[18px] border border-[#ECEFEB] bg-[#FCFBFA] p-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[14px] font-bold text-[#101828]">
                  Details anzeigen
                  <ChevronDown className="size-4 shrink-0" aria-hidden="true" />
                </summary>
                <div className="mt-4 grid gap-3 text-[13px] font-semibold leading-6 text-[#667085]">
                  <p>
                    Brain-Modus:{" "}
                    {result.analysisMode === "openai"
                      ? "OpenAI"
                      : "Lokaler Fallback"}
                  </p>
                  {result.modelUsed ? <p>Modell: {result.modelUsed}</p> : null}
                  {result.fallbackReason ? (
                    <p>Fallback-Grund: {result.fallbackReason}</p>
                  ) : null}
                  <p>
                    Erkannte Organisationen:{" "}
                    {formatList(result.detectedOrganizations)}
                  </p>
                  <p>Erkannte Personen: {formatList(result.detectedPeople)}</p>
                  <p>Risiko: {result.riskLevel}</p>
                  <p>Dringlichkeit: {result.urgency}</p>
                  <p>Ausgangstext: {rawText}</p>
                </div>
              </details>
            </div>
          ) : (
            <div className="flex min-h-full min-w-0 items-center rounded-[20px] border border-[#ECEFEB] bg-[#FCFBFA] p-5 sm:p-6">
              <div>
                <p className="break-words text-[16px] font-bold text-[#101828]">
                  Bereit für echte Alltagstexte.
                </p>
                <p className="mt-2 break-words text-[13px] font-semibold leading-6 text-[#667085]">
                  Wähle ein Beispiel oder füge deinen eigenen Text ein.
                  LifePilot zeigt danach nur die wichtigsten Punkte und den
                  sinnvollsten nächsten Schritt.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ResultCard({
  children,
  icon: Icon,
  label,
  title,
}: {
  children: React.ReactNode;
  icon: typeof Sparkles;
  label: string;
  title: string;
}) {
  return (
    <article className="min-w-0 rounded-[18px] border border-[#ECEFEB] bg-white p-4">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#F2FAF6] text-[#2FA779]">
          <Icon className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#2FA779]">
            {label}
          </p>
          <h3 className="mt-1 break-words text-[16px] font-bold text-[#101828]">
            {title}
          </h3>
          <div className="mt-2 break-words text-[13px] font-semibold leading-6 text-[#667085]">
            {children}
          </div>
        </div>
      </div>
    </article>
  );
}

function ActionRow({ action }: { action: LifeBrainAction }) {
  return (
    <div className="rounded-xl border border-[#ECEFEB] bg-[#FCFBFA] p-3">
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="break-words text-[14px] font-bold text-[#101828]">
            {action.title}
          </p>
          <p className="mt-1 break-words text-[12px] font-bold text-[#2FA779]">
            {actionTypeLabels[action.type]}
          </p>
        </div>
        <span className="w-fit rounded-full bg-white px-3 py-1 text-[11px] font-bold text-[#667085]">
          {priorityLabels[action.priority]}
        </span>
      </div>
      <p className="mt-2 break-words text-[13px] font-semibold leading-6 text-[#667085]">
        {action.description}
      </p>
      {action.dueDate ? (
        <p className="mt-2 text-[12px] font-bold text-[#101828]">
          Bis {formatDate(action.dueDate)}
          {action.time ? `, ${action.time} Uhr` : ""}
        </p>
      ) : null}
    </div>
  );
}

function DatesAndAppointments({ result }: { result: LifeBrainResult }) {
  if (result.deadlines.length === 0 && result.appointments.length === 0) {
    return <p>Keine eindeutige Frist oder kein Termin erkannt.</p>;
  }

  return (
    <div className="grid gap-2">
      {result.appointments.map((appointment) => (
        <div
          className="rounded-xl bg-[#FCFBFA] px-3 py-2"
          key={`${appointment.title}-${appointment.date}-${appointment.time ?? ""}`}
        >
          <p className="text-[14px] font-bold text-[#101828]">
            {appointment.title}
          </p>
          <p>
            {formatDate(appointment.date)}
            {appointment.time ? `, ${appointment.time} Uhr` : ""}
          </p>
        </div>
      ))}
      {result.deadlines.map((deadline) => (
        <div
          className="rounded-xl bg-[#FCFBFA] px-3 py-2"
          key={`${deadline.title}-${deadline.date}-${deadline.time ?? ""}`}
        >
          <p className="text-[14px] font-bold text-[#101828]">
            {deadline.title}
          </p>
          <p>
            {formatDate(deadline.date)}
            {deadline.time ? `, ${deadline.time} Uhr` : ""}
          </p>
        </div>
      ))}
    </div>
  );
}

function StatusMessage({
  text,
  tone,
}: {
  text: string;
  tone: "success" | "warning";
}) {
  return (
    <div
      className={`mt-4 flex min-w-0 items-start gap-3 rounded-[16px] border px-4 py-3 text-[13px] font-bold ${
        tone === "success"
          ? "border-[#DDEFE6] bg-[#F2FAF6] text-[#2FA779]"
          : "border-[#FDECCB] bg-[#FFF7EA] text-[#D98806]"
      }`}
    >
      {tone === "success" ? (
        <CheckCircle2 className="size-5 shrink-0" aria-hidden="true" />
      ) : (
        <AlertTriangle className="size-5 shrink-0" aria-hidden="true" />
      )}
      <span className="min-w-0 break-words">{text}</span>
    </div>
  );
}
function normalizeReminderSourceText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

type PrimaryAction =
  | "archive"
  | "create_reminder"
  | "create_task"
  | "download_ics"
  | "show_reply";

function getPrimaryAction(result: LifeBrainResult): PrimaryAction | null {
  const actions = asArray(result.actions);
  const hasReminder = asArray(result.reminders).length > 0;
  const hasDeadline = asArray(result.deadlines).length > 0;
  const hasAppointment = asArray(result.appointments).length > 0;

  const firstAction = actions.find(
    (action) => action.type !== "archive_only" && action.type !== "no_action",
  );

  if (hasReminder || hasDeadline) {
    return "create_reminder";
  }

  if (result.suggestedReply || firstAction?.type === "reply") {
    return "show_reply";
  }

  if (
    firstAction?.type === "create_task" ||
    firstAction?.type === "provide_missing_info" ||
    firstAction?.type === "send_document" ||
    firstAction?.type === "call_someone" ||
    firstAction?.type === "review_document"
  ) {
    return "create_task";
  }

  if (hasAppointment) {
    return "download_ics";
  }

  if (firstAction) {
    return "create_task";
  }

  return "archive";
}

function getReminderTitle(result: LifeBrainResult): string {
  const actionTitle = result.actions[0]?.title;
  const normalizedActionTitle = actionTitle?.toLowerCase() ?? "";
  const summary = result.shortSummary.toLowerCase();

  if (
    summary.includes("zahlungsfrist") ||
    summary.includes("rechnung") ||
    summary.includes("betrag") ||
    summary.includes("zahlung mit frist") ||
    (summary.includes("zahlung") && summary.includes("frist")) ||
    normalizedActionTitle.includes("zahlungsfrist") ||
    normalizedActionTitle.includes("zahlung")
  ) {
    return actionTitle || "Zahlungsfrist prüfen";
  }

  if (result.appointments.length > 0) {
    return actionTitle || "Termin vorbereiten";
  }

  if (result.deadlines.length > 0) {
    return actionTitle || "Frist prüfen";
  }

  return actionTitle || "LifePilot-Erinnerung prüfen";
}

function getImportantFactValue(
  result: LifeBrainResult,
  keywords: string[],
): string | null {
  const facts = asArray(result.importantFacts);

  const fact = facts.find((item) => {
    const searchableText = `${item.label} ${item.value}`.toLowerCase();

    return keywords.some((keyword) =>
      searchableText.includes(keyword.toLowerCase()),
    );
  });

  return fact?.value ?? null;
}

function cleanExtractedValue(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/[.,;:]$/, "")
    .trim();
}

function cleanAmountValue(value: string): string {
  const match = value.match(
    /(\d{1,3}(?:[.\s]\d{3})*,\d{2}\s*(?:€|eur)|\d+(?:[.,]\d{2})?\s*(?:€|eur))/i,
  );

  return match
    ? match[1].replace(/\s+/g, " ").replace(/eur/i, "EUR").trim()
    : cleanExtractedValue(value);
}

function getAmountFromText(text: string): string | null {
  const match = text.match(
    /(\d{1,3}(?:[.\s]\d{3})*,\d{2}|\d+[.,]\d{2})\s*(?:€|eur)/i,
  );

  return match
    ? match[0].replace(/\s+/g, " ").replace(/eur/i, "EUR").trim()
    : null;
}

function cleanPaymentReferenceValue(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const match = value.match(/[A-Z0-9]+(?:[-_/][A-Z0-9]+)+/i);

  return match ? match[0].trim() : cleanExtractedValue(value);
}

function getPaymentReferenceFromText(text: string): string | null {
  const patterns = [
    /verwendungszweck\s+die\s+rechnungsnummer\s+([A-Z0-9][A-Z0-9_/-]+)/i,
    /verwendungszweck\s*[:-]?\s*([A-Z0-9][A-Z0-9_/-]+)/i,
    /rechnungsnummer\s*[:-]?\s*([A-Z0-9][A-Z0-9_/-]+)/i,
    /rechnung\s*(?:nr\.?|nummer)\s*[:-]?\s*([A-Z0-9][A-Z0-9_/-]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      return cleanPaymentReferenceValue(match[1]);
    }
  }

  return null;
}

function getReminderNotes(result: LifeBrainResult, sourceText: string): string {
  const summary = result.shortSummary.toLowerCase();
  const deadline = result.deadlines[0];
  const dueDate = deadline?.date ? formatDate(deadline.date) : null;

  const rawAmount = getImportantFactValue(result, [
    "betrag",
    "summe",
    "offener betrag",
    "gesamtbetrag",
    "rechnungsbetrag",
  ]);

  const cleanedAmount = rawAmount ? cleanAmountValue(rawAmount) : null;
  const amount =
    cleanedAmount && /\d/.test(cleanedAmount)
      ? cleanedAmount
      : getAmountFromText(sourceText);

  const rawPaymentReference = getImportantFactValue(result, [
    "verwendungszweck",
    "rechnungsnummer",
    "referenz",
    "kundennummer",
  ]);

  const paymentReference =
    cleanPaymentReferenceValue(rawPaymentReference) ??
    getPaymentReferenceFromText(sourceText);

  const actionTitle = result.actions[0]?.title.toLowerCase() ?? "";
  const sourceTextLower = sourceText.toLowerCase();

  const looksLikeInvoice =
    summary.includes("zahlungsfrist") ||
    summary.includes("rechnung") ||
    summary.includes("betrag") ||
    summary.includes("zahlung mit frist") ||
    (summary.includes("zahlung") && summary.includes("frist")) ||
    actionTitle.includes("zahlungsfrist") ||
    actionTitle.includes("zahlung") ||
    sourceTextLower.includes("rechnung") ||
    sourceTextLower.includes("betrag") ||
    sourceTextLower.includes("verwendungszweck");

  if (looksLikeInvoice) {
    const firstSentence =
      amount && dueDate
        ? `${amount} bis ${dueDate} prüfen und bezahlen.`
        : dueDate
          ? `Zahlung bis ${dueDate} prüfen und bezahlen.`
          : "Rechnung prüfen und fristgerecht bezahlen.";

    return paymentReference
      ? `${firstSentence} Verwendungszweck: ${paymentReference}.`
      : firstSentence;
  }

  return result.shortSummary;
}

type StoredReminderPriorityValue = "low" | "medium" | "high";

function getReminderPriority(
  result: LifeBrainResult,
  sourceText: string,
): StoredReminderPriorityValue {
  const actionTitle = result.actions[0]?.title ?? "";
  const actionDescription = result.actions[0]?.description ?? "";

  const searchableText = [
    sourceText,
    result.title,
    result.shortSummary,
    result.category,
    actionTitle,
    actionDescription,
  ]
    .join(" ")
    .toLowerCase();

  const looksCritical =
    searchableText.includes("inkasso") ||
    searchableText.includes("sperrandrohung") ||
    searchableText.includes("sperrung") ||
    searchableText.includes("gerichtliches mahnverfahren") ||
    searchableText.includes("vollstreckung");

  if (looksCritical) {
    return "high";
  }

  const looksHigh =
    searchableText.includes("mahnung") ||
    searchableText.includes("zahlungserinnerung") ||
    searchableText.includes("zahlungsverzug") ||
    searchableText.includes("letzte zahlungsaufforderung") ||
    searchableText.includes("verzug");

  if (looksHigh) {
    return "high";
  }

  const looksLikeInvoice =
    result.documentType === "invoice" ||
    searchableText.includes("rechnung") ||
    searchableText.includes("betrag") ||
    searchableText.includes("zahlungsfrist") ||
    (searchableText.includes("zahlung") && searchableText.includes("frist"));

  if (looksLikeInvoice) {
    return "medium";
  }

  const actionPriority = result.actions[0]?.priority;

  if (
    actionPriority === "low" ||
    actionPriority === "medium" ||
    actionPriority === "high"
  ) {
    return actionPriority;
  }

  return "medium";
}

function getHumanNextStep(result: LifeBrainResult): {
  title: string;
  description: string;
} {
  const deadline = result.deadlines[0];
  const dueDate = deadline?.date ? formatDate(deadline.date) : null;

  const recommendedTitle = result.recommendedNextStep.title.toLowerCase();
  const actionTitle = result.actions[0]?.title.toLowerCase() ?? "";
  const summary = result.shortSummary.toLowerCase();
  const hasDeadline = result.deadlines.length > 0;
  const hasAppointment = result.appointments.length > 0;

  const looksLikeInvoice =
    summary.includes("zahlungsfrist") ||
    summary.includes("rechnung") ||
    summary.includes("betrag") ||
    summary.includes("zahlung mit frist") ||
    (summary.includes("zahlung") && summary.includes("frist")) ||
    recommendedTitle.includes("zahlungsfrist") ||
    recommendedTitle.includes("zahlung") ||
    actionTitle.includes("zahlungsfrist") ||
    actionTitle.includes("zahlung");

  if (looksLikeInvoice) {
    return {
      title: "Rechnung prüfen und bezahlen",
      description: dueDate
        ? `Prüfe Betrag und Empfänger. Wenn die Rechnung korrekt ist, bezahle sie bis zum ${dueDate}.`
        : "Prüfe Betrag und Empfänger. Wenn die Rechnung korrekt ist, bezahle sie fristgerecht.",
    };
  }

  if (hasAppointment) {
    return {
      title: "Termin vorbereiten",
      description: dueDate
        ? `LifePilot hat einen Termin erkannt. Prüfe Ort, Uhrzeit und benötigte Unterlagen für den ${dueDate}.`
        : "LifePilot hat einen Termin erkannt. Prüfe Ort, Uhrzeit und benötigte Unterlagen.",
    };
  }

  if (result.suggestedReply) {
    return {
      title: "Antwort und Frist prüfen",
      description: dueDate
        ? `Prüfe die angeforderten Unterlagen und sende deine Antwort rechtzeitig bis zum ${dueDate}.`
        : "Prüfe die Nachricht und bereite deine Antwort vor.",
    };
  }

  if (hasDeadline) {
    return {
      title: "Frist prüfen und rechtzeitig handeln",
      description: dueDate
        ? `LifePilot hat eine Frist erkannt. Prüfe den Inhalt und erledige die notwendige Handlung bis zum ${dueDate}.`
        : "LifePilot hat eine Frist erkannt. Prüfe den Inhalt und erledige die notwendige Handlung rechtzeitig.",
    };
  }

  return {
    title: result.recommendedNextStep.title,
    description: result.recommendedNextStep.description,
  };
}

function getPrimaryActionIcon(action: string): React.ReactNode {
  if (action === "create_reminder") {
    return <CalendarClock className="size-4" aria-hidden="true" />;
  }

  if (action === "download_ics") {
    return <CalendarClock className="size-4" aria-hidden="true" />;
  }

  if (action === "show_reply") {
    return <MessageSquareText className="size-4" aria-hidden="true" />;
  }

  if (action === "create_task") {
    return <CheckCircle2 className="size-4" aria-hidden="true" />;
  }

  return <FileText className="size-4" aria-hidden="true" />;
}

function getPrimaryActionLabel(action: string): string {
  if (action === "create_reminder") {
    return "Erinnerung vorbereiten";
  }

  if (action === "download_ics") {
    return "Kalenderdatei herunterladen";
  }

  if (action === "show_reply") {
    return "Antwortentwurf anzeigen";
  }

  if (action === "create_task") {
    return "Aufgabe vorbereiten";
  }

  if (action === "archive") {
    return "Sinnvoll ablegen";
  }

  return "Nächsten Schritt ausführen";
}

function createDateSummary(result: LifeBrainResult): string {
  const count = result.deadlines.length + result.appointments.length;

  if (count === 0) {
    return "Keine Frist erkannt";
  }

  if (result.appointments.length > 0 && result.deadlines.length > 0) {
    return "Termin und Frist erkannt";
  }

  if (result.appointments.length > 0) {
    return "Termin erkannt";
  }

  return "Frist erkannt";
}

function toReminderDateTime(value: string): string {
  return value.includes("T") ? value : `${value}T09:00:00.000Z`;
}

function formatDate(value: string): string {
  const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("de-DE");
}

function formatList(values: string[]): string {
  return values.length > 0 ? values.join(", ") : "Keine";
}

function asArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}
