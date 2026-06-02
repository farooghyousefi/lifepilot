import type { Metadata } from "next";
import { FileText, FolderOpen, ShieldCheck, Upload } from "lucide-react";

import { documentRows } from "../dashboard/dashboard-data";
import {
  DashboardSection,
  DocumentItem,
  LifePilotShell,
  PageHeader,
  SummaryCard,
  type Accent,
} from "../dashboard/dashboard-ui";

export const metadata: Metadata = {
  title: "Documents | Life Pilot",
};

const documentMetrics = [
  {
    accent: "blue",
    icon: FileText,
    label: "Documents",
    meta: "3 added this week",
    value: "12",
    visual: "document",
  },
  {
    accent: "green",
    icon: ShieldCheck,
    label: "Protected",
    meta: "Mock vault ready",
    value: "8",
    visual: "chart",
  },
] as const;

export default function DocumentsPage() {
  return (
    <LifePilotShell activeItem="Documents">
      <PageHeader
        eyebrow="Documents"
        subtitle="Collect important files in one quiet workspace before the real vault backend is connected."
        title="Document overview"
      />

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        {documentMetrics.map((card) => (
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
        <DashboardSection title="Recent documents">
          {documentRows.map((document) => (
            <DocumentItem
              accent={document.accent as Accent}
              key={document.title}
              meta={document.meta}
              title={document.title}
            />
          ))}
        </DashboardSection>

        <section className="rounded-[22px] border border-[#ECEFEB] bg-white p-6 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-[#EAF7F0] text-[#2FA779]">
              <Upload className="size-6" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-[-0.01em] text-[#101828]">
                Upload preparation
              </h2>
              <p className="mt-1 text-[13px] font-semibold text-[#667085]">
                Local mock only, no files are sent anywhere.
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-[18px] border border-dashed border-[#CFE5D7] bg-[#F2FAF6] p-6 text-center">
            <FolderOpen
              className="mx-auto size-9 text-[#2FA779]"
              aria-hidden="true"
            />
            <p className="mt-4 text-[15px] font-bold text-[#101828]">
              Dropzone placeholder
            </p>
            <p className="mt-2 text-[13px] font-semibold leading-6 text-[#667085]">
              The UI is ready for a future S3-backed upload flow.
            </p>
          </div>
        </section>
      </section>
    </LifePilotShell>
  );
}
