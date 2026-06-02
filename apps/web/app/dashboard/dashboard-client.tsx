import {
  DashboardHeader,
  DashboardSection,
  DocumentItem,
  GoalItem,
  InsightStripCard,
  LifePilotShell,
  ReminderItem,
  SummaryCard,
  type Accent,
} from "./dashboard-ui";
import {
  documentRows,
  goalRows,
  insightRows,
  reminderRows,
  summaryCards,
} from "./dashboard-data";

export function DashboardClient() {
  return (
    <LifePilotShell activeItem="Dashboard">
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
    </LifePilotShell>
  );
}
