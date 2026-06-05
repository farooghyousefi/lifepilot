import { createLifePilotClient } from "@lifepilot/api-client";
import { fetchAuthSession } from "aws-amplify/auth";
import type {
  ContractRecord,
  ContractRecordCreateInput,
  ContractRecordUpdateInput,
  PersistenceStatus,
  ReminderCreateInput,
  ReminderRecord,
  ReminderUpdateInput,
} from "@lifepilot/shared";

import {
  createOrUpdateContractRecord,
  deleteContractRecord,
  getContractRecord,
  listContractRecords,
  updateContractRecord,
} from "../knowledge";
import {
  createReminderRecord,
  deleteStoredReminderRecord,
  markStoredReminderDone,
  readStoredReminderRecords,
  updateStoredReminderRecord,
} from "../reminders";

export interface PersistenceResult<T> {
  data: T;
  message: string;
  status: PersistenceStatus;
}

const memoryClient = createLifePilotClient({
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
  useMockData: false,
});

const useBackendPersistence = (): boolean =>
  process.env.NEXT_PUBLIC_USE_MOCKS === "false";

export const localPersistenceMessage =
  "Entwicklungsmodus: Daten werden aktuell lokal im Browser gespeichert.";

export const backendPreparedMessage =
  "Backend-Speicherung vorbereitet, aber noch nicht deployed.";

export async function listPersistedContracts(): Promise<
  PersistenceResult<ContractRecord[]>
> {
  if (useBackendPersistence()) {
    try {
      await attachCognitoToken();
      const result = await memoryClient.listContracts();

      return backendResult(result.data);
    } catch {
      return backendFallbackResult(listContractRecords());
    }
  }

  return localResult(listContractRecords());
}

export async function savePersistedContract(
  input: ContractRecordCreateInput,
): Promise<PersistenceResult<ContractRecord>> {
  if (useBackendPersistence()) {
    try {
      await attachCognitoToken();
      const result = await memoryClient.createContract(input);

      return backendResult(result.data);
    } catch {
      return backendFallbackResult(
        createOrUpdateContractRecord({
          ...toLocalContractPatch(input),
          persistenceStatus: "backend-failed",
        }),
      );
    }
  }

  return localResult(
    createOrUpdateContractRecord({
      ...toLocalContractPatch(input),
      persistenceStatus: "local-dev",
    }),
  );
}

export async function updatePersistedContract(
  contractId: string,
  input: ContractRecordUpdateInput,
): Promise<PersistenceResult<ContractRecord | null>> {
  if (useBackendPersistence()) {
    try {
      await attachCognitoToken();
      const result = await memoryClient.updateContract(contractId, input);

      return backendResult(result.data);
    } catch {
      return backendFallbackResult(
        updateContractRecord(contractId, toLocalContractPatch(input)),
      );
    }
  }

  return localResult(updateContractRecord(contractId, toLocalContractPatch(input)));
}

export async function getPersistedContract(
  contractId: string,
): Promise<PersistenceResult<ContractRecord | null>> {
  if (useBackendPersistence()) {
    try {
      await attachCognitoToken();
      const result = await memoryClient.getContract(contractId);

      return backendResult(result.data);
    } catch {
      return backendFallbackResult(getContractRecord(contractId));
    }
  }

  return localResult(getContractRecord(contractId));
}

export async function deletePersistedContract(
  contractId: string,
): Promise<PersistenceResult<boolean>> {
  if (useBackendPersistence()) {
    try {
      await attachCognitoToken();
      const result = await memoryClient.deleteContract(contractId);

      return backendResult(result.data.deleted);
    } catch {
      deleteContractRecord(contractId);

      return backendFallbackResult(true);
    }
  }

  deleteContractRecord(contractId);

  return localResult(true);
}

export async function listPersistedReminders(): Promise<
  PersistenceResult<ReminderRecord[]>
> {
  if (useBackendPersistence()) {
    try {
      await attachCognitoToken();
      const result = await memoryClient.listReminders();

      return backendResult(result.data);
    } catch {
      return backendFallbackResult(readStoredReminderRecords());
    }
  }

  return localResult(readStoredReminderRecords());
}

export async function createPersistedReminder(
  input: ReminderCreateInput,
): Promise<PersistenceResult<ReminderRecord>> {
  if (useBackendPersistence()) {
    try {
      await attachCognitoToken();
      const result = await memoryClient.createReminder(input);

      return backendResult(result.data);
    } catch {
      return backendFallbackResult(createReminderRecord(input));
    }
  }

  return localResult(createReminderRecord(input));
}

export async function updatePersistedReminder(
  reminderId: string,
  input: ReminderUpdateInput,
): Promise<PersistenceResult<ReminderRecord | null>> {
  if (useBackendPersistence()) {
    try {
      await attachCognitoToken();
      const result = await memoryClient.updateReminder(reminderId, input);

      return backendResult(result.data);
    } catch {
      return backendFallbackResult(updateStoredReminderRecord(reminderId, input));
    }
  }

  return localResult(updateStoredReminderRecord(reminderId, input));
}

export async function deletePersistedReminder(
  reminderId: string,
): Promise<PersistenceResult<boolean>> {
  if (useBackendPersistence()) {
    try {
      await attachCognitoToken();
      const result = await memoryClient.deleteReminder(reminderId);

      return backendResult(result.data.deleted);
    } catch {
      return backendFallbackResult(deleteStoredReminderRecord(reminderId));
    }
  }

  return localResult(deleteStoredReminderRecord(reminderId));
}

export async function markPersistedReminderDone(
  reminderId: string,
): Promise<PersistenceResult<ReminderRecord | null>> {
  if (useBackendPersistence()) {
    try {
      await attachCognitoToken();
      const result = await memoryClient.markReminderDone(reminderId);

      return backendResult(result.data);
    } catch {
      return backendFallbackResult(markStoredReminderDone(reminderId));
    }
  }

  return localResult(markStoredReminderDone(reminderId));
}

function localResult<T>(data: T): PersistenceResult<T> {
  return {
    data,
    message: localPersistenceMessage,
    status: "local-dev",
  };
}

function toLocalContractPatch(
  input: ContractRecordCreateInput | ContractRecordUpdateInput,
): Partial<ContractRecord> {
  return {
    actionDraft:
      "actionDraft" in input ? input.actionDraft : undefined,
    category: input.category,
    company: input.company,
    confirmedFacts: input.confirmedFacts,
    cost: input.cost
      ? {
          currency: "EUR",
          ...input.cost,
        }
      : undefined,
    dates: input.dates,
    facts: input.facts,
    identifiers: input.identifiers,
    lifecycleStatus:
      "lifecycleStatus" in input ? input.lifecycleStatus : undefined,
    missingFacts: input.missingFacts,
    name: input.name,
    persistenceStatus:
      "persistenceStatus" in input ? input.persistenceStatus : undefined,
    provider: input.provider,
    source: input.source,
    sourceDocumentId: input.sourceDocumentId,
  };
}

async function attachCognitoToken(): Promise<void> {
  const session = await fetchAuthSession();
  const token =
    session.tokens?.idToken?.toString() ??
    session.tokens?.accessToken?.toString();

  if (!token) {
    throw new Error("No Cognito token found.");
  }

  memoryClient.setAuthToken(token);
}

function backendResult<T>(data: T): PersistenceResult<T> {
  return {
    data,
    message: "Gespeichert.",
    status: "backend-saved",
  };
}

function backendFallbackResult<T>(data: T): PersistenceResult<T> {
  return {
    data,
    message: backendPreparedMessage,
    status: "backend-failed",
  };
}
