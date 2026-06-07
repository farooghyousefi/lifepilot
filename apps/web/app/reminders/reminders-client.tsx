"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CalendarDays,
  CheckCircle2,
  PenLine,
  Plus,
  Trash2,
} from "lucide-react";
import type {
  ReminderCreateInput,
  ReminderPriority,
  ReminderRecord,
  ReminderStatus,
} from "@lifepilot/shared";

import {
  DashboardSection,
  LifePilotShell,
  PageHeader,
  SummaryCard,
} from "../dashboard/dashboard-ui";
import {
  createPersistedReminder,
  deletePersistedReminder,
  listPersistedReminders,
  markPersistedReminderDone,
  updatePersistedReminder,
} from "../../src/services/memory";

const emptyReminderForm: ReminderCreateInput = {
  description: "",
  dueDate: "",
  priority: "medium",
  reminderDate: "",
  sourceType: "manual",
  title: "",
};

const priorityLabels: Record<ReminderPriority, string> = {
  high: "Hoch",
  low: "Niedrig",
  medium: "Normal",
};

const statusLabels: Record<ReminderStatus, string> = {
  cancelled: "Abgebrochen",
  done: "Erledigt",
  open: "Offen",
  overdue: "Überfällig",
};

type ReminderGroup = "overdue" | "today" | "week" | "later";

