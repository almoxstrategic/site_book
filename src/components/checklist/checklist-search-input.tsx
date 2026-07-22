"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

type Props = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export function ChecklistSearchInput({ value, onChange, className }: Props) {
  return (
    <div className={className ?? "relative mb-4"}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Filtrar tópicos, subtópicos ou tarefas..."
        className="pl-9"
        aria-label="Filtrar checklist"
      />
    </div>
  );
}
