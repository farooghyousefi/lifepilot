"use client";

import { useEffect, useState } from "react";
import {
  FileSearch,
  BrainCircuit,
  KeyRound,
  Server,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import type { AuthSession } from "@lifepilot/shared";

import { authService } from "../../src/services/auth";
import { LifePilotShell, PageHeader } from "../dashboard/dashboard-ui";

export function SettingsClient() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [brainStatus, setBrainStatus] = useState<{
    model: string;
    providerStatus: "active" | "not_configured" | "error";
  }>({
    model: "gpt-4.1-mini",
    providerStatus: "not_configured",
  });
  const socialLoginAvailability = authService.getSocialLoginAvailability();

  useEffect(() => {
    authService.getCurrentSession().then(setSession).catch(() => setSession(null));
    fetch("/api/ai/document-brain")
      .then((response) => response.json())
      .then((status) =>
        setBrainStatus({
          model:
            typeof status.model === "string" ? status.model : "gpt-4.1-mini",
          providerStatus:
            status.providerStatus === "active" ? "active" : "not_configured",
        }),
      )
      .catch(() =>
        setBrainStatus({
          model: "gpt-4.1-mini",
          providerStatus: "error",
        }),
      );
  }, []);

  const loginMethod = getLoginMethodLabel(session);
  const storageMode =
    process.env.NEXT_PUBLIC_USE_MOCKS === "false"
      ? "Backend vorbereitet, aber noch nicht deployed"
      : "Lokaler Entwicklungsmodus";

  return (
    <LifePilotShell activeItem="Settings">
      <PageHeader
        eyebrow="Einstellungen"
        subtitle="Überblick über Anmeldung, Sitzung und Speicherstatus."
        title="Konto und Status"
      />

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatusCard
          icon={UserRound}
          label="Login-Status"
          text={loginMethod}
        />
        <StatusCard
          icon={ShieldCheck}
          label="Sitzung"
          text={session ? "Auf diesem Gerät angemeldet" : "Nicht angemeldet"}
        />
        <StatusCard icon={Server} label="Speicherort" text={storageMode} />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <StatusPanel
          icon={KeyRound}
          title="Anmeldung mit Google und Apple"
          rows={[
            {
              label: "Google Login",
              value: socialLoginAvailability.google ? "aktiv" : "vorbereitet",
            },
            {
              label: "Apple Login",
              value: socialLoginAvailability.apple ? "aktiv" : "vorbereitet",
            },
            {
              label: "Cognito Hosted UI",
              value: socialLoginAvailability.isHostedUiConfigured
                ? "konfiguriert"
                : "noch nicht konfiguriert",
            },
          ]}
        />
        <StatusPanel
          icon={FileSearch}
          title="Upload und Analyse"
          rows={[
            { label: "Upload", value: "ein einfacher Dokument-Upload" },
            { label: "TXT", value: "wird lokal analysiert" },
            { label: "PDF", value: "Text wird gelesen, wenn direkt verfügbar" },
            {
              label: "Fotos und Scans",
              value: "OCR vorbereitet, aber noch nicht aktiv",
            },
          ]}
        />
        <StatusPanel
          icon={BrainCircuit}
          title="Smart Brain"
          rows={[
            { label: "Lokale Entscheidungslogik", value: "aktiv" },
            {
              label: "OpenAI Brain",
              value:
                brainStatus.providerStatus === "active"
                  ? "serverseitig aktiv"
                  : brainStatus.providerStatus === "error"
                    ? "Status nicht erreichbar"
                    : "nicht konfiguriert",
            },
            { label: "Modell", value: brainStatus.model },
            {
              label: "Browser-Schlüssel",
              value: "nicht verwendet",
            },
          ]}
        />
      </section>
    </LifePilotShell>
  );
}

function StatusPanel({
  icon: Icon,
  rows,
  title,
}: {
  icon: typeof UserRound;
  rows: Array<{ label: string; value: string }>;
  title: string;
}) {
  return (
    <section className="min-w-0 rounded-[22px] border border-[#ECEFEB] bg-white p-4 shadow-card sm:p-6">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#EAF7F0] text-[#2FA779]">
            <Icon className="size-6" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="break-words text-xl font-bold tracking-normal text-[#101828]">
              {title}
            </h2>
          </div>
        </div>

      <div className="mt-5 grid gap-3">
        {rows.map((row) => (
          <div
            className="flex min-w-0 flex-col gap-2 rounded-[16px] border border-[#ECEFEB] bg-[#FCFBFA] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            key={row.label}
          >
            <p className="min-w-0 break-words text-[13px] font-bold text-[#667085]">{row.label}</p>
            <p className="min-w-0 break-words text-left text-[13px] font-bold text-[#101828] sm:text-right">
              {row.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function StatusCard({
  icon: Icon,
  label,
  text,
}: {
  icon: typeof UserRound;
  label: string;
  text: string;
}) {
  return (
    <article className="min-w-0 rounded-[22px] border border-[#ECEFEB] bg-white p-4 shadow-card sm:p-6">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-[#EAF7F0] text-[#2FA779]">
        <Icon className="size-6" aria-hidden="true" />
      </div>
      <h2 className="mt-5 break-words text-xl font-bold tracking-normal text-[#101828]">
        {label}
      </h2>
      <p className="mt-2 break-words text-[14px] font-semibold leading-6 text-[#667085]">
        {text}
      </p>
    </article>
  );
}

function getLoginMethodLabel(session: AuthSession | null): string {
  if (!session) {
    return "Nicht angemeldet";
  }

  if (session.provider === "mock") {
    return "Entwicklungsmodus";
  }

  if (session.loginMethod === "google") {
    return "Google";
  }

  if (session.loginMethod === "apple") {
    return "Apple";
  }

  return "E-Mail";
}
