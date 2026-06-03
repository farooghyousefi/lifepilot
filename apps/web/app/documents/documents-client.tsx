"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  FileLock2,
  FileText,
  Link2,
  Plus,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { createLifePilotClient } from "@lifepilot/api-client";
import type {
  CreateDocumentInput,
  Document as LifePilotDocument,
  DocumentCategory,
  DocumentStatus,
} from "@lifepilot/shared";

import {
  LifePilotShell,
  PageHeader,
  SummaryCard,
} from "../dashboard/dashboard-ui";

const documentClient = createLifePilotClient({
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
  useMockData: process.env.NEXT_PUBLIC_USE_MOCKS !== "false",
});

const categories: Array<{ label: string; value: DocumentCategory | "all" }> = [
  { label: "All", value: "all" },
  { label: "Contracts", value: "contracts" },
  { label: "Insurance", value: "insurance" },
  { label: "Finance", value: "finance" },
  { label: "Identity", value: "identity" },
  { label: "Bills", value: "bills" },
  { label: "Other", value: "other" },
];

const categoryLabels: Record<DocumentCategory, string> = {
  bills: "Bills",
  contracts: "Contracts",
  finance: "Finance",
  identity: "Identity",
  insurance: "Insurance",
  other: "Other",
};

const statusLabels: Record<DocumentStatus, string> = {
  "expiring-soon": "Expiring soon",
  "linked-to-contract": "Linked to contract",
  "needs-review": "Needs review",
  protected: "Protected",
};

const statusStyles: Record<
  DocumentStatus,
  {
    bg: string;
    dot: string;
    text: string;
  }
> = {
  "expiring-soon": {
    bg: "bg-[#FFF7EA]",
    dot: "bg-[#F59E0B]",
    text: "text-[#D98806]",
  },
  "linked-to-contract": {
    bg: "bg-[#F1F6FF]",
    dot: "bg-[#2F80ED]",
    text: "text-[#2F80ED]",
  },
  "needs-review": {
    bg: "bg-[#FFF3F1]",
    dot: "bg-[#FF5E57]",
    text: "text-[#E14C45]",
  },
  protected: {
    bg: "bg-[#F2FAF6]",
    dot: "bg-[#35B984]",
    text: "text-[#2FA779]",
  },
};

const summaryCards = [
  {
    accent: "blue",
    icon: FileText,
    label: "Total documents",
    meta: "Demo library",
    value: "18",
    visual: "document",
  },
  {
    accent: "red",
    icon: AlertTriangle,
    label: "Needs review",
    meta: "Action recommended",
    value: "4",
    visual: "bell",
  },
  {
    accent: "green",
    icon: ShieldCheck,
    label: "Protected",
    meta: "Vault ready",
    value: "9",
    visual: "chart",
  },
  {
    accent: "purple",
    icon: Link2,
    label: "Linked to contracts",
    meta: "Connected records",
    value: "6",
    visual: "sparkles",
  },
] as const;

