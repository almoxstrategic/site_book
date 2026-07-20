"use client";

import { useBoardData } from "@/hooks/use-board";

export function SitesTotalCard() {
  const { cards, isLoading } = useBoardData();
  const total = cards.length;

  return (
    <div className="flex w-full flex-col items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-center shadow-sm md:w-auto md:min-w-[140px]">
      <p className="text-xs font-medium text-slate-500">Total de Sites</p>
      <p className="mt-0.5 text-2xl font-bold tabular-nums tracking-tight text-teal-800 sm:text-3xl">
        {isLoading ? "—" : total}
      </p>
    </div>
  );
}
