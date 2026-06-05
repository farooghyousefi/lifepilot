"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarCheck2,
  CalendarClock,
  FileText,
} from "lucide-react";
import type { DocumentAnalysis, Reminder } from "@lifepilot/shared";

import { readStoredDocumentAnalyses } from "../../src/services/documents";
import { readStoredReminders } from "../../src/services/reminders";

export function DocumentIntelligenceSummary() {
  const [analyses, setAnalyses] = useState<DocumentAnalysis[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);

  useEffect(() => {
    setAnalyses(readStoredDocumentAnalyses());
    setReminders(readStoredReminders());
  }, []);

  const documentReminders = useMemo(
    () =>
      reminders
        .filter(
          (reminder) =>
            reminder.source === "document-deadline" && !reminder.completed,
        )
        .slice(0, 4),
    [reminders],
  );

  const detectedDeadlines = useMemo(
    () =>
      analyses
        .flatMap((analysis) =>
          analysis.detectedDeadlines.map((deadline) => ({
            ...deadline,
            documentId: analysis.documentId,
            documentName: analysis.documentName ?? "Unbenanntes Dokument",
          })),
        )
        .slice(0, 4),
    [analyses],
  );

  return (
    <section className="mt-7 rounded-[22px] border border-life-border bg-white p-5 shadow-card sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-[#F8F4FF] text-[#6F54E8]">
            <CalendarClock className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-normal text-life-text">
              Nächste wichtige Fristen
            </h2>
            <p className="mt-1 text-[13px] font-semibold text-[#667085]">
              Bestätigte Erinnerungen zuerst, mögliche Fristen danach.
            </p>
          </div>
        </div>
        <Link
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-life-border bg-white px-4 py-2 text-sm font-semibold text-life-text shadow-button transition hover:border-life-green/50 hover:text-life-green-dark"
          href="/documents"
        >
          <FileText className="size-4" aria-hidden="true" />
          Dokument prüfen
        </Link>
      </div>

      <div className="mt-5 rounded-[18px] border border-[#FDECCB] bg-[#FFF7EA] p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-[#D98806]" />
          <p className="text-[13px] font-semibold leading-6 text-[#667085]">
            Lokaler Dev-Modus: Analyse und Erinnerungen werden aktuell im
            Browser gespeichert. Noch keine produktive Synchronisierung.
          </p>
        </div>
      </div>

      {documentReminders.length > 0 ? (
        <div className="mt-5 rounded-[18px] border border-[#DDEFE6] bg-[#F8FCFA] p-4">
          <div className="flex items-center gap-2 text-[14px] font-bold text-[#2FA779]">
            <CalendarCheck2 className="size-5" aria-hidden="true" />
            Bestätigte Erinnerungen
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {documentReminders.map((reminder) => (
              <article
                className="rounded-[16px] border border-[#DDEFE6] bg-white p-4"
                key={reminder.id}
              >
                <p className="text-[15px] font-bold text-[#101828]">
                  {reminder.title}
                </p>
                <p className="mt-2 text-[13px] font-semibold text-[#667085]">
                  {new Date(reminder.dueAt).toLocaleString("de-DE", {
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </p>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {detectedDeadlines.length > 0 ? (
        <div className="mt-5">
          <h3 className="text-[15px] font-bold text-[#101828]">
            Mögliche Fristen zur Prüfung
          </h3>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {detectedDeadlines.map((deadline) => (
              <article
                className="rounded-[18px] border border-[#ECEFEB] bg-[#FCFBFA] p-4"
                key={`${deadline.documentId}-${deadline.kind}-${deadline.originalText}`}
              >
                <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#2FA779]">
                  {deadline.label}
                </p>
                <p className="mt-2 text-[13px] font-semibold text-[#667085]">
                  {deadline.documentName}
                </p>
                <p className="mt-3 text-[18px] font-bold text-[#101828]">
                  {deadline.dateIso
                    ? new Date(deadline.dateIso).toLocaleDateString("de-DE")
                    : "Datum unklar"}
                </p>
                <p className="mt-2 text-[13px] font-semibold leading-6 text-[#667085]">
                  {deadline.originalText.slice(0, 170)}
                  {deadline.originalText.length > 170 ? " ..." : ""}
                </p>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {documentReminders.length === 0 && detectedDeadlines.length === 0 ? (
        <div className="mt-5 rounded-[18px] border border-[#ECEFEB] bg-[#FCFBFA] p-5">
          <p className="text-[15px] font-bold text-[#101828]">
            Noch keine Fristen im Command Center.
          </p>
          <p className="mt-2 text-[14px] font-semibold leading-6 text-[#667085]">
            Lade ein TXT-Dokument hoch, damit LifePilot Datumsstellen erkennen
            und du daraus eine Erinnerung machen kannst.
          </p>
        </div>
      ) : null}
    </section>
  );
}
