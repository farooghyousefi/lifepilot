import type { Metadata } from "next";
import { BookOpen, BriefcaseBusiness, Heart, Plus, ShieldCheck } from "lucide-react";

import { goalRows, insightRows } from "../dashboard/dashboard-data";
import {
  DashboardSection,
  GoalItem,
  InsightStripCard,
  LifePilotShell,
  PageHeader,
  type Accent,
} from "../dashboard/dashboard-ui";

export const metadata: Metadata = {
  title: "Goals | Life Pilot",
};

const focusAreas = [
  {
    accent: "green",
    icon: Heart,
    label: "Health",
    text: "Keep routines simple and visible.",
  },
  {
    accent: "blue",
    icon: BriefcaseBusiness,
    label: "Career",
    text: "Track progress toward the next milestone.",
  },
  {
    accent: "green",
    icon: ShieldCheck,
    label: "Security",
    text: "Build a more resilient financial setup.",
  },
  {
    accent: "purple",
    icon: BookOpen,
    label: "Growth",
    text: "Reserve time for learning and reflection.",
  },
] as const;

export default function GoalsPage() {
  return (
    <LifePilotShell activeItem="Goals">
      <PageHeader
        eyebrow="Goals"
        subtitle="A calm view of the personal priorities Life Pilot will help you maintain."
        title="Your progress areas"
      />

      <section className="mt-8 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <DashboardSection title="Goals">
          {goalRows.map((goal) => (
            <GoalItem
              accent={goal.accent}
              icon={goal.icon}
              key={goal.title}
              progress={goal.progress}
              title={goal.title}
            />
          ))}
        </DashboardSection>

        <section className="rounded-[22px] border border-[#ECEFEB] bg-white p-6 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-[-0.01em] text-[#101828]">
              Next focus
            </h2>
            <button
              className="inline-flex items-center gap-2 rounded-xl bg-[#2FA779] px-4 py-2 text-sm font-bold text-white shadow-button transition hover:bg-[#258866]"
              type="button"
            >
              <Plus className="size-4" aria-hidden="true" />
              Add goal
            </button>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {focusAreas.map(({ accent, icon: Icon, label, text }) => (
              <article
                className="rounded-[18px] border border-[#ECEFEB] bg-[#FCFBFA] p-4"
                key={label}
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-full bg-[#EAF7F0] text-[#2FA779]">
                    <Icon className="size-5" aria-hidden="true" />
                  </div>
                  <h3 className="text-[15px] font-bold text-[#101828]">
                    {label}
                  </h3>
                </div>
                <p className="mt-3 text-[13px] font-semibold leading-6 text-[#667085]">
                  {text}
                </p>
                <span className="mt-4 inline-flex rounded-full bg-white px-3 py-1 text-[12px] font-bold text-[#2FA779]">
                  {accent}
                </span>
              </article>
            ))}
          </div>
        </section>
      </section>

      <section className="mt-7 grid gap-4 lg:grid-cols-3">
        {insightRows.map((insight) => (
          <InsightStripCard
            accent={insight.accent as Accent}
            icon={insight.icon}
            key={insight.title}
            text={insight.text}
            title={insight.title}
          />
        ))}
      </section>
    </LifePilotShell>
  );
}
