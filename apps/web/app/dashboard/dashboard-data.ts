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
    label: "Aufgaben in Prüfung",
    meta: "Lokal vorbereitet",
    value: "4",
    visual: "chart",
  },
  {
    accent: "blue",
    icon: FileText,
    label: "Dokumente",
    meta: "Beispielbereich",
    value: "12",
    visual: "document",
  },
  {
    accent: "red",
    icon: Bell,
    label: "Erinnerungen",
    meta: "Fristen prüfen",
    value: "5",
    visual: "bell",
  },
  {
    accent: "purple",
    icon: Sparkles,
    label: "Hinweise",
    meta: "Noch ohne AI-Anbindung",
    value: "3",
    visual: "sparkles",
  },
] as const;

export const goalRows = [
  {
    accent: "green",
    icon: Heart,
    progress: 60,
    title: "Dokumente sortieren",
  },
  {
    accent: "blue",
    icon: BriefcaseBusiness,
    progress: 40,
    title: "Verträge erfassen",
  },
  {
    accent: "green",
    icon: ShieldCheck,
    progress: 70,
    title: "Fristen bestätigen",
  },
  {
    accent: "blue",
    icon: BookOpen,
    progress: 30,
    title: "Tresor vorbereiten",
  },
] as const;

export const documentRows = [
  {
    accent: "red",
    meta: "Beispiel · Zur Prüfung",
    title: "Versicherungsschreiben",
  },
  {
    accent: "blue",
    meta: "Beispiel · Vertrag",
    title: "Internetvertrag",
  },
  {
    accent: "green",
    meta: "Beispiel · Rechnung",
    title: "Stromrechnung",
  },
  {
    accent: "purple",
    meta: "Beispiel · Geschützt",
    title: "Ausweis-Platzhalter",
  },
] as const;

export const reminderRows = [
  {
    day: "12",
    meta: "Beispiel · 09:00",
    month: "JUN",
    title: "Dokumentfrist prüfen",
  },
  {
    day: "18",
    meta: "Beispiel · 10:00",
    month: "JUN",
    title: "Rechnung kontrollieren",
  },
  {
    day: "25",
    meta: "Beispiel · 14:00",
    month: "JUN",
    title: "Vertrag vergleichen",
  },
] as const;

export const insightRows = [
  {
    accent: "green",
    icon: TrendingUp,
    text: "Prüfe zuerst Dokumente mit klarer Frist oder Zahlungsdatum.",
    title: "Priorität",
  },
  {
    accent: "blue",
    icon: CalendarDays,
    text: "Bestätigte Fristen sollen später ins Backend und in den Kalender.",
    title: "Nächster Ausbau",
  },
  {
    accent: "purple",
    icon: Sparkles,
    text: "KI-Erklärung kommt erst über eine sichere Backend-Grenze.",
    title: "Sichere AI-Grenze",
  },
] as const;
