import type { Metadata } from "next";
import {
  FileLock2,
  KeyRound,
  LockKeyhole,
  RotateCcw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { getMockVaultItems } from "@lifepilot/api-client";
import type { DocumentCategory, VaultItem } from "@lifepilot/shared";

import {
  LifePilotShell,
  PageHeader,
  SummaryCard,
} from "../dashboard/dashboard-ui";

export const metadata: Metadata = {
  title: "Vault | Life Pilot",
};

const vaultCards = [
  {
    accent: "green",
    icon: LockKeyhole,
    label: "Private access",
    meta: "Cognito-ready",
    value: "On",
    visual: "chart",
  },
  {
    accent: "blue",
    icon: KeyRound,
    label: "Encryption ready",
    meta: "S3/KMS planned",
    value: "Ready",
    visual: "document",
  },
  {
    accent: "red",
    icon: Trash2,
    label: "Delete anytime",
    meta: "Required before real data",
    value: "Planned",
    visual: "bell",
  },
  {
    accent: "purple",
    icon: ShieldCheck,
    label: "Demo mode active",
    meta: "No real documents",
    value: "Safe",
    visual: "sparkles",
  },
] as const;

const categoryLabels: Record<DocumentCategory, string> = {
  bills: "Bills",
  contracts: "Contracts",
  finance: "Finance",
  identity: "Identity",
  insurance: "Insurance",
  other: "Other",
};

const securityCards = [
  {
    icon: LockKeyhole,
    title: "Private buckets only",
    text: "Future uploads should use private S3 buckets with no public URLs.",
  },
  {
    icon: KeyRound,
    title: "Signed URL access",
    text: "Temporary signed URLs are planned for controlled document access.",
  },
  {
    icon: RotateCcw,
    title: "User isolation",
    text: "Cognito userId will scope documents to the signed-in user.",
  },
] as const;

export default function VaultPage() {
  const vaultItems = getMockVaultItems();

  return (
    <LifePilotShell activeItem="Vault">
      <PageHeader
        eyebrow="Vault"
        subtitle="A protected place for your most sensitive life documents."
        title="Private Vault"
      />

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {vaultCards.map((card) => (
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
        <article className="rounded-[22px] border border-[#ECEFEB] bg-white p-6 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-[#EAF7F0] text-[#2FA779]">
              <LockKeyhole className="size-6" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-[-0.01em] text-[#101828]">
                Security info
              </h2>
              <p className="mt-1 text-[13px] font-semibold text-[#667085]">
                Vault is currently running in demo mode. Do not upload real
                documents yet.
              </p>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {securityCards.map(({ icon: Icon, text, title }) => (
              <div
                className="rounded-[18px] border border-[#ECEFEB] bg-[#FCFBFA] p-4"
                key={title}
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-[#EAF7F0] text-[#2FA779]">
                    <Icon className="size-5" aria-hidden="true" />
                  </div>
                  <p className="text-[15px] font-bold text-[#101828]">
                    {title}
                  </p>
                </div>
                <p className="mt-3 text-[13px] font-semibold leading-6 text-[#667085]">
                  {text}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[22px] border border-[#ECEFEB] bg-white p-6 shadow-card">
          <h2 className="text-xl font-bold tracking-[-0.01em] text-[#101828]">
            Protected documents
          </h2>
          <p className="mt-1 text-[13px] font-semibold text-[#667085]">
            Demo items only. These prepare the shape of future protected
            metadata.
          </p>
          <div className="mt-5 grid gap-3">
            {vaultItems.map((item) => (
              <VaultDocumentCard item={item} key={item.id} />
            ))}
          </div>
        </article>
      </section>
    </LifePilotShell>
  );
}

function VaultDocumentCard({ item }: { item: VaultItem }) {
  return (
    <article className="rounded-[18px] border border-[#ECEFEB] bg-[#FCFBFA] p-4 transition hover:border-[#D5EBDD] hover:bg-white">
      <div className="flex items-start gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[#2FA779]">
          <FileLock2 className="size-6" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-[16px] font-bold text-[#101828]">
                {item.name}
              </h3>
              <p className="mt-1 text-[13px] font-semibold text-[#667085]">
                {categoryLabels[item.category]}
              </p>
            </div>
            <span className="w-fit rounded-full bg-[#EAF7F0] px-3 py-1.5 text-[12px] font-bold text-[#2FA779]">
              {item.securityLevel === "encryption-ready"
                ? "Encryption ready"
                : "Demo protected"}
            </span>
          </div>
          <p className="mt-3 text-[13px] font-semibold text-[#667085]">
            Protected {new Date(item.protectedAt).toLocaleDateString("en-US")}
          </p>
        </div>
      </div>
    </article>
  );
}
