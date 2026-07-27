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

export function slugifyCompanyName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}
