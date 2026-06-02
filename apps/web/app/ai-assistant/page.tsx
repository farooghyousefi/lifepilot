import type { Metadata } from "next";
import { Bot, Send, Sparkles, Wand2 } from "lucide-react";

import {
  InsightStripCard,
  LifePilotShell,
  PageHeader,
  SummaryCard,
} from "../dashboard/dashboard-ui";

export const metadata: Metadata = {
  title: "AI Assistant | Life Pilot",
};

const assistantPrompts = [
  "What should I review this week?",
  "Find a possible savings opportunity.",
  "Prepare my next contract action.",
] as const;

export default function AiAssistantPage() {
  return (
    <LifePilotShell activeItem="AI Assistant">
      <PageHeader
        eyebrow="AI Assistant"
        subtitle="A calm assistant workspace prepared for later AI workflows, currently running with local mock suggestions only."
        title="Ask Life Pilot"
      />

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        <SummaryCard
          accent="purple"
          icon={Sparkles}
          label="Suggestions"
          meta="Mock recommendations"
          value="3"
          visual="sparkles"
        />
        <SummaryCard
          accent="green"
          icon={Wand2}
          label="Actions ready"
          meta="No external AI call"
          value="2"
          visual="chart"
        />
      </section>

      <section className="mt-7 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-[22px] border border-[#ECEFEB] bg-white p-6 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-[#F4F0FF] text-[#7C5CFF]">
              <Bot className="size-6" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-[-0.01em] text-[#101828]">
                Assistant draft
              </h2>
              <p className="mt-1 text-[13px] font-semibold text-[#667085]">
                Prepared UX only, no API keys and no model call.
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-[18px] bg-[#F8F4FF] p-5">
            <p className="text-[14px] font-semibold leading-7 text-[#667085]">
              You may save 240 €/year by reviewing your internet contract before
              the next renewal window.
            </p>
          </div>

          <div className="mt-5 flex items-center gap-3 rounded-[18px] border border-[#ECEFEB] bg-[#FCFBFA] px-4 py-3">
            <input
              aria-label="Assistant prompt"
              className="min-w-0 flex-1 bg-transparent text-[14px] font-semibold text-[#101828] outline-none placeholder:text-[#98A2B3]"
              placeholder="Ask about contracts, documents or reminders..."
              type="text"
            />
            <button
              aria-label="Send prompt"
              className="flex size-10 items-center justify-center rounded-xl bg-[#2FA779] text-white"
              type="button"
            >
              <Send className="size-4" aria-hidden="true" />
            </button>
          </div>
        </article>

        <article className="rounded-[22px] border border-[#ECEFEB] bg-white p-6 shadow-card">
          <h2 className="text-xl font-bold tracking-[-0.01em] text-[#101828]">
            Suggested prompts
          </h2>
          <div className="mt-5 space-y-3">
            {assistantPrompts.map((prompt) => (
              <button
                className="w-full rounded-[16px] border border-[#ECEFEB] bg-[#FCFBFA] px-4 py-3 text-left text-[14px] font-bold text-[#101828] transition hover:border-[#D5EBDD] hover:text-[#2FA779]"
                key={prompt}
                type="button"
              >
                {prompt}
              </button>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-7 grid gap-4 lg:grid-cols-3">
        <InsightStripCard
          accent="green"
          icon={Sparkles}
          text="Review one contract before the renewal window closes."
          title="Savings opportunity"
        />
        <InsightStripCard
          accent="blue"
          icon={Wand2}
          text="Use documents and reminders together to prepare actions."
          title="Guided next step"
        />
        <InsightStripCard
          accent="purple"
          icon={Bot}
          text="The future assistant can summarize personal admin tasks."
          title="AI-ready flow"
        />
      </section>
    </LifePilotShell>
  );
}
