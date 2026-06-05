import type { Metadata } from "next";

import { DocumentsClient } from "./documents-client";

export const metadata: Metadata = {
  title: "Dokumente | LifePilot",
};

export default function DocumentsPage() {
  return <DocumentsClient />;
}
