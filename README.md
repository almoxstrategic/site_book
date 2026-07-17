# Site Book — Kanban + Relatórios

Aplicação Next.js para gestão de Site Books com board Kanban (drag-and-drop), checklist por categorias, comentários e painel de filtros com atualização em massa — persistência no Supabase.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- shadcn/ui (Radix) + lucide-react + sonner
- @dnd-kit (drag-and-drop)
- TanStack Query + Realtime Supabase
- Supabase (Postgres)

## Setup local

```bash
npm install
cp .env.example .env.local
# Preencha as variáveis no .env.local
npm run dev
```

## Variáveis de ambiente

| Variável | Onde usar | Descrição |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Cliente | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cliente | Chave **anon** (pública) |
| `SUPABASE_SERVICE_ROLE_KEY` | Servidor apenas | Chave **service_role** — nunca exponha no browser |

> O `.gitignore` ignora `.env`, `.env.local` e variantes. Apenas `.env.example` pode ir para o repositório.

## Deploy na Vercel

1. Importe o repositório no [Vercel](https://vercel.com/new).
2. Em **Project Settings → Environment Variables**, adicione:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (opcional se só usar o client anon)
3. Framework preset: **Next.js** (detectado automaticamente).
4. Build command: `npm run build` · Output: padrão Next.js.
5. Deploy.

Não é necessário `vercel.json` para este projeto.

## Schema Supabase

Tabelas: `columns`, `cards`, `checklist_categories`, `checklist_templates`, `card_checklist_items`, `comments`.

Ao criar um card, um trigger popula automaticamente todos os itens de checklist a partir dos templates.
