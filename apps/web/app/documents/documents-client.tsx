"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import {
  AlertTriangle,
  CalendarClock,
  Camera,
  CheckCircle2,
  FileLock2,
  FileText,
  FileUp,
  Info,
  ListChecks,
  Plus,
  ShieldCheck,
  Trash2,
  Upload,
  type LucideIcon,
  X,
} from "lucide-react";
import { createLifePilotClient } from "@lifepilot/api-client";
import type {
  ContractCategory,
  ContractRecord,
  CreateDocumentInput,
  DetectedDeadline,
  DocumentFact,
  DocumentAnalysis,
  Document as LifePilotDocument,
  DocumentCategory,
  DocumentStatus,
  ExtractedDocumentFacts,
  MissingFact,
  Reminder,
  RequestDocumentUploadInput,
  RequiredFactKey,
} from "@lifepilot/shared";

import {
  LifePilotShell,
  PageHeader,
  SummaryCard,
} from "../dashboard/dashboard-ui";
import {
  analyzeDocumentFile,
  readStoredDocumentAnalyses,
  storeDocumentAnalysis,
} from "../../src/services/documents";
import {
  createReminderFromDeadline,
  getDeadlineReminderKey,
  readStoredReminders,
} from "../../src/services/reminders";
import {
  createOrUpdateContractRecord,
  factLabels,
  getMissingRequiredFacts,
  listContractRecords,
  managedPersonProfiles,
  saveExtractedFacts,
} from "../../src/services/knowledge";

const documentClient = createLifePilotClient({
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
  useMockData: process.env.NEXT_PUBLIC_USE_MOCKS !== "false",
});

const categories: Array<{ label: string; value: DocumentCategory | "all" }> = [
  { label: "Alle", value: "all" },
  { label: "Verträge", value: "contracts" },
  { label: "Versicherungen", value: "insurance" },
  { label: "Finanzen", value: "finance" },
  { label: "Identität", value: "identity" },
  { label: "Rechnungen", value: "bills" },
  { label: "Sonstiges", value: "other" },
];

const categoryLabels: Record<DocumentCategory, string> = {
  bills: "Rechnungen",
  contracts: "Verträge",
  finance: "Finanzen",
  identity: "Identität",
  insurance: "Versicherungen",
  other: "Sonstiges",
};

const statusLabels: Record<DocumentStatus, string> = {
  "expiring-soon": "Frist läuft bald ab",
  "linked-to-contract": "Mit Vertrag verknüpft",
  "needs-review": "Zur Prüfung",
  protected: "Geschützt",
};

const uploadStatusLabels: Record<
  NonNullable<LifePilotDocument["uploadStatus"]>,
  string
> = {
  failed: "Fehlgeschlagen",
  "metadata-only": "Nur Metadaten",
  "upload-pending": "Upload ausstehend",
  uploaded: "Hochgeladen",
};