export function RemindersClient() {
  const [reminders, setReminders] = useState<ReminderRecord[]>([]);
  const [form, setForm] = useState<ReminderCreateInput>(emptyReminderForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [persistenceMessage, setPersistenceMessage] = useState(
    "Backend-Speicherung vorbereitet, aber noch nicht deployed.",
  );

  useEffect(() => {
    void refreshReminders();
  }, []);

  const safeReminders = useMemo(() => asArray(reminders), [reminders]);
  const openReminders = useMemo(
    () => safeReminders.filter((reminder) => reminder.status !== "done"),
    [safeReminders],
  );
  const completedReminders = useMemo(
    () => safeReminders.filter((reminder) => reminder.status === "done"),
    [safeReminders],
  );
  const groupedReminders = useMemo(
    () => groupReminders(openReminders),
    [openReminders],
  );

  const metrics = [
    {
      accent: "red",
      icon: Bell,
      label: "Nächste Fristen",
      meta: "Offen",
      value: String(openReminders.length),
      visual: "bell",
    },
    {
      accent: "orange",
      icon: AlertTriangle,
      label: "Überfällig",
      meta: "Bitte prüfen",
      value: String(groupedReminders.overdue.length),
      visual: "bell",
    },
    {
      accent: "green",
      icon: CheckCircle2,
      label: "Erledigt",
      meta: "Abgeschlossen",
      value: String(completedReminders.length),
      visual: "chart",
    },
  ] as const;

  async function refreshReminders() {
    const result = await listPersistedReminders();

    setReminders(asArray(result.data));
    setPersistenceMessage(result.message);
  }

  async function handleSubmit() {
    if (!form.title.trim() || !form.dueDate) {
      setMessage("Bitte Titel und Datum angeben.");
      return;
    }

    if (editingId) {
      const result = await updatePersistedReminder(editingId, {
        description: form.description,
        dueDate: form.dueDate,
        priority: form.priority,
        reminderDate: form.reminderDate,
        sourceType: "manual",
        title: form.title,
      });

      setMessage(
        result.data
          ? `Erinnerung aktualisiert. ${result.message}`
          : "Erinnerung konnte nicht aktualisiert werden.",
      );
    } else {
      const result = await createPersistedReminder({
        description: form.description,
        dueDate: form.dueDate,
        priority: form.priority,
        reminderDate: form.reminderDate,
        sourceType: "manual",
        title: form.title,
      });

      setMessage(`Erinnerung erstellt. ${result.message}`);
    }

    setEditingId(null);
    setForm(emptyReminderForm);
    await refreshReminders();
  }

  async function markDone(reminderId: string) {
    const result = await markPersistedReminderDone(reminderId);

    setMessage(
      result.data
        ? `Erinnerung erledigt. ${result.message}`
        : "Erinnerung konnte nicht aktualisiert werden.",
    );
    await refreshReminders();
  }

  async function deleteReminder(reminderId: string) {
    const result = await deletePersistedReminder(reminderId);

    setMessage(
      result.data
        ? `Erinnerung gelöscht. ${result.message}`
        : "Erinnerung konnte nicht gelöscht werden.",
    );
    await refreshReminders();
  }

  function startEditing(reminder: ReminderRecord) {
    setEditingId(reminder.id);
    setForm({
      description: reminder.description ?? "",
      dueDate: reminder.dueDate ?? "",
      priority: reminder.priority ?? "medium",
      reminderDate: reminder.reminderDate ?? "",
      sourceType: reminder.sourceType ?? "manual",
      title: reminder.title ?? "",
    });
  }

  return (
    <LifePilotShell activeItem="Reminders">
      <PageHeader
        eyebrow="Erinnerungen"
        subtitle="Fristen aus Dokumenten, Verträgen und manuellen Wiedervorlagen."
        title="Nächste Fristen & Erinnerungen"
      />

      <section className="mt-6 rounded-[20px] border border-[#FDECCB] bg-[#FFF7EA] p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-[#D98806]" />
          <p className="text-[13px] font-semibold leading-6 text-[#667085]">
            {persistenceMessage}
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

      <section className="mt-7 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[22px] border border-[#ECEFEB] bg-white p-6 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-[#EAF7F0] text-[#2FA779]">
              <Plus className="size-6" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-[-0.01em] text-[#101828]">
                {editingId ? "Erinnerung bearbeiten" : "Erinnerung erstellen"}
              </h2>
              <p className="mt-1 text-[13px] font-semibold text-[#667085]">
                Manuelle Frist oder Wiedervorlage anlegen.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4">
            <label>
              <span className="text-[12px] font-bold text-[#344054]">
                Titel
              </span>
              <input
                className="mt-2 w-full rounded-xl border border-[#ECEFEB] bg-[#FCFBFA] px-4 py-3 text-[14px] font-semibold text-[#101828] outline-none focus:border-[#2FA779]"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="z.B. Stromvertrag prüfen"
                value={form.title}
              />
            </label>
            <label>
              <span className="text-[12px] font-bold text-[#344054]">
                Beschreibung
              </span>
              <textarea
                className="mt-2 min-h-24 w-full rounded-xl border border-[#ECEFEB] bg-[#FCFBFA] px-4 py-3 text-[14px] font-semibold text-[#101828] outline-none focus:border-[#2FA779]"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Kurzer Hinweis für dich"
                value={form.description}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="text-[12px] font-bold text-[#344054]">
                  Fällig am
                </span>
                <input
                  className="mt-2 w-full rounded-xl border border-[#ECEFEB] bg-[#FCFBFA] px-4 py-3 text-[14px] font-semibold text-[#101828] outline-none focus:border-[#2FA779]"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      dueDate: event.target.value,
                    }))
                  }
                  type="date"
                  value={form.dueDate}
                />
              </label>
              <label>
                <span className="text-[12px] font-bold text-[#344054]">
                  Erinnerung am
                </span>
                <input
                  className="mt-2 w-full rounded-xl border border-[#ECEFEB] bg-[#FCFBFA] px-4 py-3 text-[14px] font-semibold text-[#101828] outline-none focus:border-[#2FA779]"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      reminderDate: event.target.value,
                    }))
                  }
                  type="date"
                  value={form.reminderDate}
                />
              </label>
            </div>
            <label>
              <span className="text-[12px] font-bold text-[#344054]">
                Priorität
              </span>
              <select
                className="mt-2 w-full rounded-xl border border-[#ECEFEB] bg-[#FCFBFA] px-4 py-3 text-[14px] font-semibold text-[#101828] outline-none focus:border-[#2FA779]"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    priority: event.target.value as ReminderPriority,
                  }))
                }
                value={form.priority}
              >
                <option value="low">Niedrig</option>
                <option value="medium">Normal</option>
                <option value="high">Hoch</option>
              </select>
            </label>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#2FA779] px-4 py-3 text-[13px] font-bold text-white transition hover:bg-[#258866]"
              onClick={handleSubmit}
              type="button"
            >
              <CheckCircle2 className="size-4" aria-hidden="true" />
              {editingId ? "Bearbeitung speichern" : "Erinnerung speichern"}
            </button>
            {editingId ? (
              <button
                className="rounded-xl border border-[#ECEFEB] bg-white px-4 py-3 text-[13px] font-bold text-[#667085]"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyReminderForm);
                }}
                type="button"
              >
                Abbrechen
              </button>
            ) : null}
          </div>

          {message ? (
            <div className="mt-4 rounded-[16px] border border-[#DDEFE6] bg-[#F2FAF6] px-4 py-3 text-[13px] font-bold text-[#2FA779]">
              {message}
            </div>
          ) : null}
        </section>

        <div className="grid gap-5">
          <ReminderGroupSection
            onDelete={deleteReminder}
            onDone={markDone}
            onEdit={startEditing}
            reminders={groupedReminders.overdue}
            title="Überfällig"
          />
          <ReminderGroupSection
            onDelete={deleteReminder}
            onDone={markDone}
            onEdit={startEditing}
            reminders={groupedReminders.today}
            title="Heute"
          />
          <ReminderGroupSection
            onDelete={deleteReminder}
            onDone={markDone}
            onEdit={startEditing}
            reminders={groupedReminders.week}
            title="Diese Woche"
          />
          <ReminderGroupSection
            onDelete={deleteReminder}
            onDone={markDone}
            onEdit={startEditing}
            reminders={groupedReminders.later}
            title="Später"
          />
        </div>
      </section>
    </LifePilotShell>
  );
}

