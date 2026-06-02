import type { Metadata } from "next";
import { Sparkles, TrendingUp } from "lucide-react";

import { insightRows } from "../dashboard/dashboard-data";
import {
  InsightStripCard,
  LifePilotShell,
  PageHeader,
  SummaryCard,
  type Accent,
} from "../dashboard/dashboard-ui";

export const metadata: Metadata = {
  title: "Insights | Life Pilot",
};

const insightMetrics = [
  {
    accent: "purple",
    icon: Sparkles,
    label: "AI Insights",
    meta: "New recommendations",
    value: "3",
    visual: "sparkles",
  },
  {
    accent: "green",
    icon: TrendingUp,
    label: "Opportunities",
    meta: "Savings and routines",
    value: "5",
    visual: "chart",
  },
] as const;

export default function InsightsPage() {
  return (
    <LifePilotShell activeItem="Insights">
      <PageHeader
        eyebrow="Insights"
        subtitle="Signals that help you understand what deserves attention without adding noise."
        title="Smart overview"
      />

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        {insightMetrics.map((card) => (
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
