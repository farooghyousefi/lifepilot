import type { Metadata } from "next";
import { DashboardClient } from "./dashboard-client";

export const metadata: Metadata = {
  title: "LifePilot Command Center",
  description:
    "Persönlicher Verwaltungsassistent für Dokumente, Fristen, Verträge und nächste Schritte.",
};

export default function DashboardPage() {
  return <DashboardClient />;
}
