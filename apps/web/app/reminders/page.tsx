import type { Metadata } from "next";
import { Bell, CalendarDays, Clock } from "lucide-react";

import { reminderRows } from "../dashboard/dashboard-data";
import {
  DashboardSection,
  LifePilotShell,
  PageHeader,
  ReminderItem,
  SummaryCard,
} from "../dashboard/dashboard-ui";

export const metadata: Metadata = {
  title: "Reminders | Life Pilot",
};

const reminderMetrics = [
  {
    accent: "red",
    icon: Bell,
    label: "Reminders",
    meta: "2 due today",
    value: "5",
    visual: "bell",
  },
  {
    accent: "orange",
    icon: Clock,
    label: "This week",
    meta: "Review window",
    value: "3",
    visual: "chart",
  },
] as const;

export default function RemindersPage() {
  return (
    <LifePilotShell activeItem="Reminders">
      <PageHeader
        eyebrow="Reminders"
        subtitle="A focused agenda for deadlines, renewals and personal follow-ups."
        title="Upcoming reminders"
      />

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        {reminderMetrics.map((card) => (
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
        <DashboardSection title="Today and soon">
          {reminderRows.map((reminder) => (
            <ReminderItem
              day={reminder.day}
              key={reminder.title}
              meta={reminder.meta}
              month={reminder.month}
              title={reminder.title}
            />
          ))}
        </DashboardSection>

        <section className="rounded-[22px] border border-[#ECEFEB] bg-white p-6 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-[#FFF0D6] text-[#F59E0B]">
              <CalendarDays className="size-6" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-[-0.01em] text-[#101828]">
                Guided action
              </h2>
              <p className="mt-1 text-[13px] font-semibold text-[#667085]">
                Future reminders will connect to contracts and documents.
              </p>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {["Confirm renewal date", "Prepare cancellation letter", "Compare better offer"].map(
              (item) => (
                <div
                  className="rounded-[16px] border border-[#ECEFEB] bg-[#FCFBFA] px-4 py-3 text-[14px] font-bold text-[#101828]"
                  key={item}
                >
                  {item}
                </div>
              ),
            )}
          </div>
        </section>
      </section>
    </LifePilotShell>
  );
}
