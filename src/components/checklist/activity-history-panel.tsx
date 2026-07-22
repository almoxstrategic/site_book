"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { History } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { ActivityHistoryEntry } from "@/lib/types";

type Props = {
  entries: ActivityHistoryEntry[];
  isLoading?: boolean;
  /** When null/undefined, header title is hidden (e.g. inside a tab). */
  title?: string | null;
};

export function ActivityHistoryPanel({
  entries,
  isLoading,
  title = "Histórico",
}: Props) {
  const [historySearch, setHistorySearch] = useState("");

  const filtered = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((entry) =>
      entry.action_description.toLowerCase().includes(q)
    );
  }, [entries, historySearch]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {title ? (
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
          <History className="h-4 w-4 text-slate-500" />
          {title}
        </div>
      ) : null}

      <Input
        type="search"
        value={historySearch}
        onChange={(e) => setHistorySearch(e.target.value)}
        placeholder="Pesquisar histórico..."
        className="mb-4 h-8 bg-white text-sm"
        aria-label="Pesquisar histórico"
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <p className="text-sm text-slate-500">Carregando histórico…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-slate-500">
            {historySearch.trim()
              ? "Nenhum registro corresponde à busca."
              : "Nenhuma atividade registrada ainda."}
          </p>
        ) : (
          <ul className="space-y-3">
            {filtered.map((entry) => (
              <li
                key={entry.id}
                className="rounded-md border border-slate-100 bg-white/80 px-3 py-2.5"
              >
                <p className="text-sm leading-snug text-slate-700">
                  {entry.action_description}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {format(
                    new Date(entry.created_at),
                    "dd/MM/yyyy 'às' HH:mm"
                  )}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
