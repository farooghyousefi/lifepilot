"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock,
  Trash2,
} from "lucide-react";
import type { Reminder } from "@lifepilot/shared";

import {
  DashboardSection,
  LifePilotShell,
  PageHeader,
  SummaryCard,
} from "../dashboard/dashboard-ui";
import {
  deleteStoredReminder,
  readStoredReminders,
  toggleReminderCompleted,
} from "../../src/services/reminders";

export function RemindersClient() {
  const [storedReminders, setStoredReminders] = useState<Reminder[]>([]);

  useEffect(() => {
    setStoredReminders(readStoredReminders());
  }, []);

  const openReminders = useMemo(
    () => storedReminders.filter((reminder) => !reminder.completed),
    [storedReminders],
  );

  const completedReminders = useMemo(
    () => storedReminders.filter((reminder) => reminder.completed),
    [storedReminders],
  );

  const metrics = [
    {
      accent: "red",
      icon: Bell,
      label: "Offen",
      meta: "Bestätigte Fristen",
      value: String(openReminders.length),
      visual: "bell",
    },
    {
      accent: "green",
      icon: CheckCircle2,
      label: "Erledigt",
      meta: "Lokal gespeichert",
      value: String(completedReminders.length),
      visual: "chart",
    },
    {
      accent: "orange",
      icon: Clock,
      label: "Reminder-Backend",
      meta: "Noch nicht deployt",
      value: "0",
      visual: "bell",
    },
  ] as const;

  const toggleReminder = (reminderId: string) => {
    setStoredReminders(toggleReminderCompleted(reminderId));
  };

  const deleteReminder = (reminderId: string) => {
    setStoredReminders(deleteStoredReminder(reminderId));
  };

  return (
    <LifePilotShell activeItem="Reminders">
      <PageHeader
        eyebrow="Erinnerungen"
        subtitle="Bestätigte Fristen und Wiedervorlagen aus deinen Dokumenten."
        title="Erinnerungen"
      />

      <section className="mt-6 rounded-[20px] border border-[#FDECCB] bg-[#FFF7EA] p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-[#D98806]" />
          <p className="text-[13px] font-semibold leading-6 text-[#667085]">
            Lokaler Dev-Modus: Erinnerungen werden aktuell im Browser
            gespeichert. Sie sind noch nicht geräteübergreifend synchronisiert.
          </p>
        </div>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((card) => (
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

      <section className="mt-7 grid gap-5 xl:grid-cols-[1fr_0.85fr]">
        <DashboardSection title="Offene Erinnerungen">
          {openReminders.length > 0 ? (
            openReminders.map((reminder) => (
              <StoredReminderItem
                key={reminder.id}
                onDelete={() => deleteReminder(reminder.id)}
                onToggle={() => toggleReminder(reminder.id)}
                reminder={reminder}
              />
            ))
          ) : (
            <EmptyReminderState text="Noch keine bestätigten Dokument-Fristen. Lade ein Dokument hoch, prüfe eine erkannte Frist und erstelle daraus eine Erinnerung." />
          )}
        </DashboardSection>

        <section className="rounded-[22px] border border-[#ECEFEB] bg-white p-6 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-[#FFF0D6] text-[#F59E0B]">
              <CalendarDays className="size-6" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-[-0.01em] text-[#101828]">
                Nächster Ausbau
              </h2>
              <p className="mt-1 text-[13px] font-semibold text-[#667085]">
                Backend, Kalender und Push kommen nach stabiler
                Dokumentenlogik.
              </p>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {[
              "Reminder in DynamoDB speichern",
              "Benachrichtigungen pro Nutzer isolieren",
              "Später Kalender und Push verbinden",
            ].map((item) => (
              <div
                className="rounded-[16px] border border-[#ECEFEB] bg-[#FCFBFA] px-4 py-3 text-[14px] font-bold text-[#101828]"
                key={item}
              >
                {item}
              </div>
            ))}
          </div>
        </section>
      </section>

      <section className="mt-7">
        <DashboardSection title="Erledigt">
          {completedReminders.length > 0 ? (
            completedReminders.map((reminder) => (
              <StoredReminderItem
                key={reminder.id}
                onDelete={() => deleteReminder(reminder.id)}
                onToggle={() => toggleReminder(reminder.id)}
                reminder={reminder}
              />
            ))
          ) : (
            <EmptyReminderState text="Noch keine erledigten Erinnerungen." />
          )}
        </DashboardSection>
      </section>
    </LifePilotShell>
  );
}

function StoredReminderItem({
  onDelete,
  onToggle,
  reminder,
}: {
  onDelete: () => void;
  onToggle: () => void;
  reminder: Reminder;
}) {
  const dueDate = new Date(reminder.dueAt);

  return (
    <div className="flex items-start gap-4 py-4 first:pt-1 last:pb-1">
      <button
        aria-label={
          reminder.completed
            ? "Erinnerung wieder öffnen"
            : "Erinnerung erledigen"
        }
        className={`mt-1 flex size-10 shrink-0 items-center justify-center rounded-2xl border ${
          reminder.completed
            ? "border-[#DDEFE6] bg-[#F2FAF6] text-[#2FA779]"
            : "border-[#F3D9D4] bg-white text-[#FF7B6D]"
        }`}
        onClick={onToggle}
        type="button"
      >
        <CheckCircle2 className="size-5" aria-hidden="true" />
      </button>
      <div className="min-w-0 flex-1">
        <p
          className={`text-[15px] font-bold ${
            reminder.completed ? "text-[#667085] line-through" : "text-[#101828]"
          }`}
        >
          {reminder.title}
        </p>
        <p className="mt-1 text-[13px] font-semibold text-[#667085]">
          {dueDate.toLocaleString("de-DE", {
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            month: "2-digit",
            year: "numeric",
          })}
        </p>
        {reminder.sourceLabel ? (
          <p className="mt-2 text-[12px] font-bold text-[#2FA779]">
            {reminder.sourceLabel}
          </p>
        ) : null}
      </div>
      <button
        aria-label="Erinnerung löschen"
        className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#FFF3F1] text-[#E14C45]"
        onClick={onDelete}
        type="button"
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function EmptyReminderState({ text }: { text: string }) {
  return (
    <div className="py-4 first:pt-1 last:pb-1">
      <p className="rounded-[18px] border border-[#ECEFEB] bg-[#FCFBFA] p-5 text-[13px] font-semibold leading-6 text-[#667085]">
        {text}
      </p>
    </div>
  );
}
