import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Life Pilot",
  description: "AWS-first life management foundation for goals, documents, reminders, and AI insights.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
