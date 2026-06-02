"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronDown, LogOut } from "lucide-react";
import type { User } from "@lifepilot/shared";

import { authService } from "../../src/services/auth";

export function UserMenu() {
  const [user, setUser] = useState<User | null>(null);
  const [isSignedOut, setIsSignedOut] = useState(false);

  useEffect(() => {
    authService.getCurrentUser().then(setUser);
  }, []);

  const signOut = async () => {
    await authService.signOut();
    setUser(null);
    setIsSignedOut(true);
  };

  const initials =
    user?.name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "LP";

  return (
    <div className="flex items-center gap-2">
      <div className="flex size-11 items-center justify-center rounded-full bg-[#2F80ED] text-sm font-bold text-white">
        {initials}
      </div>
      <div className="hidden min-w-0 lg:block">
        <p className="max-w-32 truncate text-[13px] font-bold text-[#101828]">
          {user?.name ?? "Demo user"}
        </p>
        <p className="max-w-32 truncate text-[12px] font-semibold text-[#667085]">
          {isSignedOut ? "Signed out" : "Mock auth"}
        </p>
      </div>
      <button
        aria-label="Sign out"
        className="flex size-9 items-center justify-center rounded-xl text-[#667085] transition hover:bg-[#F7F8F5] hover:text-[#101828]"
        onClick={signOut}
        type="button"
      >
        <LogOut className="size-4" aria-hidden="true" />
      </button>
      {isSignedOut ? (
        <Link
          className="rounded-xl bg-[#EAF7F0] px-3 py-2 text-[12px] font-bold text-[#2FA779]"
          href="/login"
        >
          Sign in
        </Link>
      ) : (
        <ChevronDown className="size-5 text-[#101828]" aria-hidden="true" />
      )}
    </div>
  );
}
