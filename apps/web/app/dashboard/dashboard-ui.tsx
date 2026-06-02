export type Accent = "blue" | "green" | "orange" | "purple" | "red";

const sidebarItems = [
  "Dashboard",
  "Contracts",
  "Documents",
  "Reminders",
  "Insights",
  "AI Assistant",
  "Vault",
  "Settings",
] as const;

const mobileNavItems = [
  "Dashboard",
  "Contracts",
  "Documents",
  "Reminders",
  "Insights",
] as const;

const accentClasses: Record<
  Accent,
  {
    dot: string;
    icon: string;
    soft: string;
    text: string;
  }
> = {
  blue: {
    dot: "bg-documents-blue",
    icon: "bg-documents-soft text-documents-blue",
    soft: "bg-documents-soft",
    text: "text-documents-blue",
  },
  green: {
    dot: "bg-life-green",
    icon: "bg-life-green-soft text-life-green-dark",
    soft: "bg-life-green-soft",
    text: "text-life-green-dark",
  },
  orange: {
    dot: "bg-reminder-orange",
    icon: "bg-reminder-soft text-reminder-orange",
    soft: "bg-reminder-soft",
    text: "text-reminder-orange",
  },
  purple: {
    dot: "bg-ai-purple",
    icon: "bg-ai-soft text-ai-purple",
    soft: "bg-ai-soft",
    text: "text-ai-purple",
  },
  red: {
    dot: "bg-danger-red",
    icon: "bg-danger-soft text-danger-red",
    soft: "bg-danger-soft",
    text: "text-danger-red",
  },
};

const getInitials = (label: string): string =>
  label
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2);

