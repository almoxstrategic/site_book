"use client";

import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  type ReactNode,
} from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { fetchCompanyBySlug } from "@/lib/api";
import { setCompanySlug } from "@/lib/company-scope";
import type { Company } from "@/lib/types";

type CompanyContextValue = {
  company: Company;
  companySlug: string;
};

const CompanyContext = createContext<CompanyContextValue | null>(null);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const raw = params.company_slug;
  const slug = (Array.isArray(raw) ? raw[0] : raw)?.toLowerCase().trim() ?? "";

  // Sync before paint so child queries never see a missing scope.
  useLayoutEffect(() => {
    if (slug) setCompanySlug(slug);
    // Do NOT clear on unmount — React Strict Mode remount would race fetches.
  }, [slug]);

  if (slug) {
    setCompanySlug(slug);
  }

  const { data: company, isLoading, isError, error } = useQuery({
    queryKey: ["company", slug],
    queryFn: () => fetchCompanyBySlug(slug),
    enabled: !!slug,
    retry: 1,
    staleTime: 60_000,
  });

  useLayoutEffect(() => {
    if (!slug || isLoading) return;
    if (isError || !company) {
      console.error("Empresa inválida ou falha ao carregar:", error);
      router.replace("/");
    }
  }, [slug, isLoading, isError, company, error, router]);

  const value = useMemo(() => {
    if (!company) return null;
    return { company, companySlug: company.slug };
  }, [company]);

  if (!slug || isLoading || !value) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        Carregando empresa…
      </div>
    );
  }

  return (
    <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>
  );
}

export function useCompany() {
  const ctx = useContext(CompanyContext);
  if (!ctx) {
    throw new Error("useCompany deve ser usado dentro de CompanyProvider");
  }
  return ctx;
}

/** Safe for optional use outside provider (returns null). */
export function useOptionalCompany() {
  return useContext(CompanyContext);
}
