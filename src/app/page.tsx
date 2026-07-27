"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  BookOpen,
  Building2,
  MoreHorizontal,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  createCompany,
  deleteCompany,
  fetchCompanies,
  updateCompany,
} from "@/lib/api";
import { slugifyCompanyName } from "@/lib/company-scope";
import type { Company } from "@/lib/types";
import { cn } from "@/lib/utils";

type CompanyForm = {
  name: string;
  slug: string;
};

const emptyForm: CompanyForm = { name: "", slug: "" };

export default function HubPage() {
  const qc = useQueryClient();
  const { data: companies = [], isLoading, isError, error } = useQuery({
    queryKey: ["companies"],
    queryFn: fetchCompanies,
    staleTime: 30_000,
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [form, setForm] = useState<CompanyForm>(emptyForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const [menuOpenSlug, setMenuOpenSlug] = useState<string | null>(null);

  useEffect(() => {
    if (!dialogOpen) return;
    if (editing) {
      setForm({ name: editing.name, slug: editing.slug });
      setSlugTouched(true);
    } else {
      setForm(emptyForm);
      setSlugTouched(false);
    }
  }, [dialogOpen, editing]);

  const saveCompany = useMutation({
    mutationFn: async () => {
      const name = form.name.trim();
      const slug = form.slug.trim().toLowerCase();
      if (!name) throw new Error("Informe o nome da empresa");
      if (!slug) throw new Error("Informe o slug da empresa");
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
        throw new Error("Slug inválido. Use apenas letras, números e hífens.");
      }

      if (editing) {
        return updateCompany({
          currentSlug: editing.slug,
          name,
          slug,
        });
      }
      return createCompany({ name, slug });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["companies"] });
      setDialogOpen(false);
      setEditing(null);
      toast.success(editing ? "Empresa atualizada" : "Empresa criada");
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao salvar empresa"),
  });

  const removeCompany = useMutation({
    mutationFn: deleteCompany,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Empresa excluída");
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao excluir empresa"),
  });

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(company: Company) {
    setEditing(company);
    setDialogOpen(true);
    setMenuOpenSlug(null);
  }

  function handleDelete(company: Company) {
    setMenuOpenSlug(null);
    if (company.slug === "global") {
      toast.error("A empresa Global não pode ser excluída.");
      return;
    }
    const ok = window.confirm(
      `Tem certeza que deseja excluir "${company.name}"?\n\n` +
        "ATENÇÃO: todos os sites, checklists, comentários, tarefas, históricos e lembretes vinculados a esta empresa serão APAGADOS permanentemente."
    );
    if (!ok) return;
    removeCompany.mutate(company.slug);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    saveCompany.mutate();
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="text-center sm:text-left">
          <div className="mb-2 inline-flex items-center gap-1.5 text-teal-800">
            <BookOpen className="h-4 w-4" strokeWidth={1.75} />
            <span className="text-xs font-semibold uppercase tracking-[0.18em]">
              Site Book
            </span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Selecione a empresa
          </h1>
          <p className="mt-2 max-w-xl text-sm text-slate-600 sm:text-base">
            Escolha o ambiente de trabalho. Cada empresa mantém seus sites,
            checklists, relatórios e lembretes isolados.
          </p>
        </div>
        <Button type="button" className="gap-2 self-center sm:self-auto" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nova Empresa
        </Button>
      </header>

      {isLoading && (
        <p className="text-sm text-slate-500">Carregando empresas…</p>
      )}

      {isError && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Não foi possível carregar as empresas.
          {error instanceof Error ? ` ${error.message}` : ""}
        </p>
      )}

      {!isLoading && !isError && companies.length === 0 && (
        <p className="text-sm text-slate-500">Nenhuma empresa cadastrada.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {companies.map((company) => (
          <div
            key={company.slug}
            className={cn(
              "relative flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition",
              "hover:border-teal-300 hover:shadow-md"
            )}
          >
            <div className="absolute right-3 top-3">
              <Popover
                open={menuOpenSlug === company.slug}
                onOpenChange={(open) =>
                  setMenuOpenSlug(open ? company.slug : null)
                }
              >
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-slate-700"
                    aria-label={`Opções de ${company.name}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-40 p-1">
                  <button
                    type="button"
                    className="flex w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                    onClick={() => openEdit(company)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="flex w-full rounded-md px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 disabled:opacity-40"
                    disabled={company.slug === "global"}
                    onClick={() => handleDelete(company)}
                  >
                    Excluir
                  </button>
                </PopoverContent>
              </Popover>
            </div>

            <Link
              href={`/${company.slug}`}
              className="flex min-w-0 flex-1 flex-col rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-teal-600/40"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-teal-50 text-teal-800">
                {company.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={company.logo_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Building2 className="h-6 w-6" />
                )}
              </div>
              <div className="flex items-start justify-between gap-3 pr-6">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-semibold text-slate-900">
                    {company.name}
                  </h2>
                  <p className="mt-0.5 font-mono text-xs uppercase tracking-wide text-slate-400">
                    /{company.slug}
                  </p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-300" />
              </div>
            </Link>
          </div>
        ))}
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogTitle>
            {editing ? "Editar empresa" : "Nova empresa"}
          </DialogTitle>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">Nome</Label>
              <Input
                id="company-name"
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm((prev) => ({
                    name,
                    slug: !slugTouched
                      ? slugifyCompanyName(name)
                      : prev.slug,
                  }));
                }}
                placeholder="Ex: Acme Engenharia"
                className="h-9"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-slug">Slug</Label>
              <Input
                id="company-slug"
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setForm((prev) => ({
                    ...prev,
                    slug: slugifyCompanyName(e.target.value),
                  }));
                }}
                placeholder="acme-engenharia"
                className="h-9 font-mono text-sm"
                disabled={editing?.slug === "global"}
              />
              <p className="text-xs text-slate-500">
                Usado na URL: /{form.slug || "…"}
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saveCompany.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saveCompany.isPending}>
                {editing ? "Salvar Alterações" : "Criar Empresa"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