export function Sidebar() {
  return (
    <aside className="hidden border-r border-life-border/80 bg-white/65 px-5 py-6 md:block">
      <div className="sticky top-6 flex h-[calc(100vh-48px)] flex-col">
        <div className="flex items-center gap-3 px-2">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-life-green-soft text-base font-bold text-life-green-dark">
            LP
          </div>
          <div>
            <p className="text-[13px] font-semibold text-life-muted">
              Life Pilot
            </p>
            <p className="text-lg font-bold text-life-text">Control Center</p>
          </div>
        </div>

        <nav className="mt-9 grid gap-1.5">
          {sidebarItems.map((item) => {
            const isActive = item === "Dashboard";

            return (
              <a
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  isActive
                    ? "bg-life-green-soft text-life-green-dark"
                    : "text-life-muted hover:bg-white hover:text-life-text"
                }`}
                href={item === "Dashboard" ? "/dashboard" : "#"}
                key={item}
              >
                <span
                  className={`flex size-8 items-center justify-center rounded-xl text-[11px] font-bold ${
                    isActive
                      ? "bg-white text-life-green-dark"
                      : "bg-life-bg text-life-muted"
                  }`}
                >
                  {getInitials(item)}
                </span>
                {item}
              </a>
            );
          })}
        </nav>

        <div className="mt-auto rounded-[20px] border border-life-border bg-white p-4 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-ai-soft text-sm font-bold text-ai-purple">
              AI
            </div>
            <div>
              <p className="text-sm font-semibold text-life-text">
                Smart review
              </p>
              <p className="mt-0.5 text-xs leading-5 text-life-muted">
                3 new recommendations
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function DashboardHeader() {
  return (
    <header>
      <div className="flex items-center justify-between gap-4 md:hidden">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-life-green-soft text-base font-bold text-life-green-dark">
            LP
          </div>
          <p className="text-base font-bold text-life-text">Life Pilot</p>
        </div>
        <HeaderActions />
      </div>

      <div className="mt-8 flex flex-col gap-5 md:mt-0 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-[32px] font-bold leading-tight tracking-normal text-life-text">
            Good morning
          </h1>
          <p className="mt-2 text-base leading-7 text-life-muted">
            Here’s your overview for today.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-life-border bg-white px-4 py-2 text-[13px] font-semibold text-life-green-dark shadow-soft">
            <span className="size-2 rounded-full bg-life-green" />
            All systems operational
          </span>
          <HeaderActions desktopOnly />
        </div>
      </div>
    </header>
  );
}

function HeaderActions({ desktopOnly = false }: { desktopOnly?: boolean }) {
  return (
    <div
      className={`items-center gap-3 ${desktopOnly ? "hidden md:flex" : "flex md:hidden"}`}
    >
      <button
        aria-label="Notifications"
        className="relative flex size-11 items-center justify-center rounded-2xl border border-life-border bg-white text-sm font-bold text-life-text shadow-soft transition hover:border-life-green/50"
        type="button"
      >
        N
        <span className="absolute right-3 top-3 size-2 rounded-full bg-danger-red" />
      </button>
      <div className="flex size-11 items-center justify-center rounded-full bg-life-text text-sm font-bold text-white shadow-soft">
        FY
      </div>
    </div>
  );
}

export interface SummaryCardProps {
  accent: Accent;
  label: string;
  meta: string;
  value: string;
}

export function SummaryCard({ accent, label, meta, value }: SummaryCardProps) {
  const classes = accentClasses[accent];

  return (
    <article className="rounded-[20px] border border-life-border bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-life-muted">{label}</p>
          <p className="mt-4 text-[32px] font-bold leading-none tracking-normal text-life-text">
            {value}
          </p>
        </div>
        <span
          className={`flex size-11 items-center justify-center rounded-2xl text-sm font-bold ${classes.icon}`}
        >
          {getInitials(label)}
        </span>
      </div>
      <p className={`mt-4 text-[13px] font-semibold ${classes.text}`}>
        {meta}
      </p>
    </article>
  );
}

export interface DashboardSectionProps {
  actionLabel: string;
  children: React.ReactNode;
  eyebrow: string;
  title: string;
}

export function DashboardSection({
  actionLabel,
  children,
  eyebrow,
  title,
}: DashboardSectionProps) {
  return (
    <section className="rounded-[20px] border border-life-border bg-white p-5 shadow-soft sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[13px] font-semibold text-life-muted">{eyebrow}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-normal text-life-text">
            {title}
          </h2>
        </div>
        <button
          className="rounded-xl border border-life-border bg-white px-4 py-2 text-sm font-semibold text-life-text transition hover:border-life-green/50 hover:text-life-green-dark"
          type="button"
        >
          {actionLabel}
        </button>
      </div>
      <div className="mt-5 grid gap-2">{children}</div>
    </section>
  );
}

export interface ListItemProps {
  accent: Accent;
  meta: string;
  title: string;
  value: string;
}

export function ListItem({ accent, meta, title, value }: ListItemProps) {
  const classes = accentClasses[accent];

  return (
    <div className="flex items-center gap-4 rounded-2xl px-1 py-3 transition hover:bg-life-bg/70 sm:px-2">
      <span className={`size-2.5 shrink-0 rounded-full ${classes.dot}`} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-life-text">
          {title}
        </p>
        <p className="mt-1 text-[13px] font-medium text-life-muted">{meta}</p>
      </div>
      <p className="max-w-[46%] text-right text-[13px] font-semibold leading-5 text-life-muted sm:max-w-none">
        {value}
      </p>
    </div>
  );
}

export interface InsightCardProps {
  text: string;
  title: string;
  tone: Exclude<Accent, "blue" | "red">;
}

export function InsightCard({ text, title, tone }: InsightCardProps) {
  const classes = accentClasses[tone];

  return (
    <article className={`rounded-[20px] border border-life-border p-5 ${classes.soft}`}>
      <div className="flex items-center gap-3">
        <span
          className={`flex size-10 items-center justify-center rounded-2xl bg-white text-sm font-bold ${classes.text}`}
        >
          {getInitials(title)}
        </span>
        <h3 className="text-[17px] font-semibold text-life-text">{title}</h3>
      </div>
      <p className="mt-4 text-sm leading-6 text-life-muted">{text}</p>
    </article>
  );
}

export function MobileBottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-life-border bg-white/95 px-3 py-2 shadow-soft backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {mobileNavItems.map((item) => {
          const isActive = item === "Dashboard";

          return (
            <a
              className={`flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-semibold ${
                isActive
                  ? "bg-life-green-soft text-life-green-dark"
                  : "text-life-muted"
              }`}
              href={item === "Dashboard" ? "/dashboard" : "#"}
              key={item}
            >
              <span
                className={`size-1.5 rounded-full ${
                  isActive ? "bg-life-green" : "bg-life-border"
                }`}
              />
              {item}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
