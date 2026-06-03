"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";

import { authService } from "../../services/auth";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAllowed, setIsAllowed] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;

    authService
      .isAuthenticated()
      .then((authenticated) => {
        if (!isMounted) {
          return;
        }

        if (authenticated) {
          setIsAllowed(true);
          return;
        }

        const query = window.location.search;
        const redirectTarget = `${pathname}${query}`;

        router.replace(
          `/login?redirect=${encodeURIComponent(redirectTarget)}`,
        );
      })
      .finally(() => {
        if (isMounted) {
          setIsChecking(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [pathname, router]);

  if (isChecking || !isAllowed) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-5">
        <div className="max-w-sm rounded-[22px] border border-[#ECEFEB] bg-white p-6 text-center shadow-card">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[#EAF7F0] text-[#2FA779]">
            <ShieldCheck className="size-6" aria-hidden="true" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-[#101828]">
            Sitzung wird geprüft
          </h1>
          <p className="mt-2 text-[14px] font-semibold leading-6 text-[#667085]">
            Wir prüfen kurz, ob du angemeldet bist.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
