import type { Metadata } from "next";
import { FileLock2, KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";

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
    icon: ShieldCheck,
    label: "Protected items",
    meta: "Mock vault",
    value: "8",
    visual: "chart",
  },
  {
    accent: "blue",
    icon: FileLock2,
    label: "Documents",
    meta: "Prepared for S3",
    value: "4",
    visual: "document",
  },
] as const;

const vaultItems = [
  "Insurance policies",
  "Identity documents",
  "Tax records",
  "Estate planning",
] as const;

export default function VaultPage() {
  return (
    <LifePilotShell activeItem="Vault">
      <PageHeader
        eyebrow="Vault"
        subtitle="A private space prepared for sensitive documents and future encrypted storage."
        title="Secure life vault"
      />

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
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
                Privacy first
              </h2>
              <p className="mt-1 text-[13px] font-semibold text-[#667085]">
                No real documents are stored in this phase.
              </p>
            </div>
          </div>
          <div className="mt-6 rounded-[18px] bg-[#F2FAF6] p-5">
            <KeyRound className="size-8 text-[#2FA779]" aria-hidden="true" />
            <p className="mt-4 text-[15px] font-bold text-[#101828]">
              Future encryption boundary
            </p>
            <p className="mt-2 text-[13px] font-semibold leading-6 text-[#667085]">
              This workspace is ready for a later Cognito, S3 and policy layer.
            </p>
          </div>
        </article>

        <article className="rounded-[22px] border border-[#ECEFEB] bg-white p-6 shadow-card">
          <h2 className="text-xl font-bold tracking-[-0.01em] text-[#101828]">
            Vault categories
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {vaultItems.map((item) => (
              <div
                className="rounded-[16px] border border-[#ECEFEB] bg-[#FCFBFA] p-4"
                key={item}
              >
                <p className="text-[15px] font-bold text-[#101828]">{item}</p>
                <p className="mt-2 text-[13px] font-semibold text-[#667085]">
                  Local mock category
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </LifePilotShell>
  );
}
