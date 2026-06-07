"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  FileLock2,
  FileText,
  Info,
  Pencil,
  Plus,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import { createLifePilotClient } from "@lifepilot/api-client";
import type {
  CreateDocumentInput,
  DetectedDocumentAction,
  DetectedDocumentActionType,
  DocumentAnalysis,
  DocumentBrainResult,
  Document as LifePilotDocument,
  DocumentCategory,
  DocumentStatus,
  RequestDocumentUploadInput,
} from "@lifepilot/shared";

import {
  LifePilotShell,
  PageHeader,
  SummaryCard,
} from "../dashboard/dashboard-ui";
import {
  analyzeDocumentFile,
  type DocumentNameSuggestion,
  readStoredDocumentAnalyses,
  storeDocumentAnalysis,
  suggestDocumentNameFromFile,
  createDeterministicDocumentBrainResult,
  createDocumentBrainInputFromAnalysis,
  createIcsCalendar,
  detectDocumentActions,
  downloadIcsFile,
  formatActionDateTime,
} from "../../src/services/documents";
import { saveExtractedFacts } from "../../src/services/knowledge";
import { LifeBrainPanel } from "./life-brain-panel";

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

type UploadStep = "idle" | "naming" | "uploading" | "analyzing";

interface LastUploadSummary {
  analysis: DocumentAnalysis;
  brain: DocumentBrainResult;
  document: LifePilotDocument;
}

const allowedFileTypes = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "text/plain",
]);
const maxFileSizeBytes = 5 * 1024 * 1024;

const documentActionTypes: DetectedDocumentActionType[] = [
  "appointment",
  "payment_deadline",
  "cancellation_deadline",
  "response_deadline",
  "contract_review",
  "general_reminder",
];

