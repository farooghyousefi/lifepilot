import {
  BarChart3,
  Bell,
  Bot,
  ChevronRight,
  CreditCard,
  FileText,
  Home,
  LockKeyhole,
  Menu,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { AuthGuard } from "../../src/components/auth/auth-guard";
import { UserMenu } from "./user-menu";

export type Accent = "blue" | "green" | "orange" | "purple" | "red";

const sidebarItems: Array<{
  href: string;
  icon: LucideIcon;
  key: string;
  label: string;
}> = [
  { href: "/dashboard", icon: Home, key: "Dashboard", label: "Übersicht" },
  { href: "/contracts", icon: CreditCard, key: "Contracts", label: "Verträge" },
  { href: "/goals", icon: Sparkles, key: "Goals", label: "Aufgaben" },
  { href: "/documents", icon: FileText, key: "Documents", label: "Dokumente" },
  { href: "/reminders", icon: Bell, key: "Reminders", label: "Erinnerungen" },
  { href: "/insights", icon: BarChart3, key: "Insights", label: "Hinweise" },
  { href: "/ai-assistant", icon: Bot, key: "AI Assistant", label: "Assistent" },
  { href: "/vault", icon: LockKeyhole, key: "Vault", label: "Tresor" },
  { href: "/settings", icon: Settings, key: "Settings", label: "Einstellungen" },
];

const mobileNavItems: Array<{
  href: string;
  icon: LucideIcon;
  key: string;
  label: string;
}> = [
  { href: "/dashboard", icon: Home, key: "Dashboard", label: "Übersicht" },
  { href: "/contracts", icon: CreditCard, key: "Contracts", label: "Verträge" },
  { href: "/documents", icon: FileText, key: "Documents", label: "Dokumente" },
  { href: "/reminders", icon: Bell, key: "Reminders", label: "Fristen" },
  { href: "/insights", icon: Sparkles, key: "Insights", label: "Hinweise" },
  { href: "/vault", icon: LockKeyhole, key: "Vault", label: "Tresor" },
];

const accentClasses: Record<
  Accent,
  {
    bg: string;
    border: string;
    dot: string;
    icon: string;
    progress: string;
    text: string;
  }
> = {
  blue: {
    bg: "bg-[#F1F6FF]",
    border: "border-[#E3ECFF]",
    dot: "bg-[#2F80ED]",
    icon: "bg-[#EAF2FF] text-[#2F80ED]",
    progress: "bg-[#2F80ED]",
    text: "text-[#2F80ED]",
  },
  green: {
    bg: "bg-[#F2FAF6]",
    border: "border-[#DDEFE6]",
    dot: "bg-[#35B984]",
    icon: "bg-[#E8F7EF] text-[#2FA779]",
    progress: "bg-[#35B984]",
    text: "text-[#2FA779]",
  },
  orange: {
    bg: "bg-[#FFF7EA]",
    border: "border-[#FDECCB]",
    dot: "bg-[#F59E0B]",
    icon: "bg-[#FFF0D6] text-[#F59E0B]",
    progress: "bg-[#F59E0B]",
    text: "text-[#D98806]",
  },
  purple: {
    bg: "bg-[#F8F4FF]",
    border: "border-[#EDE5FF]",
    dot: "bg-[#7C5CFF]",
    icon: "bg-[#F0EAFF] text-[#7C5CFF]",
    progress: "bg-[#7C5CFF]",
    text: "text-[#6F54E8]",
  },
  red: {
    bg: "bg-[#FFF3F1]",
    border: "border-[#FBE3DF]",
    dot: "bg-[#FF5E57]",
    icon: "bg-[#FFE8E4] text-[#EF524B]",
    progress: "bg-[#FF5E57]",
    text: "text-[#E14C45]",
  },
};

export interface NavigationProps {
  activeItem?: string;
}

export function Sidebar({ activeItem = "Dashboard" }: NavigationProps) {
  return (
    <aside className="hidden border-r border-[#ECEFEB] bg-white px-7 py-8 md:block">
      <div className="sticky top-8 flex h-[calc(100vh-64px)] flex-col">
        <a className="text-[28px] font-bold tracking-[-0.01em] text-[#101828]" href="/">
          Life Pilot
        </a>

        <nav className="mt-10 grid gap-2">
          {sidebarItems.map(({ href, icon: Icon, key, label }) => {
            const isActive = key === activeItem;

            return (
              <a
                className={`flex items-center gap-4 rounded-2xl px-4 py-4 text-[15px] font-semibold transition ${
                  isActive
                    ? "bg-[#EAF7F0] text-[#2FA779]"
                    : "text-[#6B7280] hover:bg-[#F7F8F5] hover:text-[#101828]"
                }`}
                href={href}
                key={label}
              >
                <Icon
                  aria-hidden="true"
                  className="size-5"
                  strokeWidth={2}
                />
                {label}
              </a>
            );
          })}
        </nav>

        <div className="mt-auto rounded-[22px] bg-white p-5 shadow-[0_18px_55px_rgba(16,24,40,0.08)]">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-[#EAF7F0] p-2.5 text-[#2FA779]">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[15px] font-bold text-[#101828]">
                Datenschutz zuerst
              </p>
              <p className="mt-2 text-[13px] leading-6 text-[#667085]">
                Dein Bereich ist an dein angemeldetes Konto gebunden.
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function LifePilotShell({
  activeItem = "Dashboard",
  children,
}: NavigationProps & { children: React.ReactNode }) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#FBFAF8] text-life-text">
      <div className="mx-auto grid min-h-screen w-full min-w-0 max-w-[1640px] bg-white md:grid-cols-[300px_1fr]">
        <Sidebar activeItem={activeItem} />
        <div className="min-w-0 overflow-x-hidden bg-[#FCFBFA] pb-24 md:pb-0">
          <AuthGuard>
            <main className="mx-auto w-full max-w-[1240px] min-w-0 px-4 py-5 sm:px-8 md:px-10 md:py-9 xl:px-12">
              {children}
            </main>
          </AuthGuard>
        </div>
      </div>
      <MobileBottomNav activeItem={activeItem} />
    </div>
  );
}

export function DashboardHeader() {
  return (
    <header>
      <div className="flex items-center justify-between gap-4 md:hidden">
        <button
          aria-label="Open menu"
          className="flex size-10 items-center justify-center rounded-2xl text-[#101828]"
          type="button"
        >
          <Menu className="size-6" aria-hidden="true" />
        </button>
        <p className="text-lg font-bold text-[#101828]">Life Pilot</p>
        <button
          aria-label="Notifications"
          className="flex size-10 items-center justify-center rounded-2xl text-[#101828]"
          type="button"
        >
          <Bell className="size-5" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-8 flex min-w-0 items-start justify-between gap-4 md:mt-0">
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <Sun
            aria-hidden="true"
            className="mt-1 size-9 shrink-0 text-[#101828] sm:size-11"
            strokeWidth={1.8}
          />
          <div className="min-w-0">
            <h1 className="break-words text-[26px] font-bold leading-tight tracking-[-0.01em] text-[#101828] md:text-[32px]">
              LifePilot Command Center
            </h1>
            <p className="mt-1 break-words text-[13px] font-medium text-[#667085] md:text-[15px]">
              Dokumente, Fristen und nächste Schritte im Blick.
            </p>
          </div>
        </div>

        <div className="hidden items-center gap-5 md:flex">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#E7EAE5] bg-white px-5 py-2.5 text-[13px] font-semibold text-[#475467] shadow-button">
            <span className="size-2.5 rounded-full bg-[#12B981]" />
            Systeme bereit
          </span>
          <button
            aria-label="Notifications"
            className="text-[#101828]"
            type="button"
          >
            <Bell className="size-6" aria-hidden="true" />
          </button>
          <UserMenu />
        </div>
      </div>
    </header>
  );
}

export function PageHeader({
  eyebrow,
  subtitle,
  title,
}: {
  eyebrow: string;
  subtitle: string;
  title: string;
}) {
  return (
    <header>
      <div className="flex items-center justify-between gap-4 md:hidden">
        <button
          aria-label="Open menu"
          className="flex size-10 items-center justify-center rounded-2xl text-[#101828]"
          type="button"
        >
          <Menu className="size-6" aria-hidden="true" />
        </button>
        <p className="text-lg font-bold text-[#101828]">Life Pilot</p>
        <button
          aria-label="Notifications"
          className="flex size-10 items-center justify-center rounded-2xl text-[#101828]"
          type="button"
        >
          <Bell className="size-5" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-8 flex min-w-0 items-start justify-between gap-4 md:mt-0">
        <div className="min-w-0">
          <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#2FA779]">
            {eyebrow}
          </p>
          <h1 className="mt-2 break-words text-[28px] font-bold leading-tight tracking-[-0.01em] text-[#101828] sm:text-[30px] md:text-[36px]">
            {title}
          </h1>
          <p className="mt-2 max-w-2xl break-words text-[15px] font-medium leading-7 text-[#667085]">
            {subtitle}
          </p>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#E7EAE5] bg-white px-5 py-2.5 text-[13px] font-semibold text-[#475467] shadow-button">
            <span className="size-2.5 rounded-full bg-[#12B981]" />
            Demo-Modus
          </span>

          <UserMenu />
        </div>
      </div>
    </header>
  );
}

export interface SummaryCardProps {
  accent: Accent;
  icon: LucideIcon;
  label: string;
  meta: string;
  value: string;
  visual: "bell" | "chart" | "document" | "sparkles";
}

export function SummaryCard({
  accent,
  icon: Icon,
  label,
  meta,
  value,
  visual,
}: SummaryCardProps) {
  const classes = accentClasses[accent];
  const isChart = visual === "chart";
  const valueSizeClass = value.length > 5 ? "text-[28px]" : "text-[32px]";

  return (
    <article
      className={`relative min-h-[148px] overflow-hidden rounded-[18px] border p-5 shadow-card sm:p-6 ${classes.bg} ${classes.border}`}
    >
      <div className="relative z-10">
        <div className={`flex min-w-0 items-center gap-3 text-[15px] font-bold ${classes.text}`}>
          <Icon className="size-6 shrink-0" aria-hidden="true" strokeWidth={2.2} />
          <span className="min-w-0 break-words">{label}</span>
        </div>
        {isChart ? (
          <div className="mt-8 grid grid-cols-[minmax(0,1fr)_72px] items-end gap-3 sm:grid-cols-[minmax(0,1fr)_88px]">
            <p
              className={`min-w-0 break-words ${valueSizeClass} font-bold leading-none text-[#101828]`}
            >
              {value}
            </p>
            <SummaryChartVisual accent={accent} />
          </div>
        ) : (
          <p
            className={`mt-8 break-words ${valueSizeClass} font-bold leading-none text-[#101828]`}
          >
            {value}
          </p>
        )}
        <p className="mt-4 flex min-w-0 items-start gap-2 break-words text-[13px] font-semibold text-[#667085]">
          <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${classes.dot}`} />
          {meta}
        </p>
      </div>
      {!isChart ? <SummaryVisual accent={accent} visual={visual} /> : null}
    </article>
  );
}

function SummaryChartVisual({ accent }: { accent: Accent }) {
  const classes = accentClasses[accent];

  return (
    <div className="flex h-14 w-[72px] items-end gap-1 justify-self-end opacity-90 sm:w-[88px] sm:gap-1.5">
      {[18, 28, 25, 38, 34, 48].map((height, index) => (
        <span
          className={`w-2.5 rounded-full sm:w-3 ${classes.progress}`}
          key={height + index}
          style={{ height }}
        />
      ))}
    </div>
  );
}

function SummaryVisual({
  accent,
  visual,
}: {
  accent: Accent;
  visual: SummaryCardProps["visual"];
}) {
  const classes = accentClasses[accent];

  if (visual === "chart") {
    return null;
  }

  const VisualIcon =
    visual === "document" ? FileText : visual === "bell" ? Bell : Sparkles;

  return (
    <VisualIcon
      aria-hidden="true"
      className={`absolute bottom-6 right-5 size-14 opacity-20 sm:right-7 sm:size-16 ${classes.text}`}
      strokeWidth={1.8}
    />
  );
}

export function DashboardSection({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-[22px] border border-[#ECEFEB] bg-white p-5 shadow-card sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="break-words text-xl font-bold tracking-[-0.01em] text-[#101828]">
          {title}
        </h2>
        <button
          className="w-full rounded-xl border border-[#ECEFEB] bg-white px-4 py-2 text-sm font-semibold text-[#344054] shadow-button transition hover:border-[#D5EBDD] hover:text-[#2FA779] sm:w-auto"
          type="button"
        >
          Alle ansehen
        </button>
      </div>
      <div className="mt-5 divide-y divide-[#F0F2EF]">{children}</div>
    </section>
  );
}

export function GoalItem({
  accent,
  icon: Icon,
  progress,
  title,
}: {
  accent: Accent;
  icon: LucideIcon;
  progress: number;
  title: string;
}) {
  const classes = accentClasses[accent];

  return (
    <div className="flex items-center gap-4 py-4 first:pt-1 last:pb-1">
      <div className={`flex size-12 shrink-0 items-center justify-center rounded-full ${classes.icon}`}>
        <Icon className="size-6" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="break-words text-[15px] font-bold text-[#101828]">{title}</p>
        <div className="mt-3 flex items-center gap-2">
          <span className={`text-[13px] font-bold ${classes.text}`}>
            {progress}%
          </span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#EEF0EC]">
            <div
              className={`h-full rounded-full ${classes.progress}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
      <ChevronRight className="size-5 shrink-0 text-[#98A2B3]" aria-hidden="true" />
    </div>
  );
}

export function DocumentItem({
  accent,
  meta,
  title,
}: {
  accent: Accent;
  meta: string;
  title: string;
}) {
  const classes = accentClasses[accent];

  return (
    <div className="flex items-center gap-4 py-4 first:pt-1 last:pb-1">
      <div className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${classes.icon}`}>
        <FileText className="size-6" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="break-words text-[15px] font-bold text-[#101828]">{title}</p>
        <p className="mt-1 break-words text-[13px] font-semibold text-[#667085]">{meta}</p>
      </div>
      <ChevronRight className="size-5 shrink-0 text-[#98A2B3]" aria-hidden="true" />
    </div>
  );
}

export function ReminderItem({
  day,
  meta,
  month,
  title,
}: {
  day: string;
  meta: string;
  month: string;
  title: string;
}) {
  return (
    <div className="flex items-center gap-4 py-4 first:pt-1 last:pb-1">
      <div className="w-[54px] shrink-0 overflow-hidden rounded-lg border border-[#F3D9D4] bg-white text-center">
        <div className="bg-[#FF7B6D] py-1 text-[11px] font-bold text-white">
          {month}
        </div>
        <div className="py-2 text-xl font-bold text-[#101828]">{day}</div>
      </div>
      <div className="min-w-0">
        <p className="break-words text-[15px] font-bold text-[#101828]">{title}</p>
        <p className="mt-1 break-words text-[13px] font-semibold text-[#667085]">{meta}</p>
      </div>
    </div>
  );
}

export function InsightStripCard({
  accent,
  icon: Icon,
  text,
  title,
}: {
  accent: Accent;
  icon: LucideIcon;
  text: string;
  title: string;
}) {
  const classes = accentClasses[accent];

  return (
    <article className={`flex min-w-0 items-start gap-4 rounded-[18px] border p-5 sm:items-center sm:gap-5 ${classes.bg} ${classes.border}`}>
      <div className={`flex size-14 shrink-0 items-center justify-center rounded-full ${classes.icon}`}>
        <Icon className="size-7" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <h3 className={`break-words text-[15px] font-bold ${classes.text}`}>{title}</h3>
        <p className="mt-2 break-words text-[14px] font-medium leading-6 text-[#667085]">
          {text}
        </p>
      </div>
    </article>
  );
}

export function MobileBottomNav({ activeItem = "Dashboard" }: NavigationProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-[#ECEFEB] bg-white px-3 pb-3 pt-2 shadow-[0_-10px_28px_rgba(16,24,40,0.08)] md:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-6 gap-1">
        {mobileNavItems.map(({ href, icon: Icon, key, label }) => {
          const isActive = key === activeItem;

          return (
            <a
              className={`flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-bold ${
                isActive ? "text-[#2FA779]" : "text-[#667085]"
              }`}
              href={href}
              key={label}
            >
              <Icon className="size-5" aria-hidden="true" />
              {label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
