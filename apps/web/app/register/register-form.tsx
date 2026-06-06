"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { User } from "@lifepilot/shared";

import { authService } from "../../src/services/auth";
import { getGermanAuthErrorMessage } from "../../src/services/auth/auth-errors";

const lastEmailKey = "lifepilot:last-email";

type RegisterStep = "details" | "confirm" | "success" | "already-authenticated";

export function RegisterForm() {
  const router = useRouter();
  const [step, setStep] = useState<RegisterStep>("details");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmationCode, setConfirmationCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const rememberedEmail = window.localStorage.getItem(lastEmailKey);

    if (rememberedEmail) {
      setEmail(rememberedEmail);
    }

    authService.getCurrentUser().then((user) => {
      if (user) {
        setCurrentUser(user);
        setStep("already-authenticated");
      }
    });
  }, []);

  const passwordChecks = useMemo(
    () => [
      { isValid: password.length >= 8, text: "Mindestens 8 Zeichen" },
      { isValid: /[a-z]/.test(password), text: "Ein kleiner Buchstabe" },
      { isValid: /[A-Z]/.test(password), text: "Ein großer Buchstabe" },
      { isValid: /\d/.test(password), text: "Eine Zahl" },
    ],
    [password],
  );

  const isPasswordValid = passwordChecks.every((check) => check.isValid);

  const resetFeedback = () => {
    setError(null);
    setMessage(null);
  };

  const createAccount = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetFeedback();

    if (!email.trim() || !password || !confirmPassword) {
      setError("Bitte gib E-Mail und Passwort ein.");
      return;
    }

    if (!isPasswordValid) {
      setError("Bitte erfülle zuerst die Passwort-Anforderungen.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }

    setIsLoading(true);

    try {
      const normalizedEmail = email.trim();
      const result = await authService.signUp({
        email: normalizedEmail,
        name: name.trim() || undefined,
        password,
      });

      window.localStorage.setItem(lastEmailKey, normalizedEmail);

      if (result.needsConfirmation) {
        setStep("confirm");
        setMessage(
          result.deliveryDestination
            ? `Wir haben einen Code an ${result.deliveryDestination} gesendet.`
            : "Wir haben dir einen Bestätigungscode gesendet.",
        );
      } else {
        setStep("success");
        setMessage("Dein Konto wurde erstellt. Du kannst dich jetzt anmelden.");
      }
    } catch (authError) {
      setError(getGermanAuthErrorMessage(authError));
    } finally {
      setIsLoading(false);
    }
  };

  const confirmAccount = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetFeedback();

    if (!email.trim() || !confirmationCode.trim()) {
      setError("Bitte gib den Bestätigungscode ein.");
      return;
    }

    setIsLoading(true);

    try {
      await authService.confirmSignUp({
        code: confirmationCode.trim(),
        email: email.trim(),
      });
      setStep("success");
      setPassword("");
      setConfirmPassword("");
      setConfirmationCode("");
      setMessage("Dein Konto wurde bestätigt. Du kannst dich jetzt anmelden.");
    } catch (authError) {
      setError(getGermanAuthErrorMessage(authError));
    } finally {
      setIsLoading(false);
    }
  };

  const resendCode = async () => {
    resetFeedback();

    if (!email.trim()) {
      setError("Bitte gib zuerst deine E-Mail ein.");
      return;
    }

    setIsLoading(true);

    try {
      await authService.resendConfirmationCode({ email: email.trim() });
      setMessage("Wir haben dir einen neuen Bestätigungscode gesendet.");
    } catch (authError) {
      setError(getGermanAuthErrorMessage(authError));
    } finally {
      setIsLoading(false);
    }
  };

  const signOutAndCreateAccount = async () => {
    resetFeedback();
    setIsLoading(true);

    try {
      await authService.signOut();
      setCurrentUser(null);
      setStep("details");
      setMessage("Du bist abgemeldet. Du kannst jetzt ein neues Konto erstellen.");
    } catch (authError) {
      setError(getGermanAuthErrorMessage(authError));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FBFAF8] px-5 py-6 text-[#101828] sm:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-48px)] max-w-6xl items-center gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <section>
          <Link
            className="text-[28px] font-bold tracking-[-0.01em] text-[#101828]"
            href="/"
          >
            Life Pilot
          </Link>
          <div className="mt-12 max-w-xl">
            <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#2FA779]">
              Konto erstellen
            </p>
            <h1 className="mt-3 text-[40px] font-bold leading-tight tracking-[-0.01em] text-[#101828] sm:text-[52px]">
              Starte deinen sicheren LifePilot Arbeitsbereich.
            </h1>
            <p className="mt-5 text-[16px] font-semibold leading-8 text-[#667085]">
              Erstelle dein Konto selbstständig. Deine Anmeldung wird über
              Cognito geschützt und ist für echte Nutzersitzungen vorbereitet.
            </p>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              {
                icon: ShieldCheck,
                text: "Cognito Anmeldung",
                title: "Sicherer Zugang",
              },
              {
                icon: LockKeyhole,
                text: "Passwort nie lokal speichern",
                title: "Datenschutz zuerst",
              },
              {
                icon: Sparkles,
                text: "Direkt produktnah nutzbar",
                title: "Einfache Nutzung",
              },
            ].map(({ icon: Icon, text, title }) => (
              <article
                className="rounded-[18px] border border-[#ECEFEB] bg-white p-4 shadow-card"
                key={title}
              >
                <div className="flex size-10 items-center justify-center rounded-2xl bg-[#EAF7F0] text-[#2FA779]">
                  <Icon className="size-5" aria-hidden="true" />
                </div>
                <p className="mt-4 text-[14px] font-bold text-[#101828]">
                  {title}
                </p>
                <p className="mt-1 text-[12px] font-semibold text-[#667085]">
                  {text}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-[24px] border border-[#ECEFEB] bg-white p-6 shadow-card sm:p-8">
          <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#2FA779]">
            LifePilot Konto
          </p>
          <h2 className="mt-3 text-[30px] font-bold tracking-[-0.01em] sm:text-[32px]">
            Neues Konto erstellen
          </h2>
          <p className="mt-2 text-[15px] font-semibold leading-7 text-[#667085]">
            Deine Daten werden über Cognito geschützt.
          </p>

          <Feedback error={error} message={message} />

          {step === "already-authenticated" && currentUser ? (
            <div className="mt-8 rounded-[20px] border border-[#DDEFE6] bg-[#F2FAF6] p-5">
              <h3 className="text-[17px] font-bold text-[#101828]">
                Du bist bereits angemeldet
              </h3>
              <p className="mt-1 text-[13px] font-semibold text-[#667085]">
                Aktuelles Konto: {currentUser.email}
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  className="rounded-xl bg-[#2FA779] px-4 py-3 text-[14px] font-bold text-white shadow-button"
                  onClick={() => router.push("/dashboard")}
                  type="button"
                >
                  Zum Dashboard
                </button>
                <button
                  className="rounded-xl border border-[#DDEFE6] bg-white px-4 py-3 text-[14px] font-bold text-[#2FA779] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isLoading}
                  onClick={signOutAndCreateAccount}
                  type="button"
                >
                  Abmelden und neues Konto erstellen
                </button>
              </div>
            </div>
          ) : null}

          {step === "details" ? (
            <form className="mt-8 space-y-4" onSubmit={createAccount}>
              <TextInput
                autoComplete="name"
                label="Name"
                onChange={setName}
                placeholder="Dein Name"
                type="text"
                value={name}
              />
              <TextInput
                autoComplete="email"
                label="E-Mail"
                onChange={setEmail}
                placeholder="du@example.com"
                type="email"
                value={email}
              />
              <TextInput
                autoComplete="new-password"
                label="Passwort"
                onChange={setPassword}
                placeholder="Sicheres Passwort"
                type="password"
                value={password}
              />
              <TextInput
                autoComplete="new-password"
                label="Passwort bestätigen"
                onChange={setConfirmPassword}
                placeholder="Passwort wiederholen"
                type="password"
                value={confirmPassword}
              />

              <div className="rounded-[18px] border border-[#ECEFEB] bg-[#FCFBFA] p-4">
                <p className="text-[13px] font-bold text-[#101828]">
                  Passwort-Anforderungen
                </p>
                <div className="mt-3 grid gap-2">
                  {passwordChecks.map((check) => (
                    <div
                      className="flex items-center gap-2 text-[12px] font-semibold text-[#667085]"
                      key={check.text}
                    >
                      <span
                        className={`size-2.5 rounded-full ${
                          check.isValid ? "bg-[#35B984]" : "bg-[#D0D5DD]"
                        }`}
                      />
                      {check.text}
                    </div>
                  ))}
                </div>
              </div>

              <button
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2FA779] px-4 py-3 text-[14px] font-bold text-white shadow-button transition hover:bg-[#258866] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isLoading}
                type="submit"
              >
                {isLoading ? "Konto wird erstellt..." : "Konto erstellen"}
                <ArrowRight className="size-4" aria-hidden="true" />
              </button>
            </form>
          ) : null}

          {step === "confirm" ? (
            <form className="mt-8 space-y-4" onSubmit={confirmAccount}>
              <div className="rounded-[18px] border border-[#DDEFE6] bg-[#F2FAF6] p-4">
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 size-5 text-[#2FA779]" />
                  <div>
                    <p className="text-[14px] font-bold text-[#101828]">
                      Bestätigungscode eingeben
                    </p>
                    <p className="mt-1 text-[13px] font-semibold leading-6 text-[#667085]">
                      Prüfe deine E-Mail und bestätige dein Konto mit dem Code.
                    </p>
                  </div>
                </div>
              </div>
              <TextInput
                autoComplete="one-time-code"
                label="Bestätigungscode"
                onChange={setConfirmationCode}
                placeholder="Code aus deiner E-Mail"
                type="text"
                value={confirmationCode}
              />
              <button
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2FA779] px-4 py-3 text-[14px] font-bold text-white shadow-button transition hover:bg-[#258866] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isLoading}
                type="submit"
              >
                Konto bestätigen
                <CheckCircle2 className="size-4" aria-hidden="true" />
              </button>
              <button
                className="w-full rounded-xl border border-[#DDEFE6] px-4 py-3 text-[13px] font-bold text-[#2FA779] transition hover:bg-[#F2FAF6] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isLoading}
                onClick={resendCode}
                type="button"
              >
                Code erneut senden
              </button>
            </form>
          ) : null}

          {step === "success" ? (
            <div className="mt-8 rounded-[20px] border border-[#DDEFE6] bg-[#F2FAF6] p-5">
              <div className="flex items-start gap-3">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-white text-[#2FA779]">
                  <CheckCircle2 className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-[17px] font-bold text-[#101828]">
                    Konto bereit
                  </h3>
                  <p className="mt-1 text-[13px] font-semibold leading-6 text-[#667085]">
                    Du kannst dich jetzt mit deiner E-Mail und deinem Passwort
                    anmelden.
                  </p>
                </div>
              </div>
              <Link
                className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-[#2FA779] px-4 py-3 text-[14px] font-bold text-white shadow-button"
                href="/login"
              >
                Zur Anmeldung
              </Link>
            </div>
          ) : null}

          {step !== "success" ? (
            <p className="mt-6 text-center text-[14px] font-semibold text-[#667085]">
              Du hast schon ein Konto?{" "}
              <Link className="font-bold text-[#2FA779]" href="/login">
                Anmelden
              </Link>
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function Feedback({
  error,
  message,
}: {
  error: string | null;
  message: string | null;
}) {
  if (error) {
    return (
      <div className="mt-5 rounded-[18px] border border-[#FBE3DF] bg-[#FFF3F1] px-4 py-3 text-[13px] font-bold text-[#E14C45]">
        {error}
      </div>
    );
  }

  if (message) {
    return (
      <div className="mt-5 rounded-[18px] border border-[#DDEFE6] bg-[#F2FAF6] px-4 py-3 text-[13px] font-bold text-[#2FA779]">
        {message}
      </div>
    );
  }

  return null;
}

function TextInput({
  autoComplete,
  label,
  onChange,
  placeholder,
  type,
  value,
}: {
  autoComplete: string;
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  type: "email" | "password" | "text";
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-[13px] font-bold text-[#344054]">{label}</span>
      <input
        autoComplete={autoComplete}
        className="mt-2 w-full rounded-xl border border-[#ECEFEB] bg-[#FCFBFA] px-4 py-3 text-[14px] font-semibold text-[#101828] outline-none transition placeholder:text-[#98A2B3] focus:border-[#B9DEC7] focus:bg-white"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
    </label>
  );
}