const analysisStatusLabels: Record<DocumentAnalysis["status"], string> = {
  completed: "Analyse abgeschlossen",
  extracting: "Text wird gelesen",
  failed: "Analyse fehlgeschlagen",
  "not-started": "Noch nicht analysiert",
  unsupported: "Noch nicht unterstützt",
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

const emptyForm: CreateDocumentInput = {
  category: "contracts",
  name: "",
  notes: "",
  status: "protected",
};

const allowedFileTypes = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "text/plain",
]);
const maxFileSizeBytes = 5 * 1024 * 1024;

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
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [analyses, setAnalyses] = useState<Record<string, DocumentAnalysis>>(
    {},
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [localDevNotice, setLocalDevNotice] = useState<string | null>(null);
  const [reminderMessage, setReminderMessage] = useState<string | null>(null);
  const [confirmedReminderKeys, setConfirmedReminderKeys] = useState<
    Set<string>
  >(new Set());

  useEffect(() => {
    let isMounted = true;

    const storedAnalyses = readStoredDocumentAnalyses();
    setAnalyses(
      Object.fromEntries(
        storedAnalyses.map((analysis) => [analysis.documentId, analysis]),
      ),
    );
    setConfirmedReminderKeys(createConfirmedReminderKeys(readStoredReminders()));

    async function loadDocuments() {
      await attachCognitoToken();

      const result = await documentClient.listDocuments();

      if (!isMounted) {
        return;
      }

      const loadedDocuments = Array.isArray(result.data) ? result.data : [];

      setDocuments(loadedDocuments);
      setSelectedDocument(loadedDocuments[0] ?? null);
      setLoadError(null);
    }

    loadDocuments().catch((error) => {
      console.error("Failed to load documents", error);
      if (isMounted) {
        setDocuments([]);
        setSelectedDocument(null);
        setLoadError(
          "Dokumente konnten nicht vom Backend geladen werden. Du kannst die lokale Dev-Analyse trotzdem testen.",
        );
      }
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

  const documentsForReview = useMemo(
    () =>
      documents.filter((document) =>
        ["expiring-soon", "needs-review"].includes(document.status),
      ).length +
      Object.values(analyses).filter(
        (analysis) =>
          analysis.status === "unsupported" ||
          analysis.status === "failed" ||
          analysis.detectedDeadlines.length > 0,
      ).length,
    [analyses, documents],
  );

  const documentSummaryCards = [
    {
      accent: "blue",
      icon: FileText,
      label: "Dokumente",
      meta: "Backend oder lokaler Dev-Fallback",
      value: String(documents.length),
      visual: "document",
    },
    {
      accent: "orange",
      icon: AlertTriangle,
      label: "Zur Prüfung",
      meta: "Fristen oder offene Analyse",
      value: String(documentsForReview),
      visual: "bell",
    },
    {
      accent: "green",
      icon: ShieldCheck,
      label: "Lokal analysiert",
      meta: "Browser-Speicher",
      value: String(Object.keys(analyses).length),
      visual: "chart",
    },
    {
      accent: "purple",
      icon: CalendarClock,
      label: "Erinnerungen",
      meta: "Aus Dokumenten bestätigt",
      value: String(confirmedReminderKeys.size),
      visual: "sparkles",
    },
  ] as const;

  const saveDocument = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setUploadError(null);
    setSuccessMessage(null);
    setLocalDevNotice(null);

    if (!form.name.trim()) {
      setUploadError("Bitte gib einen Dokumentnamen ein.");
      return;
    }

    if (!selectedFile) {
      setUploadError("Bitte wähle eine Datei aus.");
      return;
    }

    if (!allowedFileTypes.has(selectedFile.type)) {
      setUploadError("Nur PDF, PNG, JPG/JPEG und TXT werden unterstützt.");
      return;
    }

    if (selectedFile.size > maxFileSizeBytes) {
      setUploadError("Die Datei darf maximal 5 MB groß sein.");
      return;
    }

    setIsUploading(true);

    try {
      await attachCognitoToken();

      const uploadInput: RequestDocumentUploadInput = {
        ...form,
        contentType: selectedFile.type,
        fileName: selectedFile.name,
        name: form.name.trim(),
        notes: form.notes?.trim() || undefined,
        sizeBytes: selectedFile.size,
      };
      const uploadRequest =
        await documentClient.requestDocumentUpload(uploadInput);

      await uploadFileToSignedUrl({
        file: selectedFile,
        uploadHeaders: uploadRequest.data.uploadHeaders,
        uploadUrl: uploadRequest.data.uploadUrl,
      });

      const completedUpload =
        await documentClient.completeDocumentUpload(
          uploadRequest.data.document.id,
        );
      const uploadedDocument = completedUpload.data.document;
      const analysis = await analyzeDocumentFile({
        document: uploadedDocument,
        file: selectedFile,
      });

      storeDocumentAnalysis(analysis);
      if (analysis.extractedFacts) {
        saveExtractedFacts(uploadedDocument.id, analysis.extractedFacts);
      }
      setDocuments((current) => [uploadedDocument, ...current]);
      setSelectedDocument(uploadedDocument);
      setAnalyses((current) => ({
        ...current,
        [uploadedDocument.id]: analysis,
      }));
      setForm(emptyForm);
      setSelectedFile(null);
      setIsUploadOpen(false);
      setSuccessMessage(
        "Dokument wurde hochgeladen und lokal analysiert.",
      );
    } catch (error) {
      console.error("Failed to upload document", error);
      const localDocument = createLocalDevDocument(form, selectedFile);
      const analysis = await analyzeDocumentFile({
        document: localDocument,
        file: selectedFile,
      });

      storeDocumentAnalysis(analysis);
      if (analysis.extractedFacts) {
        saveExtractedFacts(localDocument.id, analysis.extractedFacts);
      }
      setDocuments((current) => [localDocument, ...current]);
      setSelectedDocument(localDocument);
      setAnalyses((current) => ({
        ...current,
        [localDocument.id]: analysis,
      }));
      setForm(emptyForm);
      setSelectedFile(null);
      setIsUploadOpen(false);
      setLocalDevNotice(
        "Lokaler Dev-Fallback aktiv: Datei wurde nicht produktiv gespeichert, aber lokal analysiert.",
      );
    } finally {
      setIsUploading(false);
    }
  };

  const selectDocument = (document: LifePilotDocument) => {
    setSelectedDocument(document);
    setIsMobileDetailOpen(true);
  };

  const createDeadlineReminder = (
    document: LifePilotDocument,
    deadline: DetectedDeadline,
  ) => {
    setReminderMessage(null);

    try {
      createReminderFromDeadline({ deadline, document });
      setConfirmedReminderKeys(createConfirmedReminderKeys(readStoredReminders()));
      setReminderMessage(
        "Erinnerung wurde lokal erstellt und erscheint im Dashboard.",
      );
    } catch {
      setReminderMessage(
        "Für diese Frist fehlt noch ein klares Datum. Bitte prüfe den Text manuell.",
      );
    }
  };

  return (
    <LifePilotShell activeItem="Documents">
      <PageHeader
        eyebrow="Dokumente"
        subtitle="Erfasse Briefe, Verträge, Rechnungen und Unterlagen. LifePilot bereitet Fristen und nächste Schritte vor."
        title="Dokumente erfassen"
      />

      <section className="mt-6 rounded-[20px] border border-[#FDECCB] bg-[#FFF7EA] p-5">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 size-5 shrink-0 text-[#D98806]" />
          <p className="text-[13px] font-semibold leading-6 text-[#667085]">
            Lokaler Dev-Modus: TXT-Analyse und bestätigte Erinnerungen werden
            aktuell im Browser gespeichert. PDF-Texterkennung und Foto/OCR sind
            vorbereitet, aber noch nicht produktiv aktiv.
          </p>
        </div>
      </section>

      <section className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <IntakeOptionCard
          action="Datei auswählen"
          icon={FileUp}
          onClick={() => setIsUploadOpen(true)}
          status="PDF-Texterkennung vorbereitet"
          title="PDF hochladen"
        />
        <IntakeOptionCard
          action="TXT analysieren"
          icon={FileText}
          onClick={() => setIsUploadOpen(true)}
          status="TXT wird lokal gelesen"
          title="TXT hochladen"
        />
        <IntakeOptionCard
          action="Noch nicht aktiv"
          icon={Camera}
          isDisabled
          status="Foto/OCR kommt als nächster Schritt"
          title="Brief fotografieren"
        />
        <IntakeOptionCard
          action="PDF, TXT, PNG, JPG"
          icon={ListChecks}
          isDisabled
          status="Keine echten AI- oder OCR-Aufrufe"
          title="Unterstützte Formate"
        />
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {documentSummaryCards.map((card) => (
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

      {localDevNotice ? (
        <div className="mt-5 flex items-center gap-3 rounded-[18px] border border-[#FDECCB] bg-[#FFF7EA] px-5 py-4 text-[14px] font-bold text-[#D98806]">
          <AlertTriangle className="size-5" aria-hidden="true" />
          {localDevNotice}
        </div>
      ) : null}

      {reminderMessage ? (
        <div className="mt-5 flex items-center gap-3 rounded-[18px] border border-[#DDEFE6] bg-[#F2FAF6] px-5 py-4 text-[14px] font-bold text-[#2FA779]">
          <CheckCircle2 className="size-5" aria-hidden="true" />
          {reminderMessage}
        </div>
      ) : null}

      {loadError ? (
        <div className="mt-5 flex items-center gap-3 rounded-[18px] border border-[#FDECCB] bg-[#FFF7EA] px-5 py-4 text-[14px] font-bold text-[#D98806]">
          <AlertTriangle className="size-5" aria-hidden="true" />
          {loadError}
        </div>
      ) : null}

      <section className="mt-7 grid gap-5 xl:grid-cols-[1fr_390px]">
        <section className="rounded-[22px] border border-[#ECEFEB] bg-white p-5 shadow-card sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-[-0.01em] text-[#101828]">
                Dokumenteingang
              </h2>
              <p className="mt-1 text-[13px] font-semibold text-[#667085]">
                Neue Dokumente werden erfasst, lokal analysiert und für Fristen
                vorbereitet.
              </p>
            </div>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2FA779] px-4 py-3 text-[14px] font-bold text-white shadow-button transition hover:bg-[#258866]"
              onClick={() => setIsUploadOpen(true)}
              type="button"
            >
              <Upload className="size-4" aria-hidden="true" />
              Dokument erfassen
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
            {filteredDocuments.length === 0 ? (
              <div className="rounded-[20px] border border-[#ECEFEB] bg-[#FCFBFA] p-6">
                <p className="text-[15px] font-bold text-[#101828]">
                  Noch keine Dokumente in dieser Ansicht.
                </p>
                <p className="mt-2 text-[13px] font-semibold leading-6 text-[#667085]">
                  Erfasse ein TXT-Dokument, um den aktuellen Analyse- und
                  Reminder-Flow sofort sichtbar zu testen.
                </p>
              </div>
            ) : null}
          </div>
        </section>

        <div className="hidden xl:block">
          <DocumentDetailPanel
            analysis={
              selectedDocument ? analyses[selectedDocument.id] : undefined
            }
            confirmedReminderKeys={confirmedReminderKeys}
            document={selectedDocument}
            onCreateReminder={createDeadlineReminder}
          />
        </div>
      </section>

      {isUploadOpen ? (
        <UploadDialog
          form={form}
          isUploading={isUploading}
          isLocalDevFallback={Boolean(loadError)}
          onChange={setForm}
          onClose={() => {
            if (isUploading) {
              return;
            }

            setIsUploadOpen(false);
            setSelectedFile(null);
            setUploadError(null);
          }}
          onFileChange={setSelectedFile}
          onSubmit={saveDocument}
          selectedFile={selectedFile}
          uploadError={uploadError}
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
              <DocumentDetailPanel
                analysis={analyses[selectedDocument.id]}
                confirmedReminderKeys={confirmedReminderKeys}
                document={selectedDocument}
                onCreateReminder={createDeadlineReminder}
              />
            </div>
          </div>
        </div>
      ) : null}
    </LifePilotShell>
  );
}

function IntakeOptionCard({
  action,
  icon: Icon,
  isDisabled = false,
  onClick,
  status,
  title,
}: {
  action: string;
  icon: LucideIcon;
  isDisabled?: boolean;
  onClick?: () => void;
  status: string;
  title: string;
}) {
  return (
    <button
      className={`rounded-[20px] border p-5 text-left transition ${
        isDisabled
          ? "border-[#ECEFEB] bg-[#FCFBFA] text-[#667085]"
          : "border-[#DDEFE6] bg-white shadow-card hover:border-[#B9DEC7] hover:bg-[#F8FCFA]"
      }`}
      disabled={isDisabled}
      onClick={onClick}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-[#EAF7F0] text-[#2FA779]">
          <Icon className="size-6" aria-hidden="true" />
        </div>
        <span className="rounded-full bg-[#F7F8F5] px-3 py-1 text-[11px] font-bold text-[#667085]">
          {action}
        </span>
      </div>
      <h2 className="mt-5 text-[17px] font-bold text-[#101828]">{title}</h2>
      <p className="mt-2 text-[13px] font-semibold leading-6 text-[#667085]">
        {status}
      </p>
    </button>
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
              Mit Vertrag verknüpft
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-[13px] font-semibold text-[#667085]">
        <span className={`size-2 rounded-full ${status.dot}`} />
        Hinzugefügt am {new Date(document.addedAt).toLocaleDateString("de-DE")}
      </div>
    </button>
  );
}

function DocumentDetailPanel({
  analysis,
  confirmedReminderKeys,
  document,
  onCreateReminder,
}: {
  analysis?: DocumentAnalysis;
  confirmedReminderKeys: Set<string>;
  document: LifePilotDocument | null;
  onCreateReminder: (
    document: LifePilotDocument,
    deadline: DetectedDeadline,
  ) => void;
}) {
  if (!document) {
    return (
      <aside className="rounded-[22px] border border-[#ECEFEB] bg-white p-6 shadow-card">
        <p className="text-[15px] font-bold text-[#101828]">
          Dokument auswählen
        </p>
        <p className="mt-2 text-[13px] font-semibold leading-6 text-[#667085]">
          Wähle ein Dokument, um Metadaten, Textpreview und erkannte Fristen zu sehen.
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
            Dokumentdetails
          </p>
          <h2 className="mt-2 text-xl font-bold tracking-[-0.01em] text-[#101828]">
            {document.name}
          </h2>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <DetailRow label="Kategorie" value={categoryLabels[document.category]} />
        <DetailRow label="Status" value={statusLabels[document.status]} />
        <DetailRow
          label="Erstellt am"
          value={new Date(document.addedAt).toLocaleDateString("de-DE")}
        />
        <DetailRow
          label="Verknüpfter Vertrag"
          value={document.linkedContract ?? "Noch nicht verknüpft"}
        />
        <DetailRow
          label="Upload-Status"
          value={
            uploadStatusLabels[document.uploadStatus ?? "metadata-only"] ??
            "Nur Metadaten"
          }
        />
        <DetailRow
          label="Dateiname"
          value={document.fileName ?? "Keine Datei angehängt"}
        />
        <DetailRow
          label="Dateigröße"
          value={
            typeof document.sizeBytes === "number"
              ? formatFileSize(document.sizeBytes)
              : "Nicht verfügbar"
          }
        />
        <DetailRow
          label="Dateityp"
          value={document.contentType ?? "Nicht verfügbar"}
        />
        <DetailRow
          label="Speicherpfad"
          value={document.s3Key ?? "Nicht verfügbar"}
        />
      </div>

      <DocumentAnalysisPanel
        analysis={analysis}
        confirmedReminderKeys={confirmedReminderKeys}
        document={document}
        onCreateReminder={onCreateReminder}
      />

      <FactReviewPanel analysis={analysis} document={document} />

      <div className="mt-6 rounded-[18px] bg-[#F2FAF6] p-4">
        <div className="flex items-center gap-2 text-[14px] font-bold text-[#2FA779]">
          <ShieldCheck className="size-5" aria-hidden="true" />
          Sicherheitshinweis
        </div>
        <p className="mt-2 text-[13px] font-semibold leading-6 text-[#667085]">
          {document.securityNote}
        </p>
      </div>

      <div className="mt-4 rounded-[18px] bg-[#F8F4FF] p-4">
        <div className="flex items-center gap-2 text-[14px] font-bold text-[#6F54E8]">
          <CalendarClock className="size-5" aria-hidden="true" />
          Empfohlener nächster Schritt
        </div>
        <p className="mt-2 text-[13px] font-semibold leading-6 text-[#667085]">
          {document.recommendedAction}
        </p>
      </div>

      <div className="mt-6 grid gap-3">
        {[
          "Dokument prüfen",
          "Mit Vertrag verknüpfen",
          "In Tresor verschieben",
        ].map(
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
          Demo-Eintrag löschen
        </button>
      </div>
    </aside>
  );
}

function UploadDialog({
  form,
  isLocalDevFallback,
  isUploading,
  onChange,
  onClose,
  onFileChange,
  onSubmit,
  selectedFile,
  uploadError,
}: {
  form: CreateDocumentInput;
  isLocalDevFallback: boolean;
  isUploading: boolean;
  onChange: (form: CreateDocumentInput) => void;
  onClose: () => void;
  onFileChange: (file: File | null) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  selectedFile: File | null;
  uploadError: string | null;
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
              Dokument erfassen
            </h2>
            <p className="mt-2 text-[13px] font-semibold leading-6 text-[#667085]">
              {isLocalDevFallback
                ? "Backend nicht erreichbar: Upload wird lokal als Dev-Fallback analysiert."
                : "Metadaten werden gespeichert; TXT wird lokal analysiert. PDF und Foto/OCR sind vorbereitet."}
            </p>
          </div>
          <button
            aria-label="Close upload dialog"
            className="flex size-10 items-center justify-center rounded-xl bg-[#FCFBFA] text-[#667085]"
            disabled={isUploading}
            onClick={onClose}
            type="button"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {uploadError ? (
            <div className="rounded-[18px] border border-[#FBE3DF] bg-[#FFF3F1] px-4 py-3 text-[13px] font-bold text-[#E14C45]">
              {uploadError}
            </div>
          ) : null}

          <label className="block">
            <span className="text-[13px] font-bold text-[#344054]">
              Dokumentname
            </span>
            <input
              className="mt-2 w-full rounded-xl border border-[#ECEFEB] bg-[#FCFBFA] px-4 py-3 text-[14px] font-semibold text-[#101828] outline-none transition placeholder:text-[#98A2B3] focus:border-[#B9DEC7] focus:bg-white"
              onChange={(event) => updateForm("name", event.target.value)}
              placeholder="z. B. Versicherungsschreiben"
              required
              type="text"
              value={form.name}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-[13px] font-bold text-[#344054]">
                Kategorie
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
              Datei
            </span>
            <input
              accept=".pdf,.png,.jpg,.jpeg,.txt,application/pdf,image/png,image/jpeg,text/plain"
              className="mt-2 w-full rounded-xl border border-dashed border-[#B9DEC7] bg-[#F2FAF6] px-4 py-4 text-[13px] font-bold text-[#344054] file:mr-4 file:rounded-xl file:border-0 file:bg-white file:px-4 file:py-2 file:text-[13px] file:font-bold file:text-[#2FA779]"
              disabled={isUploading}
              onChange={(event) =>
                onFileChange(event.target.files?.[0] ?? null)
              }
              required
              type="file"
            />
            <p className="mt-2 text-[12px] font-semibold leading-5 text-[#667085]">
              TXT wird aktuell lokal gelesen. PDF-Texterkennung ist vorbereitet.
              Foto/OCR kommt als nächster Schritt. Maximale Größe: 5 MB.
            </p>
            {selectedFile ? (
              <div className="mt-3 rounded-[16px] border border-[#DDEFE6] bg-[#F8FCFA] px-4 py-3 text-[13px] font-semibold text-[#344054]">
                {selectedFile.name} · {formatFileSize(selectedFile.size)}
              </div>
            ) : null}
          </label>

          <label className="block">
            <span className="text-[13px] font-bold text-[#344054]">
              Notizen
            </span>
            <textarea
              className="mt-2 min-h-28 w-full rounded-xl border border-[#ECEFEB] bg-[#FCFBFA] px-4 py-3 text-[14px] font-semibold text-[#101828] outline-none transition placeholder:text-[#98A2B3] focus:border-[#B9DEC7] focus:bg-white"
              disabled={isUploading}
              onChange={(event) => updateForm("notes", event.target.value)}
              placeholder="Kurze Notiz..."
              value={form.notes}
            />
          </label>
        </div>

        <button
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2FA779] px-4 py-3 text-[14px] font-bold text-white shadow-button transition hover:bg-[#258866] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isUploading}
          type="submit"
        >
          <Plus className="size-4" aria-hidden="true" />
          {isUploading ? "Wird verarbeitet..." : "Dokument analysieren"}
        </button>
      </form>
    </div>
  );
}

const contractCategoryLabels: Record<ContractCategory, string> = {
  authority: "Behörde",
  banking: "Banking",
  electricity: "Strom",
  gas: "Gas",
  healthcare: "Gesundheit",
  insurance: "Versicherung",
  internet: "Internet",
  loan: "Kredit",
  mobile: "Mobilfunk",
  other: "Sonstiges",
  rent: "Miete",
  subscription: "Abo",
  tax: "Steuer",
};

const reviewFactKeys: RequiredFactKey[] = [
  "provider",
  "category",
  "customerNumber",
  "contractNumber",
  "invoiceNumber",
  "fileNumber",
  "policyNumber",
  "insuranceType",
  "amount",
  "monthlyPrice",
  "monthlyPayment",
  "yearlyEstimate",
  "monthlyRent",
  "paymentInterval",
  "startDate",
  "contractDate",
  "minimumTerm",
  "cancellationPeriod",
  "cancellationDate",
  "dueDate",
  "appointmentDate",
  "requestedAction",
  "relatedPersonProfileId",
];

const verificationLabels: Record<DocumentFact["verificationStatus"], string> = {
  extracted: "erkannt",
  missing: "fehlt",
  "not-applicable": "nicht relevant",
  "user-confirmed": "bestätigt",
  "user-corrected": "korrigiert",
};

function FactReviewPanel({
  analysis,
  document,
}: {
  analysis?: DocumentAnalysis;
  document: LifePilotDocument;
}) {
  const extractedFacts = analysis?.extractedFacts;
  const [edits, setEdits] = useState<Partial<Record<RequiredFactKey, string>>>(
    {},
  );
  const [selectedCategory, setSelectedCategory] =
    useState<ContractCategory>("other");
  const [savedRecord, setSavedRecord] = useState<ContractRecord | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [confirmedKeys, setConfirmedKeys] = useState<Set<RequiredFactKey>>(
    new Set(),
  );

  useEffect(() => {
    if (!extractedFacts) {
      return;
    }

    const nextEdits = Object.fromEntries(
      reviewFactKeys.map((key) => [
        key,
        extractedFacts.facts[key]?.value?.toString() ?? "",
      ]),
    ) as Partial<Record<RequiredFactKey, string>>;
    const category =
      (extractedFacts.facts.category?.value as ContractCategory | undefined) ??
      extractedFacts.category ??
      "other";
    const existingRecord =
      listContractRecords().find(
        (contract) => contract.documentId === document.id,
      ) ?? null;

    setEdits({
      ...nextEdits,
      category,
      relatedPersonProfileId:
        nextEdits.relatedPersonProfileId ?? "profile-me",
    });
    setSelectedCategory(category);
    setSavedRecord(existingRecord);
  }, [document.id, extractedFacts]);

  if (!analysis) {
    return null;
  }

  if (!extractedFacts) {
    return (
      <section className="mt-6 rounded-[18px] border border-[#ECEFEB] bg-white p-4">
        <div className="flex items-center gap-2 text-[14px] font-bold text-[#101828]">
          <FileText className="size-5 text-[#2FA779]" aria-hidden="true" />
          Gefundene Daten prüfen
        </div>
        <p className="mt-2 text-[13px] font-semibold leading-6 text-[#667085]">
          Für dieses Dokument wurden noch keine strukturierten Fakten erkannt.
          TXT-Dateien liefern aktuell die besten lokalen Ergebnisse.
        </p>
      </section>
    );
  }

  if (isDismissed) {
    return (
      <section className="mt-6 rounded-[18px] border border-[#ECEFEB] bg-white p-4">
        <p className="text-[14px] font-bold text-[#101828]">
          Dieses Dokument wurde nicht gespeichert.
        </p>
        <button
          className="mt-3 rounded-xl border border-[#ECEFEB] bg-white px-4 py-2 text-[13px] font-bold text-[#2FA779]"
          onClick={() => setIsDismissed(false)}
          type="button"
        >
          Wieder prüfen
        </button>
      </section>
    );
  }

  const facts = buildReviewFacts({
    edits,
    extractedFacts,
    selectedCategory,
    confirmedKeys,
  });
  const missingFacts = getMissingRequiredFacts(selectedCategory, facts);

  const updateEdit = (key: RequiredFactKey, value: string) => {
    setEdits((current) => ({
      ...current,
      [key]: value,
    }));

    if (key === "category") {
      setSelectedCategory(value as ContractCategory);
    }
  };

  const confirmAllVisibleFacts = () => {
    setConfirmedKeys(
      new Set(
        reviewFactKeys.filter((key) => Boolean(getEditedValue(edits, key))),
      ),
    );
    setMessage("Angaben wurden lokal bestätigt. Speichere sie jetzt als Vertrag oder Vorgang.");
  };

  const saveRecord = (mode: "authority" | "contract") => {
    const category = mode === "authority" ? "authority" : selectedCategory;
    const record = createOrUpdateContractRecord({
      category,
      documentId: document.id,
      facts: buildReviewFacts({
        edits: {
          ...edits,
          category,
        },
        extractedFacts,
        selectedCategory: category,
        confirmedKeys: new Set(reviewFactKeys),
      }),
      name:
        getEditedValue(edits, "provider") ||
        getEditedValue(edits, "authorityName") ||
        document.name,
    });

    saveExtractedFacts(document.id, {
      ...extractedFacts,
      category,
      facts: record.facts,
      updatedAt: new Date().toISOString(),
    });
    setSavedRecord(record);
    setMessage(
      mode === "authority"
        ? "Behördenschreiben wurde lokal als Vorgang gespeichert."
        : "Vertrag wurde lokal im Contract Brain gespeichert.",
    );
  };

  return (
    <section className="mt-6 rounded-[18px] border border-[#DDEFE6] bg-[#F8FCFA] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[14px] font-bold text-[#101828]">
            <FileText className="size-5 text-[#2FA779]" aria-hidden="true" />
            Gefundene Daten prüfen
          </div>
          <p className="mt-2 text-[13px] font-semibold leading-6 text-[#667085]">
            Jede Angabe ist zuerst nur ein Kandidat. Bestätige oder korrigiere
            sie einmal, danach merkt LifePilot sie lokal.
          </p>
        </div>
        {savedRecord ? (
          <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-[#2FA779]">
            Lokal gespeichert
          </span>
        ) : null}
      </div>

      {message ? (
        <div className="mt-4 rounded-[16px] border border-[#DDEFE6] bg-white px-4 py-3 text-[13px] font-bold text-[#2FA779]">
          {message}
        </div>
      ) : null}

      {missingFacts.length > 0 ? (
        <div className="mt-4 rounded-[16px] border border-[#FDECCB] bg-[#FFF7EA] p-4">
          <p className="text-[14px] font-bold text-[#101828]">
            Diese Angaben brauche ich noch, damit LifePilot zuverlässig
            überwachen kann.
          </p>
          <div className="mt-3 grid gap-3">
            {missingFacts.map((missingFact) => (
              <MissingFactInput
                key={missingFact.key}
                missingFact={missingFact}
                onChange={(value) => updateEdit(missingFact.key, value)}
                value={getEditedValue(edits, missingFact.key)}
              />
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3">
        {reviewFactKeys.map((key) => {
          const fact = facts[key];

          return (
            <FactReviewRow
              fact={fact}
              factKey={key}
              key={key}
              onChange={(value) => updateEdit(key, value)}
              selectedCategory={selectedCategory}
              value={getEditedValue(edits, key)}
            />
          );
        })}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          className="rounded-xl bg-[#2FA779] px-4 py-3 text-[13px] font-bold text-white transition hover:bg-[#258866]"
          onClick={confirmAllVisibleFacts}
          type="button"
        >
          Angaben bestätigen
        </button>
        <button
          className="rounded-xl border border-[#FDECCB] bg-white px-4 py-3 text-[13px] font-bold text-[#D98806]"
          onClick={() =>
            setMessage(
              missingFacts.length > 0
                ? "Ergänze nur die kritischen Felder oben. Mehr fragt LifePilot nicht ab."
                : "Keine kritischen Pflichtangaben offen.",
            )
          }
          type="button"
        >
          Fehlende Angaben ergänzen
        </button>
        <button
          className="rounded-xl border border-[#DDEFE6] bg-white px-4 py-3 text-[13px] font-bold text-[#2FA779]"
          onClick={() => saveRecord("contract")}
          type="button"
        >
          Als Vertrag speichern
        </button>
        <button
          className="rounded-xl border border-[#ECEFEB] bg-white px-4 py-3 text-[13px] font-bold text-[#344054]"
          onClick={() => saveRecord("authority")}
          type="button"
        >
          Als Behördenschreiben speichern
        </button>
        <button
          className="rounded-xl bg-[#F7F8F5] px-4 py-3 text-[13px] font-bold text-[#667085] sm:col-span-2"
          onClick={() => setIsDismissed(true)}
          type="button"
        >
          Nicht speichern
        </button>
      </div>
    </section>
  );
}

function MissingFactInput({
  missingFact,
  onChange,
  value,
}: {
  missingFact: MissingFact;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-[13px] font-bold text-[#344054]">
        {missingFact.label}
      </span>
      <input
        className="mt-2 w-full rounded-xl border border-[#FDECCB] bg-white px-4 py-3 text-[14px] font-semibold text-[#101828] outline-none transition focus:border-[#D98806]"
        onChange={(event) => onChange(event.target.value)}
        placeholder="Bitte ergänzen"
        value={value}
      />
    </label>
  );
}

function FactReviewRow({
  fact,
  factKey,
  onChange,
  selectedCategory,
  value,
}: {
  fact?: DocumentFact;
  factKey: RequiredFactKey;
  onChange: (value: string) => void;
  selectedCategory: ContractCategory;
  value: string;
}) {
  const key = fact?.key ?? factKey;
  const status = fact?.verificationStatus ?? "missing";

  return (
    <div className="rounded-[16px] border border-[#ECEFEB] bg-white p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[13px] font-bold text-[#101828]">
            {fact?.label ?? factLabels[key]}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full bg-[#F7F8F5] px-3 py-1 text-[11px] font-bold text-[#667085]">
              {verificationLabels[status]}
            </span>
            {fact ? (
              <span className="rounded-full bg-[#EAF7F0] px-3 py-1 text-[11px] font-bold text-[#2FA779]">
                Sicherheit: {fact.confidence}
              </span>
            ) : null}
          </div>
        </div>
        {key === "category" ? (
          <select
            className="w-full rounded-xl border border-[#ECEFEB] bg-[#FCFBFA] px-4 py-3 text-[13px] font-bold text-[#101828] outline-none lg:w-56"
            onChange={(event) => onChange(event.target.value)}
            value={selectedCategory}
          >
            {Object.entries(contractCategoryLabels).map(([category, label]) => (
              <option key={category} value={category}>
                {label}
              </option>
            ))}
          </select>
        ) : key === "relatedPersonProfileId" ? (
          <select
            className="w-full rounded-xl border border-[#ECEFEB] bg-[#FCFBFA] px-4 py-3 text-[13px] font-bold text-[#101828] outline-none lg:w-56"
            onChange={(event) => onChange(event.target.value)}
            value={value || "profile-me"}
          >
            {managedPersonProfiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            className="w-full rounded-xl border border-[#ECEFEB] bg-[#FCFBFA] px-4 py-3 text-[13px] font-bold text-[#101828] outline-none lg:w-56"
            onChange={(event) => onChange(event.target.value)}
            placeholder="Fehlt"
            value={value}
          />
        )}
      </div>
      {fact?.sourceSnippet ? (
        <p className="mt-3 rounded-[12px] bg-[#FCFBFA] px-3 py-2 text-[12px] font-semibold leading-5 text-[#667085]">
          Quelle: {fact.sourceSnippet}
        </p>
      ) : null}
    </div>
  );
}

function buildReviewFacts({
  confirmedKeys,
  edits,
  extractedFacts,
  selectedCategory,
}: {
  confirmedKeys: Set<RequiredFactKey>;
  edits: Partial<Record<RequiredFactKey, string>>;
  extractedFacts: ExtractedDocumentFacts;
  selectedCategory: ContractCategory;
}): Partial<Record<RequiredFactKey, DocumentFact>> {
  const now = new Date().toISOString();
  const facts: Partial<Record<RequiredFactKey, DocumentFact>> = {
    ...extractedFacts.facts,
  };

  reviewFactKeys.forEach((key) => {
    const value =
      key === "category"
        ? selectedCategory
        : key === "relatedPersonProfileId"
          ? getEditedValue(edits, key) || "profile-me"
          : getEditedValue(edits, key);
    const existingFact = extractedFacts.facts[key];

    if (!value) {
      facts[key] = {
        confidence: "low",
        key,
        label: factLabels[key],
        sourceSnippet: existingFact?.sourceSnippet,
        updatedAt: now,
        verificationStatus: "missing",
      };
      return;
    }

    facts[key] = {
      confidence: confirmedKeys.has(key) || !existingFact ? "high" : existingFact.confidence,
      key,
      label: factLabels[key],
      sourceSnippet: existingFact?.sourceSnippet,
      updatedAt: now,
      value,
      verificationStatus: confirmedKeys.has(key)
        ? "user-confirmed"
        : existingFact?.value && existingFact.value !== value
          ? "user-corrected"
          : existingFact?.verificationStatus ?? "extracted",
    };
  });

  return facts;
}

function getEditedValue(
  edits: Partial<Record<RequiredFactKey, string>>,
  key: RequiredFactKey,
): string {
  return edits[key]?.toString().trim() ?? "";
}

function DocumentAnalysisPanel({
  analysis,
  confirmedReminderKeys,
  document,
  onCreateReminder,
}: {
  analysis?: DocumentAnalysis;
  confirmedReminderKeys: Set<string>;
  document: LifePilotDocument;
  onCreateReminder: (
    document: LifePilotDocument,
    deadline: DetectedDeadline,
  ) => void;
}) {
  if (!analysis) {
    return (
      <section className="mt-6 rounded-[18px] border border-[#EDE5FF] bg-[#F8F4FF] p-4">
        <div className="flex items-center gap-2 text-[14px] font-bold text-[#6F54E8]">
          <CalendarClock className="size-5" aria-hidden="true" />
          Dokumentenanalyse
        </div>
        <p className="mt-2 text-[13px] font-semibold leading-6 text-[#667085]">
          Noch keine Analyse vorhanden. Lade eine TXT-Datei hoch, um Text lokal
          zu lesen und mögliche Fristen zu erkennen.
        </p>
        {document.contentType?.startsWith("image/") ? (
          <p className="mt-2 text-[13px] font-bold text-[#D98806]">
            OCR kommt als nächster Schritt.
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <section className="mt-6 rounded-[18px] border border-[#EDE5FF] bg-[#F8F4FF] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[14px] font-bold text-[#6F54E8]">
          <CalendarClock className="size-5" aria-hidden="true" />
          Dokumentenanalyse
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-[#6F54E8]">
          Lokal/Dev
        </span>
      </div>

      <div className="mt-4 grid gap-3">
        <DetailRow
          label="Analyse-Status"
          value={analysisStatusLabels[analysis.status]}
        />
        <DetailRow
          label="Analysiert am"
          value={
            analysis.analyzedAt
              ? new Date(analysis.analyzedAt).toLocaleString("de-DE")
              : "Noch nicht analysiert"
          }
        />
      </div>

      {analysis.summary ? (
        <p className="mt-4 text-[13px] font-semibold leading-6 text-[#667085]">
          {analysis.summary}
        </p>
      ) : null}

      {analysis.errorMessage ? (
        <div className="mt-4 rounded-[16px] border border-[#FDECCB] bg-[#FFF7EA] px-4 py-3 text-[13px] font-bold text-[#D98806]">
          {analysis.errorMessage}
        </div>
      ) : null}

      <div className="mt-5">
        <h3 className="text-[14px] font-bold text-[#101828]">
          Erkannter Text
        </h3>
        {analysis.extractedText?.text ? (
          <div className="mt-3 max-h-56 overflow-y-auto rounded-[16px] border border-[#ECEFEB] bg-white p-4 text-[13px] font-medium leading-6 text-[#344054]">
            {analysis.extractedText.text.slice(0, 1800)}
            {analysis.extractedText.text.length > 1800 ? " ..." : ""}
          </div>
        ) : (
          <p className="mt-2 rounded-[16px] border border-[#ECEFEB] bg-white px-4 py-3 text-[13px] font-semibold text-[#667085]">
            Für diesen Dateityp ist in Phase 1 noch kein Text verfügbar.
          </p>
        )}
      </div>

      <div className="mt-5">
        <h3 className="text-[14px] font-bold text-[#101828]">
          Erkannte Fristen und Termine
        </h3>
        {analysis.detectedDeadlines.length > 0 ? (
          <div className="mt-3 grid gap-3">
            {analysis.detectedDeadlines.map((deadline) => {
              const reminderKey = getDeadlineReminderKey({
                deadline,
                documentId: document.id,
              });
              const hasReminder = confirmedReminderKeys.has(reminderKey);

              return (
                <article
                  className="rounded-[16px] border border-[#DDEFE6] bg-white p-4"
                  key={`${deadline.kind}-${deadline.dateIso ?? deadline.originalText}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#EAF7F0] px-3 py-1 text-[11px] font-bold text-[#2FA779]">
                      {deadline.label}
                    </span>
                    <span className="rounded-full bg-[#F7F8F5] px-3 py-1 text-[11px] font-bold text-[#667085]">
                      Sicherheit: {deadline.confidence}
                    </span>
                  </div>
                  <p className="mt-3 text-[15px] font-bold text-[#101828]">
                    {deadline.dateIso
                      ? new Date(deadline.dateIso).toLocaleDateString("de-DE")
                      : "Kein eindeutiges Datum"}
                  </p>
                  <p className="mt-2 text-[13px] font-semibold leading-6 text-[#667085]">
                    {deadline.originalText}
                  </p>
                  <button
                    className={`mt-4 inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-[13px] font-bold transition ${
                      hasReminder
                        ? "bg-[#F2FAF6] text-[#2FA779]"
                        : deadline.dateIso
                          ? "bg-[#2FA779] text-white hover:bg-[#258866]"
                          : "bg-[#F7F8F5] text-[#98A2B3]"
                    }`}
                    disabled={hasReminder || !deadline.dateIso}
                    onClick={() => onCreateReminder(document, deadline)}
                    type="button"
                  >
                    {hasReminder
                      ? "Erinnerung erstellt"
                      : deadline.dateIso
                        ? "Erinnerung erstellen"
                        : "Datum erst prüfen"}
                  </button>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="mt-2 rounded-[16px] border border-[#ECEFEB] bg-white px-4 py-3 text-[13px] font-semibold text-[#667085]">
            Keine Fristen erkannt. Bei TXT-Dateien sucht LifePilot nach
            deutschen Datumsformaten und Frist-Kontext.
          </p>
        )}
      </div>
    </section>
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
      <p className="mt-2 break-words text-[14px] font-bold text-[#101828]">
        {value}
      </p>
    </div>
  );
}

async function uploadFileToSignedUrl({
  file,
  uploadHeaders,
  uploadUrl,
}: {
  file: File;
  uploadHeaders: Record<string, string>;
  uploadUrl: string;
}): Promise<void> {
  if (uploadUrl.startsWith("mock://")) {
    return;
  }

  const response = await fetch(uploadUrl, {
    body: file,
    headers: uploadHeaders,
    method: "PUT",
  });

  if (!response.ok) {
    throw new Error(`S3 upload failed: ${response.status}`);
  }
}

function formatFileSize(sizeBytes: number): string {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`;
}

function createLocalDevDocument(
  form: CreateDocumentInput,
  file: File,
): LifePilotDocument {
  const now = new Date().toISOString();
  const documentId = `local-dev-document-${Date.now()}`;

  return {
    addedAt: now,
    category: form.category,
    contentType: file.type || "application/octet-stream",
    fileName: file.name,
    id: documentId,
    name: form.name.trim(),
    notes: form.notes?.trim() || undefined,
    recommendedAction:
      "Prüfe die lokal erkannten Fristen. Für produktive Speicherung ist AWS Deploy erforderlich.",
    s3Key: `local-dev/${documentId}/${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`,
    securityNote:
      "Lokaler Dev-Fallback: Diese Datei wurde nicht produktiv in S3 gespeichert.",
    sizeBytes: file.size,
    status: form.status,
    uploadStatus: "metadata-only",
  };
}

function createConfirmedReminderKeys(reminders: Reminder[]): Set<string> {
  return new Set(
    reminders
      .filter((reminder) => reminder.source === "document-deadline")
      .map((reminder) =>
        getDeadlineReminderKey({
          dateIso: reminder.dueAt.slice(0, 10),
          documentId: reminder.sourceDocumentId,
          originalText: reminder.sourceOriginalText,
        }),
      ),
  );
}
