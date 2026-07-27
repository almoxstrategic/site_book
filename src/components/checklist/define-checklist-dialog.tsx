"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ListPlus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCompany } from "@/hooks/use-company";
import {
  fetchCompanyDefaultChecklist,
  saveCompanyDefaultChecklist,
} from "@/lib/api";
import type { ChecklistTemplateGroup } from "@/lib/checklist-templates";
import { tryGetCompanySlug } from "@/lib/company-scope";

const companyPart = () => tryGetCompanySlug() ?? "none";

export const companyChecklistConfigKey = () =>
  ["company-checklist-config", companyPart()] as const;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DefineChecklistDialog({ open, onOpenChange }: Props) {
  const { company, companySlug } = useCompany();
  const qc = useQueryClient();
  const [groups, setGroups] = useState<ChecklistTemplateGroup[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: companyChecklistConfigKey(),
    queryFn: () => fetchCompanyDefaultChecklist(companySlug),
    enabled: open && !!companySlug,
  });

  useEffect(() => {
    if (!open) return;
    if (data) {
      setGroups(
        data.length > 0
          ? data.map((g) => ({
              category: g.category,
              items: [...g.items],
            }))
          : [{ category: "", items: [""] }]
      );
    }
  }, [open, data]);

  const save = useMutation({
    mutationFn: () => saveCompanyDefaultChecklist(groups, companySlug),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: companyChecklistConfigKey() });
      toast.success("Checklist padrão salvo");
      onOpenChange(false);
    },
    onError: (e: Error) =>
      toast.error(e.message || "Erro ao salvar checklist padrão"),
  });

  function updateCategory(index: number, category: string) {
    setGroups((prev) =>
      prev.map((g, i) => (i === index ? { ...g, category } : g))
    );
  }

  function updateItem(groupIndex: number, itemIndex: number, value: string) {
    setGroups((prev) =>
      prev.map((g, i) =>
        i === groupIndex
          ? {
              ...g,
              items: g.items.map((item, j) =>
                j === itemIndex ? value : item
              ),
            }
          : g
      )
    );
  }

  function addCategory() {
    setGroups((prev) => [...prev, { category: "", items: [""] }]);
  }

  function removeCategory(index: number) {
    setGroups((prev) => prev.filter((_, i) => i !== index));
  }

  function addItem(groupIndex: number) {
    setGroups((prev) =>
      prev.map((g, i) =>
        i === groupIndex ? { ...g, items: [...g.items, ""] } : g
      )
    );
  }

  function removeItem(groupIndex: number, itemIndex: number) {
    setGroups((prev) =>
      prev.map((g, i) =>
        i === groupIndex
          ? { ...g, items: g.items.filter((_, j) => j !== itemIndex) }
          : g
      )
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <div className="border-b border-slate-100 px-6 py-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            <ListPlus className="h-4 w-4 text-slate-500" />
            Definir Checklist — {company.name}
          </DialogTitle>
          <p className="mt-1 text-xs text-slate-500">
            Defina as categorias e tarefas padrão aplicadas aos sites desta
            empresa.
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <p className="text-sm text-slate-500">Carregando…</p>
          ) : (
            groups.map((group, groupIndex) => (
              <section
                key={groupIndex}
                className="rounded-lg border border-slate-200 bg-slate-50/50 p-3"
              >
                <div className="mb-3 flex items-end gap-2">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Label>Categoria / Tópico</Label>
                    <Input
                      value={group.category}
                      onChange={(e) =>
                        updateCategory(groupIndex, e.target.value)
                      }
                      placeholder="Ex: ART"
                      className="h-9 bg-white"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                    onClick={() => removeCategory(groupIndex)}
                    aria-label="Remover categoria"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2 pl-1">
                  <Label className="text-xs text-slate-500">Tarefas</Label>
                  {group.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="flex items-center gap-2">
                      <Input
                        value={item}
                        onChange={(e) =>
                          updateItem(groupIndex, itemIndex, e.target.value)
                        }
                        placeholder="Nome da tarefa"
                        className="h-8 bg-white text-sm"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-slate-400 hover:text-rose-600"
                        onClick={() => removeItem(groupIndex, itemIndex)}
                        aria-label="Remover tarefa"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 px-2 text-xs text-teal-800 hover:bg-teal-50"
                    onClick={() => addItem(groupIndex)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Novo item
                  </Button>
                </div>
              </section>
            ))
          )}

          {!isLoading && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={addCategory}
            >
              <Plus className="h-3.5 w-3.5" />
              Nova categoria
            </Button>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={save.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={save.isPending || isLoading}
            onClick={() => save.mutate()}
          >
            Salvar checklist
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
