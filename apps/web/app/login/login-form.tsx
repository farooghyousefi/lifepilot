"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import type { User } from "@lifepilot/shared";

import { authService } from "../../src/services/auth";
import {
  getAuthErrorName,
  getGermanAuthErrorMessage,
} from "../../src/services/auth/auth-errors";

const lastEmailKey = "lifepilot:last-email";

type LoginMode = "login" | "confirm-signup" | "forgot-email" | "forgot-code";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>("login");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isCheckingUser, setIsCheckingUser] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmationCode, setConfirmationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const rememberedEmail = window.localStorage.getItem(lastEmailKey);

    if (rememberedEmail) {
      setEmail(rememberedEmail);
    }

    authService
      .getCurrentUser()
      .then(setCurrentUser)
      .finally(() => setIsCheckingUser(false));
  }, []);

  const getRedirectTarget = () => {
    const redirect = new URLSearchParams(window.location.search).get("redirect");
    return redirect && redirect.startsWith("/") ? redirect : "/dashboard";
  };

  const saveLastEmail = (value: string) => {
    window.localStorage.setItem(lastEmailKey, value);
  };

  const resetFeedback = () => {
    setError(null);
    setMessage(null);
  };

  const signIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetFeedback();

    if (currentUser) {
      router.push(getRedirectTarget());
      return;
    }

    if (!email.trim() || !password) {
      setError("Bitte gib E-Mail und Passwort ein.");
      return;
    }

    setIsLoading(true);

    try {
      saveLastEmail(email.trim());
      await authService.signIn({ email: email.trim(), password });
      router.push(getRedirectTarget());
    } catch (authError) {
      if (getAuthErrorName(authError) === "UserNotConfirmedException") {
        setMode("confirm-signup");
        setMessage(
          "Dein Konto ist noch nicht bestätigt. Gib den Code aus deiner E-Mail ein.",
        );
      } else {
        setError(getGermanAuthErrorMessage(authError));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signOutAndSwitchAccount = async () => {
    setIsLoading(true);
    resetFeedback();

    try {
      await authService.signOut();
      setCurrentUser(null);
      setPassword("");
      setMessage("Du bist abgemeldet. Du kannst jetzt ein anderes Konto nutzen.");
    } catch (authError) {
      setError(getGermanAuthErrorMessage(authError));
    } finally {
      setIsLoading(false);
    }
  };

  const confirmSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetFeedback();

    if (!email.trim() || !confirmationCode.trim()) {
      setError("Bitte gib E-Mail und Bestätigungscode ein.");
      return;
    }

    setIsLoading(true);

    try {
      await authService.confirmSignUp({
        code: confirmationCode.trim(),
        email: email.trim(),
      });
      saveLastEmail(email.trim());
      setMode("login");
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

  const requestPasswordReset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetFeedback();

    if (!email.trim()) {
      setError("Bitte gib deine E-Mail ein.");
      return;
    }

    setIsLoading(true);

    try {
      saveLastEmail(email.trim());
      await authService.forgotPassword({ email: email.trim() });
      setMode("forgot-code");
      setMessage("Wir haben dir einen Code zum Zurücksetzen gesendet.");
    } catch (authError) {
      setError(getGermanAuthErrorMessage(authError));
    } finally {
      setIsLoading(false);
    }
  };

  const confirmPasswordReset = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    resetFeedback();

    if (!email.trim() || !confirmationCode.trim() || !newPassword) {
      setError("Bitte fülle alle Felder aus.");
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }

    setIsLoading(true);

    try {
      await authService.confirmForgotPassword({
        code: confirmationCode.trim(),
        email: email.trim(),
        newPassword,
      });
      setMode("login");
      setPassword("");
      setNewPassword("");
      setNewPasswordConfirm("");
      setConfirmationCode("");
      setMessage("Dein Passwort wurde geändert. Du kannst dich jetzt anmelden.");
    } catch (authError) {
      setError(getGermanAuthErrorMessage(authError));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthScreen
      eyebrow="Sicher anmelden"
      subtitle="Deine Daten werden über Cognito geschützt."
      title="Mit deinem LifePilot Konto anmelden"
    >
      {isCheckingUser ? (
        <StatusBox tone="neutral" text="Wir prüfen deine aktuelle Sitzung..." />
      ) : currentUser ? (
        <AlreadySignedIn
          email={currentUser.email}
          isLoading={isLoading}
          onContinue={() => router.push("/dashboard")}
          onSwitch={signOutAndSwitchAccount}
        />
      ) : (
        <>
          <Feedback error={error} message={message} />

          {mode === "login" ? (
            <form className="mt-8 space-y-4" onSubmit={signIn}>
              <EmailInput email={email} setEmail={setEmail} />
              <PasswordInput
                label="Passwort"
                password={password}
                placeholder="Dein Passwort"
                setPassword={setPassword}
              />

              <button
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2FA779] px-4 py-3 text-[14px] font-bold text-white shadow-button transition hover:bg-[#258866] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isLoading}
                type="submit"
              >
                {isLoading ? "Anmeldung läuft..." : "Anmelden"}
                <ArrowRight className="size-4" aria-hidden="true" />
              </button>

              <button
                className="w-full text-center text-[13px] font-bold text-[#2FA779]"
                onClick={() => {
                  resetFeedback();
                  setMode("forgot-email");
                }}
                type="button"
              >
                Passwort vergessen?
              </button>
            </form>
          ) : null}

          {mode === "confirm-signup" ? (
            <form className="mt-8 space-y-4" onSubmit={confirmSignUp}>
              <EmailInput email={email} setEmail={setEmail} />
              <TextInput
                label="Bestätigungscode"
                onChange={setConfirmationCode}
                placeholder="Code aus deiner E-Mail"
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
                className="w-full rounded-xl border border-[#DDEFE6] px-4 py-3 text-[13px] font-bold text-[#2FA779] transition hover:bg-[#F2FAF6]"
                disabled={isLoading}
                onClick={resendCode}
                type="button"
              >
                Code erneut senden
              </button>
            </form>
          ) : null}

          {mode === "forgot-email" ? (
            <form className="mt-8 space-y-4" onSubmit={requestPasswordReset}>
              <EmailInput email={email} setEmail={setEmail} />
              <button
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2FA779] px-4 py-3 text-[14px] font-bold text-white shadow-button transition hover:bg-[#258866] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isLoading}
                type="submit"
              >
                Reset-Code senden
                <Mail className="size-4" aria-hidden="true" />
              </button>
              <BackToLogin setMode={setMode} />
            </form>
          ) : null}

          {mode === "forgot-code" ? (
            <form className="mt-8 space-y-4" onSubmit={confirmPasswordReset}>
              <EmailInput email={email} setEmail={setEmail} />
              <TextInput
                label="Reset-Code"
                onChange={setConfirmationCode}
                placeholder="Code aus deiner E-Mail"
                value={confirmationCode}
              />
              <PasswordInput
                label="Neues Passwort"
                password={newPassword}
                placeholder="Neues Passwort"
                setPassword={setNewPassword}
              />
              <PasswordInput
                label="Neues Passwort bestätigen"
                password={newPasswordConfirm}
                placeholder="Neues Passwort wiederholen"
                setPassword={setNewPasswordConfirm}
              />
              <button
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2FA779] px-4 py-3 text-[14px] font-bold text-white shadow-button transition hover:bg-[#258866] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isLoading}
                type="submit"
              >
                Passwort speichern
                <CheckCircle2 className="size-4" aria-hidden="true" />
              </button>
              <BackToLogin setMode={setMode} />
            </form>
          ) : null}

          <p className="mt-6 text-center text-[14px] font-semibold text-[#667085]">
            Noch kein Konto?{" "}
            <Link className="font-bold text-[#2FA779]" href="/register">
              Neues Konto erstellen
            </Link>
          </p>
        </>
      )}
    </AuthScreen>
  );
}

function AuthScreen({
  children,
  eyebrow,
  subtitle,
  title,
}: {
  children: React.ReactNode;
  eyebrow: string;
  subtitle: string;
  title: string;
}) {
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
              {eyebrow}
            </p>
            <h1 className="mt-3 text-[40px] font-bold leading-tight tracking-[-0.01em] text-[#101828] sm:text-[52px]">
              Dein privater Life-Manager für Verträge, Dokumente und Fristen.
            </h1>
            <p className="mt-5 text-[16px] font-semibold leading-8 text-[#667085]">
              Melde dich mit deinem LifePilot Konto an und arbeite in deinem
              persönlichen, geschützten Bereich weiter.
            </p>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <SecurityNote
              icon={ShieldCheck}
              text="Cognito schützt deinen Zugang"
              title="Sicherer Login"
            />
            <SecurityNote
              icon={LockKeyhole}
              text="Nur deine Session wird lokal genutzt"
              title="Privacy First"
            />
          </div>
        </section>

        <section className="rounded-[24px] border border-[#ECEFEB] bg-white p-6 shadow-card sm:p-8">
          <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#2FA779]">
            LifePilot Konto
          </p>
          <h2 className="mt-3 text-[30px] font-bold tracking-[-0.01em] sm:text-[32px]">
            {title}
          </h2>
          <p className="mt-2 text-[15px] font-semibold leading-7 text-[#667085]">
            {subtitle}
          </p>
          {children}
        </section>
      </div>
    </main>
  );
}

