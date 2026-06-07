import type {
  CreateReminderInput,
  DetectedDeadline,
  Document as LifePilotDocument,
  Reminder,
  ReminderCreateInput,
  ReminderRecord,
  ReminderUpdateInput,
} from "@lifepilot/shared";

type StoredReminderPriority = ReminderRecord["priority"];

type CreateReminderInputWithPriority = CreateReminderInput & {
  priority?: StoredReminderPriority;
};

type ReminderWithPriority = Reminder & {
  priority?: StoredReminderPriority;
};

export const remindersStorageKey = "lifepilot:confirmed-reminders:v1";

export function readStoredReminders(): ReminderWithPriority[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(remindersStorageKey);
    const parsedValue = rawValue ? JSON.parse(rawValue) : [];
    const reminders = Array.isArray(parsedValue)
      ? parsedValue
          .map(normalizeStoredReminder)
          .filter((reminder): reminder is ReminderWithPriority =>
            Boolean(reminder),
          )
      : [];

    return reminders.sort(
      (left, right) => getReminderTimestamp(left) - getReminderTimestamp(right),
    );
  } catch {
    return [];
  }
}

export function createReminder(
  input: CreateReminderInputWithPriority,
): Reminder {
  const now = new Date().toISOString();

  const reminder: ReminderWithPriority = {
    completed: false,
    createdAt: now,
    dueAt: input.dueAt,
    id: `reminder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    notes: input.notes,
    priority: input.priority ?? "medium",
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
        dateIso: reminder.dueAt?.slice(0, 10),
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
      priority: input.priority,
      source:
        input.sourceType === "contract-deadline"
          ? "contract"
          : (input.sourceType ?? "manual"),
      sourceDocumentId: input.sourceDocumentId,
      sourceLabel:
        input.sourceType === "contract-deadline" ? "Vertragsfrist" : undefined,
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

  const updated: ReminderWithPriority = {
    ...existing,
    completed: input.status ? input.status === "done" : existing.completed,
    dueAt: input.dueDate ?? existing.dueAt,
    notes: input.description ?? existing.notes,
    priority: input.priority ?? existing.priority,
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

function writeReminders(reminders: ReminderWithPriority[]): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    remindersStorageKey,
    JSON.stringify((Array.isArray(reminders) ? reminders : []).slice(0, 50)),
  );
}

function createReminderTitle(
  deadline: DetectedDeadline,
  document: LifePilotDocument,
): string {
  if (deadline.kind === "kuendigung") {
    return `Kündigungsfrist prüfen: ${document.name ?? "Dokument"}`;
  }

  if (deadline.kind === "zahlung") {
    return `Zahlungsfrist prüfen: ${document.name ?? "Dokument"}`;
  }

  if (deadline.kind === "termin") {
    return `Termin prüfen: ${document.name ?? "Dokument"}`;
  }

  return `Frist prüfen: ${document.name ?? "Dokument"}`;
}

function toReminderRecord(
  reminder: ReminderWithPriority,
  overrides: Partial<ReminderRecord> = {},
): ReminderRecord {
  return {
    createdAt: reminder.createdAt ?? new Date().toISOString(),
    description: reminder.notes,
    dueDate: reminder.dueAt ?? new Date().toISOString(),
    id: reminder.id ?? `reminder-record-${Date.now()}`,
    priority: overrides.priority ?? reminder.priority ?? "medium",
    reminderDate: overrides.reminderDate,
    sourceContractId: overrides.sourceContractId,
    sourceDocumentId: reminder.sourceDocumentId,
    sourceType:
      overrides.sourceType ??
      (reminder.source === "contract"
        ? "contract-deadline"
        : "document-deadline"),
    status: reminder.completed ? "done" : "open",
    title: reminder.title ?? "Unbenannte Erinnerung",
    updatedAt:
      reminder.updatedAt ?? reminder.createdAt ?? new Date().toISOString(),
    userId: "local-dev-user",
  };
}

function normalizeStoredReminder(value: unknown): ReminderWithPriority | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = typeof value.id === "string" ? value.id.trim() : "";
  const title = typeof value.title === "string" ? value.title.trim() : "";
  const dueAt = typeof value.dueAt === "string" ? value.dueAt : "";

  if (!id && !title && !dueAt) {
    return null;
  }

  return {
    completed: Boolean(value.completed),
    createdAt:
      typeof value.createdAt === "string" ? value.createdAt : undefined,
    dueAt: dueAt || new Date().toISOString(),
    id: id || `stored-reminder-${stableHash(JSON.stringify(value))}`,
    linkedGoalId:
      typeof value.linkedGoalId === "string" ? value.linkedGoalId : undefined,
    notes: typeof value.notes === "string" ? value.notes : undefined,
    priority: isStoredReminderPriority(value.priority)
      ? value.priority
      : undefined,
    source: isReminderSource(value.source) ? value.source : "manual",
    sourceDocumentId:
      typeof value.sourceDocumentId === "string"
        ? value.sourceDocumentId
        : undefined,
    sourceLabel:
      typeof value.sourceLabel === "string" ? value.sourceLabel : undefined,
    sourceOriginalText:
      typeof value.sourceOriginalText === "string"
        ? value.sourceOriginalText
        : undefined,
    title: title || "Unbenannte Erinnerung",
    updatedAt:
      typeof value.updatedAt === "string" ? value.updatedAt : undefined,
  };
}

function getReminderTimestamp(reminder: Reminder): number {
  const timestamp = new Date(reminder.dueAt ?? "").getTime();

  return Number.isFinite(timestamp) ? timestamp : Number.MAX_SAFE_INTEGER;
}

function isReminderSource(value: unknown): value is Reminder["source"] {
  return (
    typeof value === "string" &&
    ["manual", "document-deadline", "contract", "system"].includes(value)
  );
}

function isStoredReminderPriority(
  value: unknown,
): value is StoredReminderPriority {
  return typeof value === "string" && ["low", "medium", "high"].includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function stableHash(value: string): string {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash).toString(36);
}
