"use client";

import {
  Bell,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  FileText,
  Heart,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import {
  DashboardHeader,
  DashboardSection,
  DocumentItem,
  GoalItem,
  InsightStripCard,
  MobileBottomNav,
  ReminderItem,
  Sidebar,
  SummaryCard,
  type Accent,
} from "./dashboard-ui";

const summaryCards = [
  {
    accent: "green",
    icon: Target,
    label: "Goals in progress",
    meta: "2 on track",
    value: "4",
    visual: "chart",
  },
  {
    accent: "blue",
    icon: FileText,
    label: "Documents",
    meta: "3 added this week",
    value: "12",
    visual: "document",
  },
  {
    accent: "red",
    icon: Bell,
    label: "Reminders",
    meta: "2 due today",
    value: "5",
    visual: "bell",
  },
  {
    accent: "purple",
    icon: Sparkles,
    label: "AI Insights",
    meta: "New insights",
    value: "3",
    visual: "sparkles",
  },
] as const;

const goalRows = [
  {
    accent: "green",
    icon: Heart,
    progress: 60,
    title: "Build healthy habits",
  },
  {
    accent: "blue",
    icon: BriefcaseBusiness,
    progress: 40,
    title: "Advance my career",
  },
  {
    accent: "green",
    icon: ShieldCheck,
    progress: 70,
    title: "Financial security",
  },
  {
    accent: "blue",
    icon: BookOpen,
    progress: 30,
    title: "Personal growth",
  },
] as const;

const documentRows = [
  {
    accent: "red",
    meta: "PDF · Added 3 days ago",
    title: "Insurance Policy",
  },
  {
    accent: "blue",
    meta: "PDF · Added 1 week ago",
    title: "Will & Estate Plan",
  },
  {
    accent: "green",
    meta: "PDF · Added 2 weeks ago",
    title: "Tax Documents",
  },
  {
    accent: "purple",
    meta: "PDF · Added 3 weeks ago",
    title: "ID & Passports",
  },
] as const;

const reminderRows = [
  {
    day: "23",
    meta: "Today, 10:00 AM",
    month: "MAY",
    title: "Review insurance policy",
  },
  {
    day: "24",
    meta: "Tomorrow, 9:00 AM",
    month: "MAY",
    title: "Pay credit card bill",
  },
  {
    day: "27",
    meta: "May 27, 2:00 PM",
    month: "MAY",
    title: "Monthly goals check-in",
  },
] as const;

const insightRows = [
  {
    accent: "green",
    icon: TrendingUp,
    text: "Your goals are aligned with long-term growth.",
    title: "Focus Area",
  },
  {
    accent: "blue",
    icon: CalendarDays,
    text: "Consider scheduling 30 minutes this week for goal planning.",
    title: "Action Suggestion",
  },
  {
    accent: "purple",
    icon: Sparkles,
    text: "You’ve made good progress on your top priorities.",
    title: "Stay on Track",
  },
] as const;

export function DashboardClient() {
  return (
    <div className="min-h-screen bg-[#FBFAF8] text-life-text">
      <div className="mx-auto grid min-h-screen w-full max-w-[1640px] bg-white md:grid-cols-[300px_1fr]">
        <Sidebar />

        <div className="min-w-0 bg-[#FCFBFA] pb-24 md:pb-0">
          <main className="mx-auto max-w-[1240px] px-5 py-5 sm:px-8 md:px-10 md:py-9 xl:px-12">
            <DashboardHeader />

            <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {summaryCards.map((card) => (
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

            <section className="mt-7 grid gap-5 xl:grid-cols-3">
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

              <DashboardSection title="Documents">
                {documentRows.map((document) => (
                  <DocumentItem
                    accent={document.accent as Accent}
                    key={document.title}
                    meta={document.meta}
                    title={document.title}
                  />
                ))}
              </DashboardSection>

              <DashboardSection title="Reminders">
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
            </section>

            <section className="mt-7 rounded-[22px] border border-life-border bg-white p-5 shadow-card sm:p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold tracking-normal text-life-text">
                  AI Insights
                </h2>
                <button
                  className="rounded-xl border border-life-border bg-white px-4 py-2 text-sm font-semibold text-life-text shadow-button transition hover:border-life-green/50 hover:text-life-green-dark"
                  type="button"
                >
                  View all
                </button>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                {insightRows.map((insight) => (
                  <InsightStripCard
                    accent={insight.accent as Accent}
                    icon={insight.icon}
                    key={insight.title}
                    text={insight.text}
                    title={insight.title}
                  />
                ))}
              </div>
            </section>
          </main>
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}

