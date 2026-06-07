"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, ShieldAlert } from "lucide-react";

import { authService } from "../../../src/services/auth";

type CallbackState = "loading" | "success" | "error";

export default function OAuthCallbackPage() {
  const router = useRouter();
  const [state, setState] = useState<CallbackState>("loading");
  const [message, setMessage] = useState("Anmeldung wird abgeschlossen...");

  useEffect(() => {
    let timeoutId: number | undefined;

    authService
      .handleOAuthCallback()
      .then(() => {
        setState("success");
        setMessage("Anmeldung erfolgreich. Du wirst weitergeleitet.");
        timeoutId = window.setTimeout(() => router.replace("/dashboard"), 700);
      })
      .catch((error) => {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Anmeldung konnte nicht abgeschlossen werden.";

        setState("error");
        setMessage(
          errorMessage.includes("noch nicht aktiviert")
            ? "Diese Anmeldemethode ist noch nicht aktiviert."
            : "Anmeldung konnte nicht abgeschlossen werden.",
        );
      });

    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [router]);

  const Icon =
    state === "success" ? CheckCircle2 : state === "error" ? ShieldAlert : Loader2;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FBFAF8] px-5 text-[#101828]">
      <section className="w-full max-w-md rounded-[24px] border border-[#ECEFEB] bg-white p-8 text-center shadow-card">
        <div
          className={`mx-auto flex size-14 items-center justify-center rounded-2xl ${
            state === "error"
              ? "bg-[#FFF3F1] text-[#E14C45]"
              : "bg-[#EAF7F0] text-[#2FA779]"
          }`}
        >
          <Icon
            className={`size-7 ${state === "loading" ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-normal">
          {state === "loading"
            ? "Anmeldung wird abgeschlossen..."
            : state === "success"
              ? "Anmeldung erfolgreich. Du wirst weitergeleitet."
              : "Anmeldung konnte nicht abgeschlossen werden."}
        </h1>
        <p className="mt-3 text-[14px] font-semibold leading-6 text-[#667085]">
          {message}
        </p>
      </section>
    </main>
  );
}
