import type { Metadata } from "next";
import { Bell, ShieldCheck, ToggleLeft, UserRound } from "lucide-react";

import { LifePilotShell, PageHeader } from "../dashboard/dashboard-ui";

export const metadata: Metadata = {
  title: "Settings | Life Pilot",
};

const settings = [
  {
    icon: UserRound,
    label: "Profile",
    text: "Local placeholder for account preferences.",
  },
  {
    icon: Bell,
    label: "Notifications",
    text: "Reminder channels will be configured later.",
  },
  {
    icon: ShieldCheck,
    label: "Privacy",
    text: "Prepared for user-owned data controls.",
  },
] as const;

export default function SettingsPage() {
  return (
    <LifePilotShell activeItem="Settings">
      <PageHeader
        eyebrow="Settings"
        subtitle="Quiet defaults for the future product settings experience."
        title="Preferences"
      />

      <section className="mt-8 grid gap-4 lg:grid-cols-3">
        {settings.map(({ icon: Icon, label, text }) => (
          <article
            className="rounded-[22px] border border-[#ECEFEB] bg-white p-6 shadow-card"
            key={label}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-[#EAF7F0] text-[#2FA779]">
                <Icon className="size-6" aria-hidden="true" />
              </div>
              <ToggleLeft className="size-7 text-[#98A2B3]" aria-hidden="true" />
            </div>
            <h2 className="mt-5 text-xl font-bold tracking-[-0.01em] text-[#101828]">
              {label}
            </h2>
            <p className="mt-2 text-[14px] font-semibold leading-6 text-[#667085]">
              {text}
            </p>
          </article>
        ))}
      </section>
    </LifePilotShell>
  );
}
