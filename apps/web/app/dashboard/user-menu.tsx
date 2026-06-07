"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut, ShieldCheck } from "lucide-react";
import type { User } from "@lifepilot/shared";

import { authService } from "../../src/services/auth";

export function UserMenu() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    let isMounted = true;

    authService
      .getCurrentUser()
      .then((currentUser) => {
        if (isMounted) {
          setUser(currentUser);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const signOut = async () => {
    setIsSigningOut(true);
    await authService.signOut();
    setUser(null);
    router.replace("/login");
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-[#ECEFEB] bg-white px-4 py-3 text-[13px] font-semibold text-[#667085] shadow-button">
        Sitzung wird geprüft...
      </div>
    );
  }

  if (!user) {
    return (
      <Link
        className="rounded-2xl bg-[#2FA779] px-4 py-3 text-[13px] font-bold text-white shadow-button transition hover:bg-[#278F68]"
        href="/login"
      >
        Einloggen
      </Link>
    );
  }

  const isMockUser = user.provider === "mock";
  const displayName = user.name || user.email || "LifePilot Nutzer";
  const displayEmail = user.email || "Keine E-Mail";

  const initials =
    displayName
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "LP";

  return (
    <div className="flex items-center gap-3 rounded-[18px] border border-[#ECEFEB] bg-white px-3 py-2 shadow-button">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#2F80ED] text-sm font-bold text-white">
        {initials}
      </div>

      <div className="hidden min-w-0 lg:block">
        <p className="max-w-40 truncate text-[13px] font-bold text-[#101828]">
          {displayName}
        </p>

        <p className="max-w-44 truncate text-[12px] font-semibold text-[#667085]">
          {isMockUser ? "Demo-Modus · lokal angemeldet" : displayEmail}
        </p>
      </div>

      <div className="hidden items-center gap-1 rounded-full bg-[#EAF7F0] px-2.5 py-1 text-[11px] font-bold text-[#2FA779] xl:flex">
        <ShieldCheck className="size-3.5" aria-hidden="true" />
        {isMockUser ? "Demo" : "Cognito"}
      </div>

      <button
        aria-label="Abmelden"
        className="flex size-9 items-center justify-center rounded-xl text-[#667085] transition hover:bg-[#F7F8F5] hover:text-[#101828]"
        disabled={isSigningOut}
        onClick={signOut}
        type="button"
      >
        <LogOut className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}