function AlreadySignedIn({
  email,
  isLoading,
  onContinue,
  onSwitch,
}: {
  email: string;
  isLoading: boolean;
  onContinue: () => void;
  onSwitch: () => void;
}) {
  return (
    <div className="mt-8 rounded-[20px] border border-[#DDEFE6] bg-[#F2FAF6] p-5">
      <div className="flex items-start gap-3">
        <div className="flex size-10 items-center justify-center rounded-2xl bg-white text-[#2FA779]">
          <CheckCircle2 className="size-5" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-[17px] font-bold text-[#101828]">
            Du bist bereits angemeldet
          </h3>
          <p className="mt-1 text-[13px] font-semibold text-[#667085]">
            Aktuelles Konto: {email}
          </p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          className="rounded-xl bg-[#2FA779] px-4 py-3 text-[14px] font-bold text-white shadow-button transition hover:bg-[#258866]"
          onClick={onContinue}
          type="button"
        >
          Zum Dashboard
        </button>
        <button
          className="rounded-xl border border-[#DDEFE6] bg-white px-4 py-3 text-[14px] font-bold text-[#2FA779] transition hover:bg-[#F8FCFA] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isLoading}
          onClick={onSwitch}
          type="button"
        >
          Abmelden und anderes Konto verwenden
        </button>
      </div>
    </div>
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
    return <StatusBox text={error} tone="error" />;
  }

  if (message) {
    return <StatusBox text={message} tone="success" />;
  }

  return null;
}

function StatusBox({
  text,
  tone,
}: {
  text: string;
  tone: "error" | "neutral" | "success";
}) {
  const className =
    tone === "error"
      ? "border-[#FBE3DF] bg-[#FFF3F1] text-[#E14C45]"
      : tone === "success"
        ? "border-[#DDEFE6] bg-[#F2FAF6] text-[#2FA779]"
        : "border-[#ECEFEB] bg-[#FCFBFA] text-[#667085]";

  return (
    <div className={`mt-5 rounded-[18px] border px-4 py-3 text-[13px] font-bold ${className}`}>
      {text}
    </div>
  );
}

function EmailInput({
  email,
  setEmail,
}: {
  email: string;
  setEmail: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[13px] font-bold text-[#344054]">E-Mail</span>
      <input
        autoComplete="email"
        className="mt-2 w-full rounded-xl border border-[#ECEFEB] bg-[#FCFBFA] px-4 py-3 text-[14px] font-semibold text-[#101828] outline-none transition placeholder:text-[#98A2B3] focus:border-[#B9DEC7] focus:bg-white"
        onChange={(event) => setEmail(event.target.value)}
        placeholder="du@example.com"
        type="email"
        value={email}
      />
    </label>
  );
}

function PasswordInput({
  label,
  password,
  placeholder,
  setPassword,
}: {
  label: string;
  password: string;
  placeholder: string;
  setPassword: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[13px] font-bold text-[#344054]">{label}</span>
      <input
        autoComplete="current-password"
        className="mt-2 w-full rounded-xl border border-[#ECEFEB] bg-[#FCFBFA] px-4 py-3 text-[14px] font-semibold text-[#101828] outline-none transition placeholder:text-[#98A2B3] focus:border-[#B9DEC7] focus:bg-white"
        onChange={(event) => setPassword(event.target.value)}
        placeholder={placeholder}
        type="password"
        value={password}
      />
    </label>
  );
}

function TextInput({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-[13px] font-bold text-[#344054]">{label}</span>
      <input
        className="mt-2 w-full rounded-xl border border-[#ECEFEB] bg-[#FCFBFA] px-4 py-3 text-[14px] font-semibold text-[#101828] outline-none transition placeholder:text-[#98A2B3] focus:border-[#B9DEC7] focus:bg-white"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type="text"
        value={value}
      />
    </label>
  );
}

function BackToLogin({
  setMode,
}: {
  setMode: (mode: LoginMode) => void;
}) {
  return (
    <button
      className="w-full text-center text-[13px] font-bold text-[#2FA779]"
      onClick={() => setMode("login")}
      type="button"
    >
      Zur Anmeldung zurück
    </button>
  );
}

function SecurityNote({
  icon: Icon,
  text,
  title,
}: {
  icon: typeof ShieldCheck;
  text: string;
  title: string;
}) {
  return (
    <article className="rounded-[18px] border border-[#ECEFEB] bg-white p-4 shadow-card">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-2xl bg-[#EAF7F0] text-[#2FA779]">
          <Icon className="size-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-[14px] font-bold text-[#101828]">{title}</p>
          <p className="mt-1 text-[12px] font-semibold text-[#667085]">
            {text}
          </p>
        </div>
      </div>
    </article>
  );
}
