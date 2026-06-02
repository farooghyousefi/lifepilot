import type { Metadata } from "next";
import { DashboardClient } from "./dashboard-client";

export const metadata: Metadata = {
  title: "Life Pilot Dashboard",
  description:
    "Mock dashboard for contracts, costs, deadlines, and savings potential.",
};

export default function DashboardPage() {
  return <DashboardClient />;
}

