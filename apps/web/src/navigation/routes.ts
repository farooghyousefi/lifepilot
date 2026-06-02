export const publicRoutes = ["/", "/login", "/register"] as const;

export const appRoutes = [
  "/dashboard",
  "/contracts",
  "/documents",
  "/vault",
  "/reminders",
  "/insights",
  "/ai-assistant",
  "/settings",
] as const;

export type PublicRoute = (typeof publicRoutes)[number];
export type AppRoute = (typeof appRoutes)[number];

export const isPublicRoute = (pathname: string): boolean =>
  publicRoutes.some((route) => route === pathname);

export const isAppRoute = (pathname: string): boolean =>
  appRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
