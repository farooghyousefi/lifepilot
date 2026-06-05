import type { Metadata } from "next";

import { RemindersClient } from "./reminders-client";

export const metadata: Metadata = {
  title: "Erinnerungen | LifePilot",
};

export default function RemindersPage() {
  return <RemindersClient />;
}
