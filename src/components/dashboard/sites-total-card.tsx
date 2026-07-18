"use client";

import { useBoardData } from "@/hooks/use-board";

export function SitesTotalCard() {
  const { cards, isLoading } = useBoardData();
  const total = cards.length;

  return (
    <div className="flex w-full min-h-[6.5rem] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-4 text-center shadow-sm md:w-auto md:min-w-[180px]">
      <p className="text-sm font-medium text-slate-500">Total de Sites</p>
      <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-teal-800 sm:text-4xl">
        {isLoading ? "—" : total}
      </p>
    </div>
  );
}
