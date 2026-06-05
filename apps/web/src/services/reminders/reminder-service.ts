import type {
  CreateReminderInput,
  DetectedDeadline,
  Document as LifePilotDocument,
  Reminder,
  ReminderCreateInput,
  ReminderRecord,
  ReminderUpdateInput,
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

export function readStoredReminderRecords(): ReminderRecord[] {
  return readStoredReminders().map((reminder) => toReminderRecord(reminder));
}

export function createReminderRecord(
  input: ReminderCreateInput,
): ReminderRecord {
  return toReminderRecord(
    createReminder({
      dueAt: input.dueDate,
      notes: input.description,
      source:
        input.sourceType === "contract-deadline"
          ? "contract"
          : input.sourceType ?? "manual",
      sourceDocumentId: input.sourceDocumentId,
      sourceLabel:
        input.sourceType === "contract-deadline"
          ? "Vertragsfrist"
          : undefined,
      title: input.title,
    }),
    {
      priority: input.priority,
      reminderDate: input.reminderDate,
      sourceContractId: input.sourceContractId,
      sourceType: input.sourceType,
    },
  );
}

export function updateStoredReminderRecord(
  reminderId: string,
  input: ReminderUpdateInput,
): ReminderRecord | null {
  const now = new Date().toISOString();
  const reminders = readStoredReminders();
  const existing = reminders.find((reminder) => reminder.id === reminderId);

  if (!existing) {
    return null;
  }

  const updated: Reminder = {
    ...existing,
    completed: input.status ? input.status === "done" : existing.completed,
    dueAt: input.dueDate ?? existing.dueAt,
    notes: input.description ?? existing.notes,
    title: input.title ?? existing.title,
    updatedAt: now,
  };

  writeReminders(
    reminders.map((reminder) =>
      reminder.id === reminderId ? updated : reminder,
    ),
  );

  return toReminderRecord(updated, {
    priority: input.priority,
    reminderDate: input.reminderDate,
    sourceContractId: input.sourceContractId,
    sourceType: input.sourceType,
  });
}

export function deleteStoredReminderRecord(reminderId: string): boolean {
  const initialLength = readStoredReminders().length;

  deleteStoredReminder(reminderId);

  return readStoredReminders().length !== initialLength;
}

export function markStoredReminderDone(
  reminderId: string,
): ReminderRecord | null {
  return updateStoredReminderRecord(reminderId, { status: "done" });
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

function toReminderRecord(
  reminder: Reminder,
  overrides: Partial<ReminderRecord> = {},
): ReminderRecord {
  return {
    createdAt: reminder.createdAt ?? new Date().toISOString(),
    description: reminder.notes,
    dueDate: reminder.dueAt,
    id: reminder.id,
    priority: overrides.priority ?? "medium",
    reminderDate: overrides.reminderDate,
    sourceContractId: overrides.sourceContractId,
    sourceDocumentId: reminder.sourceDocumentId,
    sourceType:
      overrides.sourceType ??
      (reminder.source === "contract" ? "contract-deadline" : "document-deadline"),
    status: reminder.completed ? "done" : "open",
    title: reminder.title,
    updatedAt: reminder.updatedAt ?? reminder.createdAt ?? new Date().toISOString(),
    userId: "local-dev-user",
  };
}
