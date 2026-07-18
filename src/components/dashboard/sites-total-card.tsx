"use client";

import { useBoardData } from "@/hooks/use-board";

export function SitesTotalCard() {
  const { cards, isLoading } = useBoardData();
  const total = cards.length;

  return (
    <div className="flex min-h-[7.5rem] min-w-[160px] flex-col justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:min-w-[180px]">
      <p className="text-sm font-medium text-slate-500">Total de Sites</p>
      <p className="text-3xl font-bold tabular-nums tracking-tight text-teal-800 sm:text-4xl">
        {isLoading ? "—" : total}
      </p>
    </div>
  );
}
