import type { Metadata } from "next";

import { DocumentsClient } from "./documents-client";

export const metadata: Metadata = {
  title: "Documents | Life Pilot",
};

export default function DocumentsPage() {
  return <DocumentsClient />;
}
