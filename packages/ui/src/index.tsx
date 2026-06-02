import type { ReactNode } from "react";

export interface StatTileProps {
  label: string;
  value: string;
  tone?: "mint" | "blue" | "coral";
}

const toneClasses: Record<NonNullable<StatTileProps["tone"]>, string> = {
  mint: "border-emerald-200 bg-emerald-50 text-emerald-950",
  blue: "border-sky-200 bg-sky-50 text-sky-950",
  coral: "border-rose-200 bg-rose-50 text-rose-950",
};

export function StatTile({
  label,
  value,
  tone = "mint",
}: StatTileProps) {
  return (
    <div className={`rounded-lg border p-4 ${toneClasses[tone]}`}>
      <p className="text-sm font-medium opacity-75">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-normal">{value}</p>
    </div>
  );
}

export interface PillProps {
  children: ReactNode;
}

export function Pill({ children }: PillProps) {
  return (
    <span className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-sm font-medium text-white">
      {children}
    </span>
  );
}
