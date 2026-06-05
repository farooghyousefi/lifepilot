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
  title: "Hinweise | LifePilot",
};

const insightMetrics = [
  {
    accent: "purple",
    icon: Sparkles,
    label: "Hinweise",
    meta: "Ohne externe AI-Aufrufe",
    value: "3",
    visual: "sparkles",
  },
  {
    accent: "green",
    icon: TrendingUp,
    label: "Chancen",
    meta: "Fristen und Verträge",
    value: "5",
    visual: "chart",
  },
] as const;

export default function InsightsPage() {
  return (
    <LifePilotShell activeItem="Insights">
      <PageHeader
        eyebrow="Hinweise"
        subtitle="Ruhige Hinweise darauf, welche Dokumente, Fristen oder Verträge Aufmerksamkeit brauchen."
        title="Hinweise"
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