const actionTypeLabels: Record<DetectedDocumentActionType, string> = {
  appointment: "Termin",
  cancellation_deadline: "Kündigungsfrist",
  contract_review: "Vertrag prüfen",
  general_reminder: "Allgemeine Erinnerung",
  payment_deadline: "Zahlungsfrist",
  response_deadline: "Rückmeldefrist",
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
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [suggestedName, setSuggestedName] =
    useState<DocumentNameSuggestion | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState<UploadStep>("idle");
  const [analyses, setAnalyses] = useState<Record<string, DocumentAnalysis>>(
    {},
  );
  const [brains, setBrains] = useState<Record<string, DocumentBrainResult>>({});
  const [lastUploadSummary, setLastUploadSummary] =
    useState<LastUploadSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [localDevNotice, setLocalDevNotice] = useState<string | null>(null);
  const [brainActionMessage, setBrainActionMessage] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let isMounted = true;

    const storedAnalyses = asArray(readStoredDocumentAnalyses());
    const localAnalysisDocuments = createDocumentsFromAnalyses(storedAnalyses);

    setAnalyses(
      Object.fromEntries(
        storedAnalyses.map((analysis) => [analysis.documentId, analysis]),
      ),
    );
    setBrains(
      Object.fromEntries(
        storedAnalyses.map((analysis) => [
          analysis.documentId,
          createDeterministicDocumentBrainResult(
            createDocumentBrainInputFromAnalysis({
              analysis,
              filename: analysis.fileName,
              mimeType: analysis.contentType,
            }),
            "not_configured",
          ),
        ]),
      ),
    );
    setDocuments(localAnalysisDocuments);
    setSelectedDocument(localAnalysisDocuments[0] ?? null);

    async function loadDocuments() {
      if (process.env.NEXT_PUBLIC_USE_MOCKS === "false") {
        await attachCognitoToken();
      }

      const result = await documentClient.listDocuments();

      if (!isMounted) {
        return;
      }

      const loadedDocuments = Array.isArray(result.data) ? result.data : [];

      setDocuments(loadedDocuments);
      setSelectedDocument(loadedDocuments[0] ?? null);
      setLoadError(null);
    }

    loadDocuments().catch(() => {
      if (isMounted) {
        setDocuments((current) =>
          current.length > 0 ? current : localAnalysisDocuments,
        );
        setSelectedDocument((current) => current ?? localAnalysisDocuments[0] ?? null);
        setLoadError(null);
        setLocalDevNotice(
          "Backend-Speicherung vorbereitet, aber aktuell nicht erreichbar. Du kannst lokal weiterarbeiten; Daten werden im Browser gespeichert.",
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
        ? asArray(documents)
        : asArray(documents).filter(
            (document) => document.category === activeCategory,
          ),
    [activeCategory, documents],
  );

  const documentsForReview = useMemo(
    () =>
      asArray(documents).filter((document) =>
        ["expiring-soon", "needs-review"].includes(document.status),
      ).length +
      Object.values(analyses).filter(
        (analysis) =>
          analysis.status === "unsupported" ||
          analysis.status === "failed" ||
          asArray(analysis.detectedDeadlines).length > 0 ||
          asArray(analysis.detectedActions).length > 0,
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
      label: "Smart Brain",
      meta: "Assistenten-Zusammenfassungen",
      value: String(Object.keys(brains).length),
      visual: "sparkles",
    },
  ] as const;

  const handleSelectedFileChange = async (file: File | null) => {
    setSelectedFile(file);
    setSuggestedName(null);
    setUploadError(null);

    if (!file) {
      return;
    }

    if (!allowedFileTypes.has(file.type)) {
      setUploadError("Nur PDF, PNG, JPG/JPEG und TXT werden unterstützt.");
      return;
    }

    if (file.size > maxFileSizeBytes) {
      setUploadError("Die Datei darf maximal 5 MB groß sein.");
      return;
    }

    setUploadStep("naming");

    try {
      setSuggestedName(await suggestDocumentNameFromFile(file));
    } catch {
      setSuggestedName(null);
    } finally {
      setUploadStep("idle");
    }
  };

  const saveDocument = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setUploadError(null);
    setSuccessMessage(null);
    setLocalDevNotice(null);
    setBrainActionMessage(null);
    setLastUploadSummary(null);

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
      setUploadStep("naming");
      const nameSuggestion =
        suggestedName ?? (await suggestDocumentNameFromFile(selectedFile));

      if (process.env.NEXT_PUBLIC_USE_MOCKS === "false") {
        await attachCognitoToken();
      }

      const uploadInput: RequestDocumentUploadInput = {
        autoNamed: true,
        category: nameSuggestion.category,
        contentType: selectedFile.type,
        fileName: selectedFile.name,
        name: nameSuggestion.name,
        namingConfidence: nameSuggestion.confidence,
        notes: form.notes?.trim() || undefined,
        sizeBytes: selectedFile.size,
        status: "needs-review",
      };
      setUploadStep("uploading");
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
      setUploadStep("analyzing");
      const analysis = await analyzeDocumentFile({
        document: uploadedDocument,
        file: selectedFile,
      });
      const brain = await createDocumentBrain(uploadedDocument, analysis);

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
      setBrains((current) => ({
        ...current,
        [uploadedDocument.id]: brain,
      }));
      setLastUploadSummary({
        analysis,
        brain,
        document: uploadedDocument,
      });
      setForm(emptyForm);
      setSelectedFile(null);
      setSuggestedName(null);
      setIsUploadOpen(false);
      setSuccessMessage("Dokument wurde hochgeladen.");
    } catch {
      setUploadStep("naming");
      const nameSuggestion =
        suggestedName ?? (await suggestDocumentNameFromFile(selectedFile));
      const localDocument = createLocalDevDocument({
        file: selectedFile,
        nameSuggestion,
        notes: form.notes,
      });
      setUploadStep("analyzing");
      const analysis = await analyzeDocumentFile({
        document: localDocument,
        file: selectedFile,
      });
      const brain = await createDocumentBrain(localDocument, analysis);

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
      setBrains((current) => ({
        ...current,
        [localDocument.id]: brain,
      }));
      setLastUploadSummary({
        analysis,
        brain,
        document: localDocument,
      });
      setForm(emptyForm);
      setSelectedFile(null);
      setSuggestedName(null);
      setIsUploadOpen(false);
      setLocalDevNotice(
        "Lokaler Entwicklungsmodus: Datei wurde nicht produktiv gespeichert, aber lokal vorbereitet.",
      );
    } finally {
      setIsUploading(false);
      setUploadStep("idle");
    }
  };

  const selectDocument = (document: LifePilotDocument) => {
    setSelectedDocument(document);
    setIsMobileDetailOpen(true);
  };

  const renameDocument = (document: LifePilotDocument, name: string) => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      return;
    }

    const renamedDocument: LifePilotDocument = {
      ...document,
      name: trimmedName,
    };

    setDocuments((current) =>
      current.map((item) =>
        item.id === document.id ? { ...item, name: trimmedName } : item,
      ),
    );
    setSelectedDocument((current) =>
      current?.id === document.id ? renamedDocument : current,
    );
    setLastUploadSummary((current) =>
      current?.document.id === document.id
        ? { ...current, document: renamedDocument }
        : current,
    );

    const analysis = analyses[document.id];

    if (!analysis) {
      return;
    }

    const renamedAnalysis = {
      ...analysis,
      documentName: trimmedName,
    };

    storeDocumentAnalysis(renamedAnalysis);
    setAnalyses((current) => ({
      ...current,
      [document.id]: renamedAnalysis,
    }));
    setBrains((current) => {
      const existingBrain = current[document.id];

      if (!existingBrain) {
        return current;
      }

      return {
        ...current,
        [document.id]: {
          ...existingBrain,
          hiddenDetails: asArray(existingBrain.hiddenDetails).map((detail) =>
            detail.section === "technical" && detail.label === "Datei"
              ? {
                  ...detail,
                  value: [trimmedName, document.contentType]
                    .filter(Boolean)
                    .join(" · "),
                }
              : detail,
          ),
        },
      };
    });
  };

  const prepareBrainAction = (label: string) => {
    setBrainActionMessage(
      `${label} ist vorbereitet. LifePilot speichert noch nichts automatisch; der nächste Schritt braucht deine Bestätigung.`,
    );
  };

  return (
    <LifePilotShell activeItem="Documents">
      <PageHeader
        eyebrow="Dokumente"
        subtitle="Lade Briefe, Verträge, Rechnungen und Unterlagen hoch. LifePilot benennt und prüft sie automatisch."
        title="Dokument hochladen"
      />

      <LifeBrainPanel />

      <section className="mt-6 rounded-[20px] border border-[#FDECCB] bg-[#FFF7EA] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 size-5 shrink-0 text-[#D98806]" />
          <p className="min-w-0 break-words text-[13px] font-semibold leading-6 text-[#667085]">
            Lokaler Entwicklungsmodus: TXT-Analyse und bestätigte Erinnerungen werden
            aktuell im Browser gespeichert. PDF-Analyse und Foto-/Scan-Erkennung sind
            vorbereitet, aber noch nicht produktiv aktiv.
          </p>
        </div>
      </section>

      <section className="mt-7 rounded-[22px] border border-[#DDEFE6] bg-white p-4 shadow-card sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <button
            className="w-full rounded-[20px] border border-dashed border-[#B9DEC7] bg-[#F2FAF6] p-5 text-left transition hover:border-[#2FA779] hover:bg-[#EAF7F0] sm:p-6"
            onClick={() => setIsUploadOpen(true)}
            type="button"
          >
            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[#2FA779]">
                <Upload className="size-6" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h2 className="break-words text-xl font-bold tracking-normal text-[#101828]">
                  Dokument hochladen
                </h2>
                <p className="mt-2 break-words text-[15px] font-bold text-[#2FA779]">
                  Datei auswählen oder hier ablegen
                </p>
                <p className="mt-2 break-words text-[13px] font-semibold leading-6 text-[#667085]">
                  LifePilot benennt und prüft dein Dokument automatisch.
                </p>
              </div>
            </div>
          </button>

          <div className="min-w-0 rounded-[18px] border border-[#ECEFEB] bg-[#FCFBFA] p-4 sm:p-5">
            <p className="break-words text-[14px] font-bold text-[#101828]">
              Unterstützt: PDF, TXT, PNG, JPG
            </p>
            <div className="mt-3 grid gap-2 break-words text-[13px] font-semibold leading-6 text-[#667085]">
              <p>TXT wird lokal analysiert.</p>
              <p>Textbasierte PDFs werden ausgelesen, wenn möglich.</p>
              <p>Fotos und Scans benötigen später OCR.</p>
            </div>
          </div>
        </div>
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
        <div className="mt-5 flex min-w-0 items-start gap-3 rounded-[18px] border border-[#DDEFE6] bg-[#F2FAF6] px-4 py-4 text-[14px] font-bold text-[#2FA779] sm:px-5">
          <CheckCircle2 className="size-5" aria-hidden="true" />
          <span className="min-w-0 break-words">{successMessage}</span>
        </div>
      ) : null}

      {lastUploadSummary ? (
        <PostUploadSummary summary={lastUploadSummary} />
      ) : null}

      {localDevNotice ? (
        <div className="mt-5 flex min-w-0 items-start gap-3 rounded-[18px] border border-[#FDECCB] bg-[#FFF7EA] px-4 py-4 text-[14px] font-bold text-[#D98806] sm:px-5">
          <AlertTriangle className="size-5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 break-words">{localDevNotice}</span>
        </div>
      ) : null}

      {brainActionMessage ? (
        <div className="mt-5 flex min-w-0 items-start gap-3 rounded-[18px] border border-[#DDEFE6] bg-[#F2FAF6] px-4 py-4 text-[14px] font-bold text-[#2FA779] sm:px-5">
          <CheckCircle2 className="size-5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 break-words">{brainActionMessage}</span>
        </div>
      ) : null}

      {loadError ? (
        <div className="mt-5 flex min-w-0 items-start gap-3 rounded-[18px] border border-[#FDECCB] bg-[#FFF7EA] px-4 py-4 text-[14px] font-bold text-[#D98806] sm:px-5">
          <AlertTriangle className="size-5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 break-words">{loadError}</span>
        </div>
      ) : null}

      <section className="mt-7 grid gap-5 xl:grid-cols-[1fr_390px]">
        <section className="min-w-0 rounded-[22px] border border-[#ECEFEB] bg-white p-4 shadow-card sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <h2 className="break-words text-xl font-bold tracking-[-0.01em] text-[#101828]">
                Dokumenteingang
              </h2>
              <p className="mt-1 break-words text-[13px] font-semibold text-[#667085]">
              Neue Dokumente werden hochgeladen, automatisch benannt und für
              die Prüfung vorbereitet.
              </p>
            </div>
            <button
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2FA779] px-4 py-3 text-[14px] font-bold text-white shadow-button transition hover:bg-[#258866] sm:w-auto"
              onClick={() => setIsUploadOpen(true)}
              type="button"
            >
              <Upload className="size-4" aria-hidden="true" />
              Dokument hochladen
            </button>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
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
              <div className="rounded-[20px] border border-[#ECEFEB] bg-[#FCFBFA] p-5 sm:p-6">
                <p className="break-words text-[15px] font-bold text-[#101828]">
                  Noch keine Dokumente in dieser Ansicht.
                </p>
                <p className="mt-2 break-words text-[13px] font-semibold leading-6 text-[#667085]">
                  Lade ein Dokument hoch und LifePilot bereitet den Rest vor.
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
            brain={selectedDocument ? brains[selectedDocument.id] : undefined}
            document={selectedDocument}
            onPrepareAction={prepareBrainAction}
            onRenameDocument={renameDocument}
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
            void handleSelectedFileChange(null);
            setUploadError(null);
          }}
          onFileChange={handleSelectedFileChange}
          onSubmit={saveDocument}
          selectedFile={selectedFile}
          suggestedName={suggestedName}
          uploadStep={uploadStep}
          uploadError={uploadError}
        />
      ) : null}

      {selectedDocument && isMobileDetailOpen ? (
        <div className="fixed inset-0 z-40 bg-[#101828]/25 px-2 pb-2 pt-14 sm:px-3 sm:pb-3 sm:pt-20 xl:hidden">
          <div className="ml-auto flex h-full w-full max-w-lg min-w-0 flex-col rounded-t-[24px] bg-white p-4 shadow-[0_20px_70px_rgba(16,24,40,0.18)] sm:p-5">
            <button
              aria-label="Dokumentdetails schließen"
              className="ml-auto flex size-10 items-center justify-center rounded-xl bg-[#FCFBFA] text-[#667085]"
              onClick={() => setIsMobileDetailOpen(false)}
              type="button"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
            <div className="mt-2 min-w-0 overflow-y-auto overflow-x-hidden">
              <DocumentDetailPanel
                analysis={analyses[selectedDocument.id]}
                brain={brains[selectedDocument.id]}
                document={selectedDocument}
                onPrepareAction={prepareBrainAction}
                onRenameDocument={renameDocument}
              />
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
      className={`w-full min-w-0 rounded-[20px] border p-4 text-left transition sm:p-5 ${
        isSelected
          ? "border-[#B9DEC7] bg-[#F2FAF6]"
          : "border-[#ECEFEB] bg-[#FCFBFA] hover:border-[#D5EBDD] hover:bg-white"
      }`}
      onClick={onSelect}
      type="button"
    >
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[#2F80ED]">
            <FileText className="size-6" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 className="break-words text-[16px] font-bold text-[#101828]">
              {document.name}
            </h3>
            <p className="mt-1 break-words text-[13px] font-semibold text-[#667085]">
              {categoryLabels[document.category]}
            </p>
          </div>
        </div>

        <div className="flex min-w-0 flex-wrap gap-2">
          <StatusBadge status={document.status} />
          {document.linkedContract ? (
            <span className="inline-flex max-w-full items-center gap-2 rounded-full bg-[#F1F6FF] px-3 py-1.5 text-[12px] font-bold text-[#2F80ED]">
              <span className="size-2 shrink-0 rounded-full bg-[#2F80ED]" />
              Mit Vertrag verknüpft
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex min-w-0 items-start gap-2 break-words text-[13px] font-semibold text-[#667085]">
        <span className={`mt-1.5 size-2 shrink-0 rounded-full ${status.dot}`} />
        Hinzugefügt am {new Date(document.addedAt).toLocaleDateString("de-DE")}
      </div>
    </button>
  );
}

function DocumentDetailPanel({
  analysis,
  brain,
  document,
  onPrepareAction,
  onRenameDocument,
}: {
  analysis?: DocumentAnalysis;
  brain?: DocumentBrainResult;
  document: LifePilotDocument | null;
  onPrepareAction: (label: string) => void;
  onRenameDocument: (document: LifePilotDocument, name: string) => void;
}) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    setDraftName(document?.name ?? "");
    setIsEditingName(false);
    setIsDetailsOpen(false);
  }, [document?.id, document?.name]);

  if (!document) {
    return (
      <aside className="min-w-0 rounded-[22px] border border-[#ECEFEB] bg-white p-5 shadow-card sm:p-6">
        <p className="break-words text-[15px] font-bold text-[#101828]">
          Dokument auswählen
        </p>
        <p className="mt-2 break-words text-[13px] font-semibold leading-6 text-[#667085]">
          Wähle ein Dokument, um die Assistenten-Zusammenfassung zu sehen.
        </p>
      </aside>
    );
  }

  const effectiveBrain =
    brain ??
    createDeterministicDocumentBrainResult(
      createDocumentBrainInputFromAnalysis({
        analysis: analysis ?? createEmptyAnalysis(document),
        filename: document.fileName,
        mimeType: document.contentType,
      }),
      "not_configured",
    );

  return (
    <aside className="min-w-0 rounded-[22px] border border-[#ECEFEB] bg-white p-4 shadow-card sm:p-6">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#EAF7F0] text-[#2FA779]">
          <FileLock2 className="size-6" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#2FA779]">
            Dokumentdetails
          </p>
          <h2 className="mt-2 break-words text-xl font-bold tracking-[-0.01em] text-[#101828]">
            {document.name}
          </h2>
          {document.autoNamed ? (
            <p className="mt-2 break-words text-[12px] font-bold text-[#667085]">
              Automatisch benannt · Sicherheit:{" "}
              {document.namingConfidence ?? "low"}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-5 rounded-[18px] border border-[#DDEFE6] bg-[#F8FCFA] p-4">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="break-words text-[13px] font-bold text-[#101828]">
              Vorgeschlagener Name
            </p>
            <p className="mt-1 break-words text-[12px] font-semibold text-[#667085]">
              Du kannst den Namen später ändern.
            </p>
          </div>
          {!isEditingName ? (
            <button
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#DDEFE6] bg-white px-3 py-2 text-[12px] font-bold text-[#2FA779] sm:w-auto"
              onClick={() => setIsEditingName(true)}
              type="button"
            >
              <Pencil className="size-4" aria-hidden="true" />
              Name bearbeiten
            </button>
          ) : null}
        </div>

        {isEditingName ? (
          <div className="mt-4 grid gap-3">
            <input
              className="w-full rounded-xl border border-[#ECEFEB] bg-white px-4 py-3 text-[14px] font-bold text-[#101828] outline-none focus:border-[#B9DEC7]"
              onChange={(event) => setDraftName(event.target.value)}
              value={draftName}
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                className="rounded-xl bg-[#2FA779] px-4 py-3 text-[13px] font-bold text-white"
                onClick={() => {
                  onRenameDocument(document, draftName);
                  setIsEditingName(false);
                }}
                type="button"
              >
                Speichern
              </button>
              <button
                className="rounded-xl border border-[#ECEFEB] bg-white px-4 py-3 text-[13px] font-bold text-[#344054]"
                onClick={() => {
                  setDraftName(document.name);
                  setIsEditingName(false);
                }}
                type="button"
              >
                Abbrechen
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-4 break-words text-[15px] font-bold text-[#101828]">
            {document.name}
          </p>
        )}
      </div>

      <DocumentBrainCard
        brain={effectiveBrain}
        onAction={(label, type) => {
          if (type === "review_details") {
            setIsDetailsOpen(true);
          }

          onPrepareAction(label);
        }}
      />

      <DocumentActionsPanel
        actions={getAnalysisActions(analysis, document)}
        documentName={document.name}
      />

      <details
        className="mt-6 min-w-0 rounded-[18px] border border-[#ECEFEB] bg-[#FCFBFA] p-4"
        open={isDetailsOpen}
        onToggle={(event) =>
          setIsDetailsOpen(event.currentTarget.open)
        }
      >
        <summary className="cursor-pointer break-words text-[14px] font-bold text-[#101828]">
          Weitere Details anzeigen
        </summary>
        <div className="mt-4 grid gap-4">
          <BrainHiddenDetails brain={effectiveBrain} />
          <AnalysisHiddenDetails analysis={analysis} />
          <DocumentTechnicalDetails document={document} />
        </div>
      </details>
    </aside>
  );
}

function DocumentBrainCard({
  brain,
  onAction,
}: {
  brain: DocumentBrainResult;
  onAction: (
    label: string,
    type: DocumentBrainResult["primaryButtons"][number]["type"],
  ) => void;
}) {
  const providerLabel =
    brain.provider === "openai" && brain.providerStatus === "active"
      ? "Smart Brain: KI-Unterstützung aktiv"
      : "Smart Brain: lokale Entscheidungslogik aktiv";

  return (
    <section className="mt-6 min-w-0 rounded-[20px] border border-[#DDEFE6] bg-[#F8FCFA] p-4 sm:p-5">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#2FA779]">
          <ShieldCheck className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#2FA779]">
            Dokumenten-Assistent
          </p>
          <h3 className="mt-2 break-words text-lg font-bold text-[#101828]">
            {brain.title}
          </h3>
          <p className="mt-2 break-words text-[13px] font-semibold leading-6 text-[#667085]">
            {brain.simpleSummary}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        {asArray(brain.importantFindings).slice(0, 3).map((finding) => (
          <div
            className="min-w-0 rounded-[16px] border border-[#ECEFEB] bg-white p-4"
            key={`${finding.label}-${finding.value}`}
          >
            <p className="break-words text-[12px] font-bold uppercase tracking-[0.08em] text-[#98A2B3]">
              {finding.label}
            </p>
            <p className="mt-2 break-words text-[14px] font-bold leading-5 text-[#101828]">
              {finding.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 min-w-0 rounded-[16px] bg-white p-4">
        <p className="break-words text-[12px] font-bold uppercase tracking-[0.08em] text-[#98A2B3]">
          Nächster Schritt
        </p>
        <p className="mt-2 break-words text-[14px] font-bold text-[#101828]">
          {brain.recommendedAction.label}
        </p>
        <p className="mt-1 break-words text-[13px] font-semibold leading-6 text-[#667085]">
          {brain.recommendedAction.explanation}
        </p>
      </div>

      {brain.optionalQuestion ? (
        <label className="mt-5 block rounded-[16px] border border-[#FDECCB] bg-[#FFF7EA] p-4">
          <span className="break-words text-[13px] font-bold text-[#101828]">
            {brain.optionalQuestion.question}
          </span>
          <input
            className="mt-3 w-full rounded-xl border border-[#FDECCB] bg-white px-4 py-3 text-[13px] font-bold text-[#101828] outline-none focus:border-[#D98806]"
            placeholder={brain.optionalQuestion.placeholder ?? "Bitte eintragen"}
          />
        </label>
      ) : null}

      <div className="mt-5 grid gap-3">
        {asArray(brain.primaryButtons).slice(0, 3).map((action) => (
          <button
            className={`rounded-xl px-4 py-3 text-[13px] font-bold transition ${
              action.type === "create_reminder"
                ? "bg-[#2FA779] text-white hover:bg-[#258866]"
                : "border border-[#ECEFEB] bg-white text-[#344054] hover:border-[#D5EBDD] hover:text-[#2FA779]"
            }`}
            key={`${action.type}-${action.label}`}
            onClick={() => onAction(action.label, action.type)}
            type="button"
          >
            {action.label}
          </button>
        ))}
      </div>

      <p className="mt-4 break-words text-[12px] font-bold text-[#667085]">
        {providerLabel}
      </p>
    </section>
  );
}

function DocumentActionsPanel({
  actions,
  documentName,
}: {
  actions: DetectedDocumentAction[];
  documentName: string;
}) {
  return (
    <section className="mt-6 min-w-0 rounded-[20px] border border-[#EDE5FF] bg-[#F8F4FF] p-4 sm:p-5">
      <div>
        <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#6F54E8]">
          Dokument-Hinweise
        </p>
        <h3 className="mt-2 break-words text-lg font-bold text-[#101828]">
          Erkannte Aktionen & Fristen
        </h3>
        <p className="mt-2 break-words text-[13px] font-semibold leading-6 text-[#667085]">
          Bitte prüfen. Erkannte Fristen und Termine sind Vorschläge und müssen bestätigt werden.
        </p>
      </div>

      {asArray(actions).length > 0 ? (
        <div className="mt-5 grid gap-4">
          {asArray(actions).map((action) => (
            <DocumentActionCard
              action={action}
              documentName={documentName}
              key={action.id}
            />
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-[16px] border border-[#ECEFEB] bg-white p-4">
          <p className="break-words text-[13px] font-semibold leading-6 text-[#667085]">
            Keine eindeutige Frist oder kein Termin erkannt. Du kannst manuell eine Erinnerung erstellen.
          </p>
        </div>
      )}
    </section>
  );
}

function DocumentActionCard({
  action,
  documentName,
}: {
  action: DetectedDocumentAction;
  documentName: string;
}) {
  const [title, setTitle] = useState(action.title);
  const [dateIso, setDateIso] = useState(action.dateIso ?? "");
  const [time, setTime] = useState(action.time ?? "");
  const [type, setType] = useState<DetectedDocumentActionType>(action.type);
  const [description, setDescription] = useState(action.description);
  const [sourceSnippet, setSourceSnippet] = useState(action.sourceSnippet);
  const [alarm, setAlarm] = useState("1440");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setTitle(action.title);
    setDateIso(action.dateIso ?? "");
    setTime(action.time ?? "");
    setType(action.type);
    setDescription(action.description);
    setSourceSnippet(action.sourceSnippet);
    setAlarm(action.type === "appointment" ? "60" : "1440");
    setMessage(null);
  }, [action]);

  const createCalendarFile = () => {
    if (!dateIso) {
      setMessage("Bitte prüfe zuerst das Datum.");
      return;
    }

    const icsContent = createIcsCalendar({
      alarmMinutesBefore: alarm === "none" ? undefined : Number(alarm),
      calendarTitle: `LifePilot - ${documentName}`,
      description: `${description}\n\nDokument: ${documentName}\nQuelle: ${sourceSnippet}`,
      startDateIso: dateIso,
      startTime: time || undefined,
      summary: title,
    });

    downloadIcsFile({
      content: icsContent,
      fileName: `${dateIso}-${title}`,
    });
    setMessage("Kalendereintrag wurde als .ics-Datei erstellt.");
  };

  return (
    <article className="min-w-0 rounded-[18px] border border-[#ECEFEB] bg-white p-4">
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="break-words text-[13px] font-bold text-[#6F54E8]">
            {actionTypeLabels[type]}
          </p>
          <p className="mt-1 break-words text-[13px] font-semibold text-[#667085]">
            {formatActionDateTime({
              ...action,
              dateIso: dateIso || undefined,
              time: time || undefined,
              type,
            })}
          </p>
        </div>
        <span className="w-fit rounded-full bg-[#F7F8F5] px-3 py-1 text-[11px] font-bold text-[#667085]">
          Sicherheit: {action.confidence}
        </span>
      </div>

      <div className="mt-4 grid gap-3">
        <label className="block">
          <span className="text-[12px] font-bold text-[#344054]">Titel</span>
          <input
            className="mt-2 w-full rounded-xl border border-[#ECEFEB] bg-[#FCFBFA] px-4 py-3 text-[13px] font-bold text-[#101828] outline-none focus:border-[#B9DEC7]"
            onChange={(event) => setTitle(event.target.value)}
            value={title}
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-[12px] font-bold text-[#344054]">Datum</span>
            <input
              className="mt-2 w-full rounded-xl border border-[#ECEFEB] bg-[#FCFBFA] px-4 py-3 text-[13px] font-bold text-[#101828] outline-none focus:border-[#B9DEC7]"
              onChange={(event) => setDateIso(event.target.value)}
              type="date"
              value={dateIso}
            />
          </label>
          <label className="block">
            <span className="text-[12px] font-bold text-[#344054]">
              Uhrzeit
            </span>
            <input
              className="mt-2 w-full rounded-xl border border-[#ECEFEB] bg-[#FCFBFA] px-4 py-3 text-[13px] font-bold text-[#101828] outline-none focus:border-[#B9DEC7]"
              onChange={(event) => setTime(event.target.value)}
              type="time"
              value={time}
            />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-[12px] font-bold text-[#344054]">
              Erinnerungstyp
            </span>
            <select
              className="mt-2 w-full rounded-xl border border-[#ECEFEB] bg-[#FCFBFA] px-4 py-3 text-[13px] font-bold text-[#101828] outline-none focus:border-[#B9DEC7]"
              onChange={(event) =>
                setType(event.target.value as DetectedDocumentActionType)
              }
              value={type}
            >
              {documentActionTypes.map((actionType) => (
                <option key={actionType} value={actionType}>
                  {actionTypeLabels[actionType]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[12px] font-bold text-[#344054]">
              Kalender-Erinnerung
            </span>
            <select
              className="mt-2 w-full rounded-xl border border-[#ECEFEB] bg-[#FCFBFA] px-4 py-3 text-[13px] font-bold text-[#101828] outline-none focus:border-[#B9DEC7]"
              onChange={(event) => setAlarm(event.target.value)}
              value={alarm}
            >
              <option value="none">Keine</option>
              <option value="30">30 Minuten vorher</option>
              <option value="60">1 Stunde vorher</option>
              <option value="1440">1 Tag vorher</option>
            </select>
          </label>
        </div>

        <label className="block">
          <span className="text-[12px] font-bold text-[#344054]">
            Beschreibung
          </span>
          <textarea
            className="mt-2 min-h-24 w-full rounded-xl border border-[#ECEFEB] bg-[#FCFBFA] px-4 py-3 text-[13px] font-semibold leading-6 text-[#101828] outline-none focus:border-[#B9DEC7]"
            onChange={(event) => setDescription(event.target.value)}
            value={description}
          />
        </label>

        <label className="block">
          <span className="text-[12px] font-bold text-[#344054]">
            Quellstelle
          </span>
          <textarea
            className="mt-2 min-h-20 w-full rounded-xl border border-[#ECEFEB] bg-[#FCFBFA] px-4 py-3 text-[13px] font-semibold leading-6 text-[#101828] outline-none focus:border-[#B9DEC7]"
            onChange={(event) => setSourceSnippet(event.target.value)}
            value={sourceSnippet}
          />
        </label>
      </div>

      {message ? (
        <p className="mt-4 break-words rounded-[14px] bg-[#F2FAF6] px-4 py-3 text-[13px] font-bold text-[#2FA779]">
          {message}
        </p>
      ) : null}

      <button
        className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-[#2FA779] px-4 py-3 text-[13px] font-bold text-white transition hover:bg-[#258866] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={!dateIso}
        onClick={createCalendarFile}
        type="button"
      >
        Kalendereintrag erstellen
      </button>
    </article>
  );
}

function BrainHiddenDetails({ brain }: { brain: DocumentBrainResult }) {
  const sections = [
    { label: "Erkannter Text", section: "raw_text" },
    { label: "Alle gefundenen Daten", section: "all_dates" },
    { label: "Gefundene Fakten", section: "all_facts" },
    { label: "Technische Brain-Details", section: "source_evidence" },
  ] as const;

  return (
    <div className="grid gap-3">
      {sections.map(({ label, section }) => {
        const details = asArray(brain.hiddenDetails).filter(
          (detail) => detail.section === section,
        );

        if (details.length === 0) {
          return null;
        }

        return (
          <details
            className="rounded-[16px] border border-[#ECEFEB] bg-white p-4"
            key={section}
          >
            <summary className="cursor-pointer text-[13px] font-bold text-[#101828]">
              {label}
            </summary>
            <div className="mt-3 grid gap-3">
              {details.map((detail) => (
                <div
                  className="rounded-[14px] bg-[#FCFBFA] px-4 py-3"
                  key={`${detail.label}-${detail.value}`}
                >
                  <p className="text-[12px] font-bold text-[#667085]">
                    {detail.label}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-[13px] font-semibold leading-6 text-[#344054]">
                    {detail.value}
                  </p>
                </div>
              ))}
            </div>
          </details>
        );
      })}
    </div>
  );
}

function AnalysisHiddenDetails({ analysis }: { analysis?: DocumentAnalysis }) {
  if (!analysis) {
    return null;
  }

  return (
    <details className="rounded-[16px] border border-[#ECEFEB] bg-white p-4">
      <summary className="cursor-pointer text-[13px] font-bold text-[#101828]">
        Lokale Analyse
      </summary>
      <div className="mt-3 grid gap-3">
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
        {analysis.summary ? (
          <DetailRow label="Analyse-Hinweis" value={analysis.summary} />
        ) : null}
        {analysis.errorMessage ? (
          <DetailRow label="Analyse-Fehler" value={analysis.errorMessage} />
        ) : null}
      </div>
    </details>
  );
}

function DocumentTechnicalDetails({
  document,
}: {
  document: LifePilotDocument;
}) {
  return (
    <details className="rounded-[16px] border border-[#ECEFEB] bg-white p-4">
      <summary className="cursor-pointer text-[13px] font-bold text-[#101828]">
        Technische Informationen
      </summary>
      <div className="mt-3 grid gap-3">
        <DetailRow label="Kategorie" value={categoryLabels[document.category]} />
        <DetailRow label="Status" value={statusLabels[document.status]} />
        <DetailRow
          label="Erstellt am"
          value={new Date(document.addedAt).toLocaleDateString("de-DE")}
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
        <DetailRow
          label="Sicherheitshinweis"
          value={document.securityNote}
        />
      </div>
    </details>
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
  suggestedName,
  uploadStep,
  uploadError,
}: {
  form: CreateDocumentInput;
  isLocalDevFallback: boolean;
  isUploading: boolean;
  onChange: (form: CreateDocumentInput) => void;
  onClose: () => void;
  onFileChange: (file: File | null) => void | Promise<void>;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  selectedFile: File | null;
  suggestedName: DocumentNameSuggestion | null;
  uploadStep: UploadStep;
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
    <div className="fixed inset-0 z-50 flex items-end bg-[#101828]/25 p-2 sm:items-center sm:justify-center sm:p-3">
      <form
        className="max-h-[calc(100vh-16px)] w-full max-w-lg overflow-y-auto overflow-x-hidden rounded-[24px] bg-white p-4 shadow-[0_20px_70px_rgba(16,24,40,0.18)] sm:max-h-[calc(100vh-40px)] sm:p-6"
        onSubmit={onSubmit}
      >
        <div className="flex min-w-0 items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="break-words text-xl font-bold tracking-[-0.01em] text-[#101828]">
              Dokument hochladen
            </h2>
            <p className="mt-2 break-words text-[13px] font-semibold leading-6 text-[#667085]">
              {isLocalDevFallback
                ? "Lokaler Entwicklungsmodus: LifePilot bereitet dein Dokument im Browser vor."
                : "LifePilot benennt und prüft dein Dokument automatisch."}
            </p>
          </div>
          <button
            aria-label="Upload schließen"
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
            <div className="break-words rounded-[18px] border border-[#FBE3DF] bg-[#FFF3F1] px-4 py-3 text-[13px] font-bold text-[#E14C45]">
              {uploadError}
            </div>
          ) : null}

          <label
            className="block rounded-[20px] border border-dashed border-[#B9DEC7] bg-[#F2FAF6] p-5 text-center"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              void onFileChange(event.dataTransfer.files?.[0] ?? null);
            }}
          >
            <span className="block break-words text-[15px] font-bold text-[#101828]">
              Datei auswählen oder hier ablegen
            </span>
            <span className="mt-2 block break-words text-[13px] font-semibold leading-6 text-[#667085]">
              LifePilot benennt und prüft dein Dokument automatisch.
            </span>
            <input
              accept=".pdf,.png,.jpg,.jpeg,.txt,application/pdf,image/png,image/jpeg,text/plain"
              className="sr-only"
              disabled={isUploading}
              onChange={(event) =>
                void onFileChange(event.target.files?.[0] ?? null)
              }
              required
              type="file"
            />
            <span className="mt-4 inline-flex w-full justify-center rounded-xl bg-white px-4 py-3 text-[13px] font-bold text-[#2FA779] shadow-button sm:w-auto">
              Datei auswählen
            </span>
          </label>

          {selectedFile ? (
            <div className="min-w-0 rounded-[18px] border border-[#DDEFE6] bg-[#F8FCFA] p-4">
              <p className="break-words text-[13px] font-bold text-[#101828]">
                {selectedFile.name} · {formatFileSize(selectedFile.size)}
              </p>
              <p className="mt-2 break-words text-[13px] font-semibold text-[#667085]">
                Vorgeschlagener Name:{" "}
                <span className="font-bold text-[#101828]">
                  {suggestedName?.name ?? "Analyse wird vorbereitet..."}
                </span>
              </p>
              {suggestedName ? (
                <p className="mt-1 break-words text-[12px] font-semibold text-[#667085]">
                  Automatisch benannt · Sicherheit: {suggestedName.confidence}. Name prüfen: Du kannst den Namen später ändern.
                </p>
              ) : null}
            </div>
          ) : null}

          <UploadStepNotice file={selectedFile} uploadStep={uploadStep} />

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
          {isUploading ? "Wird verarbeitet..." : "Dokument hochladen"}
        </button>
      </form>
    </div>
  );
}

function PostUploadSummary({ summary }: { summary: LastUploadSummary }) {
  const { brain } = summary;

  return (
    <section className="mt-5 min-w-0 rounded-[20px] border border-[#DDEFE6] bg-white p-4 shadow-card sm:p-5">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#EAF7F0] text-[#2FA779]">
          <CheckCircle2 className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="break-words text-[15px] font-bold text-[#101828]">
            {brain.title}
          </p>
          <p className="mt-1 break-words text-[13px] font-semibold leading-6 text-[#667085]">
            {brain.simpleSummary}
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {asArray(brain.importantFindings).slice(0, 3).map((finding) => (
          <SummaryPill
            key={`${finding.label}-${finding.value}`}
            label={finding.label}
            value={finding.value}
          />
        ))}
      </div>
      <p className="mt-4 break-words rounded-[16px] bg-[#F8FCFA] px-4 py-3 text-[13px] font-bold text-[#2FA779]">
        Nächster Schritt: {brain.recommendedAction.label}
      </p>
      {brain.optionalQuestion ? (
        <p className="mt-3 break-words rounded-[16px] border border-[#FDECCB] bg-[#FFF7EA] px-4 py-3 text-[13px] font-bold text-[#D98806]">
          {brain.optionalQuestion.question}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {asArray(brain.primaryButtons).slice(0, 3).map((action) => (
          <span
            className="max-w-full break-words rounded-full bg-[#EAF7F0] px-3 py-1.5 text-[12px] font-bold text-[#2FA779]"
            key={`${action.type}-${action.label}`}
          >
            {action.label}
          </span>
        ))}
      </div>
      <DocumentActionsPanel
        actions={getAnalysisActions(summary.analysis, summary.document)}
        documentName={summary.document.name}
      />
    </section>
  );
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[16px] border border-[#ECEFEB] bg-[#FCFBFA] p-4">
      <p className="break-words text-[11px] font-bold uppercase tracking-[0.08em] text-[#98A2B3]">
        {label}
      </p>
      <p className="mt-2 break-words text-[13px] font-bold leading-5 text-[#101828]">
        {value}
      </p>
    </div>
  );
}

function UploadStepNotice({
  file,
  uploadStep,
}: {
  file: File | null;
  uploadStep: UploadStep;
}) {
  if (!file) {
    return null;
  }

  const message =
    uploadStep === "naming"
      ? "Analyse wird vorbereitet..."
    : uploadStep === "uploading"
        ? "Dokument wurde hochgeladen."
    : uploadStep === "analyzing"
          ? file.type === "application/pdf" ||
            file.name.toLowerCase().endsWith(".pdf")
            ? "PDF wird gelesen..."
            : "Analyse läuft im Hintergrund."
          : getAnalysisAvailabilityText(file);

  return (
    <div className="break-words rounded-[18px] border border-[#ECEFEB] bg-[#FCFBFA] px-4 py-3 text-[13px] font-bold text-[#667085]">
      {message}
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

function createLocalDevDocument({
  file,
  nameSuggestion,
  notes,
}: {
  file: File;
  nameSuggestion: DocumentNameSuggestion;
  notes?: string;
}): LifePilotDocument {
  const now = new Date().toISOString();
  const documentId = `local-dev-document-${Date.now()}`;

  return {
    addedAt: now,
    autoNamed: true,
    category: nameSuggestion.category,
    contentType: file.type || "application/octet-stream",
    fileName: file.name,
    id: documentId,
    name: nameSuggestion.name,
    namingConfidence: nameSuggestion.confidence,
    notes: notes?.trim() || undefined,
    recommendedAction:
      "Nächster Schritt: Angaben prüfen.",
    s3Key: `local-dev/${documentId}/${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`,
    securityNote:
      "Lokaler Entwicklungsmodus: Diese Datei wurde nicht produktiv in S3 gespeichert.",
    sizeBytes: file.size,
    status: "needs-review",
    uploadStatus: "metadata-only",
  };
}

async function createDocumentBrain(
  document: LifePilotDocument,
  analysis: DocumentAnalysis,
): Promise<DocumentBrainResult> {
  const input = createDocumentBrainInputFromAnalysis({
    analysis,
    filename: document.fileName,
    mimeType: document.contentType,
  });

  try {
    const response = await fetch("/api/ai/document-brain", {
      body: JSON.stringify(input),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    if (!response.ok) {
      throw new Error("Document Brain route failed");
    }

    return (await response.json()) as DocumentBrainResult;
  } catch {
    return createDeterministicDocumentBrainResult(input, "fallback");
  }
}

function createEmptyAnalysis(document: LifePilotDocument): DocumentAnalysis {
  return {
    analyzedAt: undefined,
    contentType: document.contentType,
    detectedActions: [],
    detectedDeadlines: [],
    documentId: document.id,
    documentName: document.name,
    fileName: document.fileName,
    status: "not-started",
  };
}

function getAnalysisActions(
  analysis: DocumentAnalysis | undefined,
  document: LifePilotDocument,
): DetectedDocumentAction[] {
  if (!analysis) {
    return [];
  }

  if (asArray(analysis.detectedActions).length > 0) {
    return asArray(analysis.detectedActions);
  }

  const fallbackText = [
    analysis.extractedText?.text,
    analysis.fileName,
    document.fileName,
    document.name,
  ]
    .filter(Boolean)
    .join("\n");

  return detectDocumentActions({
    analyzedAt: analysis.analyzedAt,
    documentName: document.name,
    text: fallbackText,
  });
}

function getAnalysisAvailabilityText(file: File): string {
  if (file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt")) {
    return "Textanalyse verfügbar";
  }

  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    return "Textbasierte PDFs werden ausgelesen, wenn möglich.";
  }

  if (file.type.startsWith("image/")) {
    return "Foto-/Scan-Erkennung ist vorbereitet, aber noch nicht aktiv.";
  }

  return "Keine Analyse verfügbar. Du kannst das Dokument trotzdem speichern.";
}

function createDocumentsFromAnalyses(
  analyses: DocumentAnalysis[],
): LifePilotDocument[] {
  return asArray(analyses).map((analysis) => ({
    addedAt: analysis.analyzedAt ?? new Date().toISOString(),
    category: "contracts",
    contentType: analysis.contentType,
    fileName: analysis.fileName,
    id: analysis.documentId,
    name: analysis.documentName ?? "Lokal analysiertes Dokument",
    recommendedAction:
      asArray(analysis.detectedDeadlines).length > 0 ||
      asArray(analysis.detectedActions).length > 0
        ? "Prüfe die erkannten Fristen und erstelle bei Bedarf eine Erinnerung."
        : "Prüfe die lokal erkannte Analyse.",
    securityNote:
      "Lokaler Dev-Modus: Diese Dokumentansicht kommt aus dem Browser-Speicher.",
    status:
      asArray(analysis.detectedDeadlines).length > 0 ||
      asArray(analysis.detectedActions).length > 0
        ? "needs-review"
        : "protected",
    uploadStatus: "metadata-only",
  }));
}

function asArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}
