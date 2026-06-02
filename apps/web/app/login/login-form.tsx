"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";

import { authService } from "../../src/services/auth";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("demo@lifepilot.local");
  const [password, setPassword] = useState("demo-password");
  const [message, setMessage] = useState<string | null>(null);

  const signIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await authService.signIn({ email, password });
    setMessage("Signed in with mock auth. No real credentials were used.");
    router.push("/dashboard");
  };

  return (
    <AuthScreen
      eyebrow="Welcome back"
      message={message}
      subtitle="Sign in to continue to your calm Life Pilot workspace."
      title="Sign in"
    >
      <form className="mt-8 space-y-4" onSubmit={signIn}>
        <label className="block">
          <span className="text-[13px] font-bold text-[#344054]">Email</span>
          <input
            className="mt-2 w-full rounded-xl border border-[#ECEFEB] bg-[#FCFBFA] px-4 py-3 text-[14px] font-semibold text-[#101828] outline-none transition placeholder:text-[#98A2B3] focus:border-[#B9DEC7] focus:bg-white"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            type="email"
            value={email}
          />
        </label>

        <label className="block">
          <span className="text-[13px] font-bold text-[#344054]">
            Password
          </span>
          <input
            className="mt-2 w-full rounded-xl border border-[#ECEFEB] bg-[#FCFBFA] px-4 py-3 text-[14px] font-semibold text-[#101828] outline-none transition placeholder:text-[#98A2B3] focus:border-[#B9DEC7] focus:bg-white"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            type="password"
            value={password}
          />
        </label>

        <button
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2FA779] px-4 py-3 text-[14px] font-bold text-white shadow-button transition hover:bg-[#258866]"
          type="submit"
        >
          Sign in
          <ArrowRight className="size-4" aria-hidden="true" />
        </button>
      </form>

      <p className="mt-6 text-center text-[14px] font-semibold text-[#667085]">
        New to Life Pilot?{" "}
        <Link className="font-bold text-[#2FA779]" href="/register">
          Create account
        </Link>
      </p>
    </AuthScreen>
  );
}

function AuthScreen({
  children,
  eyebrow,
  message,
  subtitle,
  title,
}: {
  children: React.ReactNode;
  eyebrow: string;
  message: string | null;
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
              Your private life manager, ready for secure access.
            </h1>
            <p className="mt-5 text-[16px] font-semibold leading-8 text-[#667085]">
              Auth is currently running in demo mode. Cognito is prepared in the
              foundation, but no real user account is created yet.
            </p>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <SecurityNote
              icon={ShieldCheck}
              text="No real user data"
              title="Demo safe"
            />
            <SecurityNote
              icon={LockKeyhole}
              text="Cognito-ready boundary"
              title="Security first"
            />
          </div>
        </section>

        <section className="rounded-[24px] border border-[#ECEFEB] bg-white p-6 shadow-card sm:p-8">
          <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#2FA779]">
            Life Pilot Auth
          </p>
          <h2 className="mt-3 text-[32px] font-bold tracking-[-0.01em]">
            {title}
          </h2>
          <p className="mt-2 text-[15px] font-semibold leading-7 text-[#667085]">
            {subtitle}
          </p>
          {message ? (
            <div className="mt-5 rounded-[18px] border border-[#DDEFE6] bg-[#F2FAF6] px-4 py-3 text-[13px] font-bold text-[#2FA779]">
              {message}
            </div>
          ) : null}
          {children}
        </section>
      </div>
    </main>
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
