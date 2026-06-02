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

export const summaryCards = [
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

export const goalRows = [
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

export const documentRows = [
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

export const reminderRows = [
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

export const insightRows = [
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

