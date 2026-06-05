import type {
  CreateReminderInput,
  DetectedDeadline,
  Document as LifePilotDocument,
  Reminder,
} from "@lifepilot/shared";

export const remindersStorageKey = "lifepilot:confirmed-reminders:v1";

export function readStoredReminders(): Reminder[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(remindersStorageKey);
    const reminders = rawValue ? (JSON.parse(rawValue) as Reminder[]) : [];

    return reminders.sort(
      (left, right) =>
        new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime(),
    );
  } catch {
    return [];
  }
}

export function createReminder(input: CreateReminderInput): Reminder {
  const now = new Date().toISOString();
  const reminder: Reminder = {
    completed: false,
    createdAt: now,
    dueAt: input.dueAt,
    id: `reminder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    notes: input.notes,
    source: input.source ?? "manual",
    sourceDocumentId: input.sourceDocumentId,
    sourceLabel: input.sourceLabel,
    sourceOriginalText: input.sourceOriginalText,
    title: input.title,
    updatedAt: now,
  };

  writeReminders([reminder, ...readStoredReminders()]);

  return reminder;
}

export function createReminderFromDeadline({
  deadline,
  document,
}: {
  deadline: DetectedDeadline;
  document: LifePilotDocument;
}): Reminder {
  if (!deadline.dateIso) {
    throw new Error("Reminder needs a clear date.");
  }

  return createReminder({
    dueAt: `${deadline.dateIso}T09:00:00.000Z`,
    notes: deadline.originalText,
    source: "document-deadline",
    sourceDocumentId: document.id,
    sourceLabel: deadline.label,
    sourceOriginalText: deadline.originalText,
    title: createReminderTitle(deadline, document),
  });
}

export function hasReminderForDeadline({
  deadline,
  documentId,
}: {
  deadline: DetectedDeadline;
  documentId: string;
}): boolean {
  return readStoredReminders().some(
    (reminder) =>
      getDeadlineReminderKey({
        dateIso: reminder.dueAt.slice(0, 10),
        documentId: reminder.sourceDocumentId,
        originalText: reminder.sourceOriginalText,
      }) === getDeadlineReminderKey({ deadline, documentId }),
  );
}

export function getDeadlineReminderKey({
  dateIso,
  deadline,
  documentId,
  originalText,
}: {
  dateIso?: string;
  deadline?: DetectedDeadline;
  documentId?: string;
  originalText?: string;
}): string {
  return [
    documentId ?? "",
    deadline?.dateIso ?? dateIso ?? "",
    deadline?.originalText ?? originalText ?? "",
  ].join("::");
}

export function toggleReminderCompleted(reminderId: string): Reminder[] {
  const now = new Date().toISOString();
  const reminders = readStoredReminders().map((reminder) =>
    reminder.id === reminderId
      ? {
          ...reminder,
          completed: !reminder.completed,
          updatedAt: now,
        }
      : reminder,
  );

  writeReminders(reminders);

  return reminders;
}

export function deleteStoredReminder(reminderId: string): Reminder[] {
  const reminders = readStoredReminders().filter(
    (reminder) => reminder.id !== reminderId,
  );

  writeReminders(reminders);

  return reminders;
}

function writeReminders(reminders: Reminder[]): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    remindersStorageKey,
    JSON.stringify(reminders.slice(0, 50)),
  );
}

function createReminderTitle(
  deadline: DetectedDeadline,
  document: LifePilotDocument,
): string {
  if (deadline.kind === "kuendigung") {
    return `Kündigungsfrist prüfen: ${document.name}`;
  }

  if (deadline.kind === "zahlung") {
    return `Zahlungsfrist prüfen: ${document.name}`;
  }

  if (deadline.kind === "termin") {
    return `Termin prüfen: ${document.name}`;
  }

  return `Frist prüfen: ${document.name}`;
}