const emptyForm: CreateDocumentInput = {
  category: "contracts",
  name: "",
  notes: "",
  status: "protected",
};
async function attachCognitoToken() {
  const session = await fetchAuthSession();

  const token =
    session.tokens?.idToken?.toString() ??
    session.tokens?.accessToken?.toString();

  if (!token) {
    throw new Error("No Cognito token found. Please sign in again.");
  }

  documentClient.setAuthToken(token);
}
export function DocumentsClient() {
  const [documents, setDocuments] = useState<LifePilotDocument[]>([]);
  const [selectedDocument, setSelectedDocument] =
    useState<LifePilotDocument | null>(null);
  const [activeCategory, setActiveCategory] = useState<
    DocumentCategory | "all"
  >("all");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);
  const [form, setForm] = useState<CreateDocumentInput>(emptyForm);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
  let isMounted = true;

  async function loadDocuments() {
    await attachCognitoToken();

    const result = await documentClient.listDocuments();

    if (!isMounted) {
      return;
    }

    const loadedDocuments = Array.isArray(result.data) ? result.data : [];

    setDocuments(loadedDocuments);
    setSelectedDocument(loadedDocuments[0] ?? null);
  }

  loadDocuments().catch((error) => {
    console.error("Failed to load documents", error);
  });

  return () => {
    isMounted = false;
  };
}, []);

  const filteredDocuments = useMemo(
    () =>
      activeCategory === "all"
        ? documents
        : documents.filter((document) => document.category === activeCategory),
    [activeCategory, documents],
  );

  const saveDemoDocument = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.name.trim()) {
      return;
    }
    await attachCognitoToken();
    const result = await documentClient.createDocument({
      ...form,
      name: form.name.trim(),
      notes: form.notes?.trim() || undefined,
    });

    setDocuments((current) => [result.data, ...current]);
    setSelectedDocument(result.data);
    setForm(emptyForm);
    setIsUploadOpen(false);
    setSuccessMessage("Document added in demo mode. No real data was stored.");
  };

  const selectDocument = (document: LifePilotDocument) => {
    setSelectedDocument(document);
    setIsMobileDetailOpen(true);
  };

  return (
    <LifePilotShell activeItem="Documents">
      <PageHeader
        eyebrow="Documents"
        subtitle="Organize your important documents, contracts and personal records."
        title="Documents"
      />

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

      {successMessage ? (
        <div className="mt-5 flex items-center gap-3 rounded-[18px] border border-[#DDEFE6] bg-[#F2FAF6] px-5 py-4 text-[14px] font-bold text-[#2FA779]">
          <CheckCircle2 className="size-5" aria-hidden="true" />
          {successMessage}
        </div>
      ) : null}

      <section className="mt-7 grid gap-5 xl:grid-cols-[1fr_390px]">
        <section className="rounded-[22px] border border-[#ECEFEB] bg-white p-5 shadow-card sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-[-0.01em] text-[#101828]">
                Document library
              </h2>
              <p className="mt-1 text-[13px] font-semibold text-[#667085]">
                Demo records only. No real files are uploaded or stored.
              </p>
            </div>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2FA779] px-4 py-3 text-[14px] font-bold text-white shadow-button transition hover:bg-[#258866]"
              onClick={() => setIsUploadOpen(true)}
              type="button"
            >
              <Upload className="size-4" aria-hidden="true" />
              Upload document
            </button>
          </div>

          <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
            {categories.map((category) => {
              const isActive = category.value === activeCategory;

              return (
                <button
                  className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-bold transition ${
                    isActive
                      ? "bg-[#EAF7F0] text-[#2FA779]"
                      : "bg-[#FCFBFA] text-[#667085] hover:text-[#101828]"
                  }`}
                  key={category.value}
                  onClick={() => setActiveCategory(category.value)}
                  type="button"
                >
                  {category.label}
                </button>
              );
            })}
          </div>

          <div className="mt-5 grid gap-4">
            {filteredDocuments.map((document) => (
              <DocumentCard
                document={document}
                isSelected={document.id === selectedDocument?.id}
                key={document.id}
                onSelect={() => selectDocument(document)}
              />
            ))}
          </div>
        </section>

        <div className="hidden xl:block">
          <DocumentDetailPanel document={selectedDocument} />
        </div>
      </section>

      {isUploadOpen ? (
        <UploadDialog
          form={form}
          onChange={setForm}
          onClose={() => setIsUploadOpen(false)}
          onSubmit={saveDemoDocument}
        />
      ) : null}

      {selectedDocument && isMobileDetailOpen ? (
        <div className="fixed inset-0 z-40 bg-[#101828]/25 px-3 pb-3 pt-20 xl:hidden">
          <div className="ml-auto flex h-full max-w-lg flex-col rounded-t-[24px] bg-white p-5 shadow-[0_20px_70px_rgba(16,24,40,0.18)]">
            <button
              aria-label="Close document details"
              className="ml-auto flex size-10 items-center justify-center rounded-xl bg-[#FCFBFA] text-[#667085]"
              onClick={() => setIsMobileDetailOpen(false)}
              type="button"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
            <div className="mt-2 overflow-y-auto">
              <DocumentDetailPanel document={selectedDocument} />
            </div>
          </div>
        </div>
      ) : null}
    </LifePilotShell>
  );
}

function DocumentCard({
  document,
  isSelected,
  onSelect,
}: {
  document: LifePilotDocument;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const status = statusStyles[document.status];

  return (
    <button
      className={`rounded-[20px] border p-5 text-left transition ${
        isSelected
          ? "border-[#B9DEC7] bg-[#F2FAF6]"
          : "border-[#ECEFEB] bg-[#FCFBFA] hover:border-[#D5EBDD] hover:bg-white"
      }`}
      onClick={onSelect}
      type="button"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[#2F80ED]">
            <FileText className="size-6" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 className="text-[16px] font-bold text-[#101828]">
              {document.name}
            </h3>
            <p className="mt-1 text-[13px] font-semibold text-[#667085]">
              {categoryLabels[document.category]}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <StatusBadge status={document.status} />
          {document.linkedContract ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-[#F1F6FF] px-3 py-1.5 text-[12px] font-bold text-[#2F80ED]">
              <span className="size-2 rounded-full bg-[#2F80ED]" />
              Linked to contract
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-[13px] font-semibold text-[#667085]">
        <span className={`size-2 rounded-full ${status.dot}`} />
        Added {new Date(document.addedAt).toLocaleDateString("en-US")}
      </div>
    </button>
  );
}

function DocumentDetailPanel({
  document,
}: {
  document: LifePilotDocument | null;
}) {
  if (!document) {
    return (
      <aside className="rounded-[22px] border border-[#ECEFEB] bg-white p-6 shadow-card">
        <p className="text-[15px] font-bold text-[#101828]">
          Select a document
        </p>
        <p className="mt-2 text-[13px] font-semibold leading-6 text-[#667085]">
          Document details will appear here in demo mode.
        </p>
      </aside>
    );
  }

  return (
    <aside className="rounded-[22px] border border-[#ECEFEB] bg-white p-6 shadow-card">
      <div className="flex items-start gap-3">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-[#EAF7F0] text-[#2FA779]">
          <FileLock2 className="size-6" aria-hidden="true" />
        </div>
        <div>
          <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#2FA779]">
            Document details
          </p>
          <h2 className="mt-2 text-xl font-bold tracking-[-0.01em] text-[#101828]">
            {document.name}
          </h2>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <DetailRow label="Category" value={categoryLabels[document.category]} />
        <DetailRow label="Status" value={statusLabels[document.status]} />
        <DetailRow
          label="Added date"
          value={new Date(document.addedAt).toLocaleDateString("en-US")}
        />
        <DetailRow
          label="Linked contract"
          value={document.linkedContract ?? "Not linked yet"}
        />
      </div>

      <div className="mt-6 rounded-[18px] bg-[#F2FAF6] p-4">
        <div className="flex items-center gap-2 text-[14px] font-bold text-[#2FA779]">
          <ShieldCheck className="size-5" aria-hidden="true" />
          Security note
        </div>
        <p className="mt-2 text-[13px] font-semibold leading-6 text-[#667085]">
          {document.securityNote}
        </p>
      </div>

      <div className="mt-4 rounded-[18px] bg-[#F8F4FF] p-4">
        <div className="flex items-center gap-2 text-[14px] font-bold text-[#6F54E8]">
          <CalendarClock className="size-5" aria-hidden="true" />
          Recommended action
        </div>
        <p className="mt-2 text-[13px] font-semibold leading-6 text-[#667085]">
          {document.recommendedAction}
        </p>
      </div>

      <div className="mt-6 grid gap-3">
        {["Review document", "Link to contract", "Move to vault"].map(
          (label) => (
            <button
              className="rounded-xl border border-[#ECEFEB] bg-white px-4 py-3 text-[13px] font-bold text-[#344054] shadow-button transition hover:border-[#D5EBDD] hover:text-[#2FA779]"
              key={label}
              type="button"
            >
              {label}
            </button>
          ),
        )}
        <button
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FFF3F1] px-4 py-3 text-[13px] font-bold text-[#E14C45]"
          type="button"
        >
          <Trash2 className="size-4" aria-hidden="true" />
          Delete demo item
        </button>
      </div>
    </aside>
  );
}

function UploadDialog({
  form,
  onChange,
  onClose,
  onSubmit,
}: {
  form: CreateDocumentInput;
  onChange: (form: CreateDocumentInput) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const updateForm = <Key extends keyof CreateDocumentInput>(
    key: Key,
    value: CreateDocumentInput[Key],
  ) => {
    onChange({
      ...form,
      [key]: value,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-[#101828]/25 p-3 sm:items-center sm:justify-center">
      <form
        className="w-full max-w-lg rounded-[24px] bg-white p-6 shadow-[0_20px_70px_rgba(16,24,40,0.18)]"
        onSubmit={onSubmit}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-[-0.01em] text-[#101828]">
              Upload document
            </h2>
            <p className="mt-2 text-[13px] font-semibold leading-6 text-[#667085]">
              Demo mode: no real file will be uploaded.
            </p>
          </div>
          <button
            aria-label="Close upload dialog"
            className="flex size-10 items-center justify-center rounded-xl bg-[#FCFBFA] text-[#667085]"
            onClick={onClose}
            type="button"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="text-[13px] font-bold text-[#344054]">
              Document name
            </span>
            <input
              className="mt-2 w-full rounded-xl border border-[#ECEFEB] bg-[#FCFBFA] px-4 py-3 text-[14px] font-semibold text-[#101828] outline-none transition placeholder:text-[#98A2B3] focus:border-[#B9DEC7] focus:bg-white"
              onChange={(event) => updateForm("name", event.target.value)}
              placeholder="e.g. Demo insurance policy"
              required
              type="text"
              value={form.name}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-[13px] font-bold text-[#344054]">
                Category
              </span>
              <select
                className="mt-2 w-full rounded-xl border border-[#ECEFEB] bg-[#FCFBFA] px-4 py-3 text-[14px] font-semibold text-[#101828] outline-none transition focus:border-[#B9DEC7] focus:bg-white"
                onChange={(event) =>
                  updateForm("category", event.target.value as DocumentCategory)
                }
                value={form.category}
              >
                {categories
                  .filter((category) => category.value !== "all")
                  .map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
              </select>
            </label>

            <label className="block">
              <span className="text-[13px] font-bold text-[#344054]">
                Status
              </span>
              <select
                className="mt-2 w-full rounded-xl border border-[#ECEFEB] bg-[#FCFBFA] px-4 py-3 text-[14px] font-semibold text-[#101828] outline-none transition focus:border-[#B9DEC7] focus:bg-white"
                onChange={(event) =>
                  updateForm("status", event.target.value as DocumentStatus)
                }
                value={form.status}
              >
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-[13px] font-bold text-[#344054]">
              Notes
            </span>
            <textarea
              className="mt-2 min-h-28 w-full rounded-xl border border-[#ECEFEB] bg-[#FCFBFA] px-4 py-3 text-[14px] font-semibold text-[#101828] outline-none transition placeholder:text-[#98A2B3] focus:border-[#B9DEC7] focus:bg-white"
              onChange={(event) => updateForm("notes", event.target.value)}
              placeholder="Short demo note..."
              value={form.notes}
            />
          </label>
        </div>

        <button
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2FA779] px-4 py-3 text-[14px] font-bold text-white shadow-button transition hover:bg-[#258866]"
          type="submit"
        >
          <Plus className="size-4" aria-hidden="true" />
          Save demo document
        </button>
      </form>
    </div>
  );
}

function StatusBadge({ status }: { status: DocumentStatus }) {
  const styles = statusStyles[status];

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-bold ${styles.bg} ${styles.text}`}
    >
      <span className={`size-2 rounded-full ${styles.dot}`} />
      {statusLabels[status]}
    </span>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] border border-[#ECEFEB] bg-[#FCFBFA] p-4">
      <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#98A2B3]">
        {label}
      </p>
      <p className="mt-2 text-[14px] font-bold text-[#101828]">{value}</p>
    </div>
  );
}
