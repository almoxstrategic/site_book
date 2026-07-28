/** Client-side active company scope for Supabase queries. Set by CompanyProvider. */

let activeCompanySlug: string | null = null;

export function setCompanySlug(slug: string | null) {
  activeCompanySlug = slug?.trim().toLowerCase() || null;
}

export function getCompanySlug(): string {
  if (!activeCompanySlug) {
    throw new Error(
      "Escopo de empresa não definido. Acesse a aplicação via /[company_slug]."
    );
  }
  return activeCompanySlug;
}

export function tryGetCompanySlug(): string | null {
  return activeCompanySlug;
}

/** Never pass undefined/null into Supabase `.eq('company_slug', …)` — it drops the filter. */
export function assertCompanySlug(slug: string | null | undefined): string {
  const normalized = typeof slug === "string" ? slug.trim().toLowerCase() : "";
  if (!normalized) {
    throw new Error(
      "company_slug ausente ou inválido. Escopo de empresa obrigatório."
    );
  }
  return normalized;
}

export function slugifyCompanyName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}
