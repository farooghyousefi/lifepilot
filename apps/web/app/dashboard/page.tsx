import type { Metadata } from "next";
import { DashboardClient } from "./dashboard-client";

export const metadata: Metadata = {
  title: "Life Pilot Dashboard",
  description:
    "A calm personal dashboard for contracts, documents, reminders, and AI insights.",
};

export default function DashboardPage() {
  return <DashboardClient />;
}