function ReminderGroupSection({
  onDelete,
  onDone,
  onEdit,
  reminders,
  title,
}: {
  onDelete: (reminderId: string) => void;
  onDone: (reminderId: string) => void;
  onEdit: (reminder: ReminderRecord) => void;
  reminders: ReminderRecord[];
  title: string;
}) {
  return (
    <DashboardSection title={title}>
      {asArray(reminders).length > 0 ? (
        asArray(reminders).map((reminder) => (
          <ReminderCard
            key={reminder.id ?? `${title}-${reminder.title}-${reminder.dueDate}`}
            onDelete={() => onDelete(reminder.id)}
            onDone={() => onDone(reminder.id)}
            onEdit={() => onEdit(reminder)}
            reminder={reminder}
          />
        ))
      ) : (
        <div className="rounded-[18px] border border-[#ECEFEB] bg-[#FCFBFA] p-5">
          <p className="text-[14px] font-bold text-[#667085]">
            Keine Einträge.
          </p>
        </div>
      )}
    </DashboardSection>
  );
}

function ReminderCard({
  onDelete,
  onDone,
  onEdit,
  reminder,
}: {
  onDelete: () => void;
  onDone: () => void;
  onEdit: () => void;
  reminder: ReminderRecord;
}) {
  return (
    <article className="rounded-[18px] border border-[#ECEFEB] bg-[#FCFBFA] p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#FFF0D6] text-[#F59E0B]">
          <CalendarDays className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[15px] font-bold text-[#101828]">
              {reminder.title ?? "Unbenannte Erinnerung"}
            </h3>
            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-[#667085]">
              {statusLabels[reminder.status ?? "open"]}
            </span>
            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-[#667085]">
              {priorityLabels[reminder.priority ?? "medium"]}
            </span>
          </div>
          <p className="mt-1 text-[13px] font-semibold text-[#667085]">
            Fällig: {formatDate(reminder.dueDate)}
            {reminder.reminderDate
              ? ` · Erinnerung: ${formatDate(reminder.reminderDate)}`
              : ""}
          </p>
          {reminder.description ? (
            <p className="mt-2 text-[13px] font-semibold leading-6 text-[#667085]">
              {reminder.description}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className="inline-flex items-center gap-2 rounded-xl bg-[#EAF7F0] px-3 py-2 text-[12px] font-bold text-[#2FA779]"
              onClick={onDone}
              type="button"
            >
              <CheckCircle2 className="size-4" aria-hidden="true" />
              Als erledigt markieren
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-xl border border-[#ECEFEB] bg-white px-3 py-2 text-[12px] font-bold text-[#344054]"
              onClick={onEdit}
              type="button"
            >
              <PenLine className="size-4" aria-hidden="true" />
              Bearbeiten
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-xl border border-[#F3D9D4] bg-white px-3 py-2 text-[12px] font-bold text-[#E14C45]"
              onClick={onDelete}
              type="button"
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Löschen
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function groupReminders(
  reminders: ReminderRecord[],
): Record<ReminderGroup, ReminderRecord[]> {
  const today = startOfDay(new Date());
  const weekEnd = new Date(today);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

  return asArray(reminders).reduce<Record<ReminderGroup, ReminderRecord[]>>(
    (groups, reminder) => {
      const dueDate = startOfDay(new Date(reminder.dueDate));

      if (dueDate < today) {
        groups.overdue.push({ ...reminder, status: "overdue" });
      } else if (dueDate.getTime() === today.getTime()) {
        groups.today.push(reminder);
      } else if (dueDate <= weekEnd) {
        groups.week.push(reminder);
      } else {
        groups.later.push(reminder);
      }

      return groups;
    },
    {
      later: [],
      overdue: [],
      today: [],
      week: [],
    },
  );
}

function formatDate(value?: string): string {
  if (!value) {
    return "Datum fehlt";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Datum unklar";
  }

  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function startOfDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function asArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}
