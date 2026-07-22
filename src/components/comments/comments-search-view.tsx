"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MessageSquare, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchComments } from "@/lib/api";
import { useSelectedCard } from "@/hooks/use-selected-card";
import type { CommentWithCard } from "@/lib/types";
import { cn } from "@/lib/utils";

function formatCommentMeta(date: string) {
  const d = new Date(date);
  const absolute = format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  const relative = formatDistanceToNow(d, { addSuffix: true, locale: ptBR });
  return { absolute, relative };
}

function highlightMatch(text: string, term: string) {
  const trimmed = term.trim();
  if (!trimmed) return text;

  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));

  return parts.map((part, index) =>
    part.toLowerCase() === trimmed.toLowerCase() ? (
      <mark
        key={`${part}-${index}`}
        className="rounded-sm bg-teal-100 px-0.5 text-teal-900"
      >
        {part}
      </mark>
    ) : (
      part
    )
  );
}

function CommentResultItem({
  comment,
  term,
  onOpen,
}: {
  comment: CommentWithCard;
  term: string;
  onOpen: () => void;
}) {
  const siteTitle =
    comment.cards?.title || comment.cards?.id || comment.card_id;
  const meta = formatCommentMeta(comment.created_at);
  const uf = comment.cards?.state?.trim();
  const attribute = comment.cards?.attribute?.trim();
  const subtitle =
    uf && attribute ? `${uf} / ${attribute}` : uf || attribute || null;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition",
        "hover:border-teal-300 hover:bg-teal-50/40 hover:shadow-md",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/40 focus-visible:ring-offset-2"
      )}
    >
      <p className="font-mono text-sm font-semibold tracking-tight text-slate-900">
        {siteTitle}
      </p>
      {subtitle && (
        <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
      )}
      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
        {highlightMatch(comment.content, term)}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
        <span className="font-medium text-slate-700">{comment.author}</span>
        <span className="text-slate-300">·</span>
        <span title={meta.absolute}>{meta.relative}</span>
        <span className="text-slate-300">·</span>
        <span>{meta.absolute}</span>
      </div>
    </button>
  );
}

export function CommentsSearchView() {
  const { openCard } = useSelectedCard();
  const [input, setInput] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedTerm(input.trim());
    }, 500);
    return () => window.clearTimeout(timer);
  }, [input]);

  function runSearch() {
    setDebouncedTerm(input.trim());
  }

  const {
    data: results = [],
    isFetching,
    isError,
    error,
  } = useQuery({
    queryKey: ["comments-search", debouncedTerm],
    queryFn: () => searchComments(debouncedTerm),
    enabled: debouncedTerm.length > 0,
  });

  const hasTerm = debouncedTerm.length > 0;
  const showEmptyResults = hasTerm && !isFetching && results.length === 0;

  return (
    <div className="flex flex-1 flex-col gap-4 pb-8">
      <div className="shrink-0 rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur sm:p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800">
          <MessageSquare className="h-4 w-4 text-teal-700" />
          Pesquisar Comentários
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="search"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  runSearch();
                }
              }}
              placeholder="Buscar em todos os comentários..."
              className="pl-9"
              aria-label="Buscar em todos os comentários"
            />
          </div>
          <Button
            type="button"
            className="shrink-0 sm:w-auto"
            onClick={runSearch}
            disabled={!input.trim() || isFetching}
          >
            <Search className="h-4 w-4" />
            Pesquisar
          </Button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          A busca é feita automaticamente após 500ms de digitação, ou ao
          clicar em Pesquisar.
        </p>
      </div>

      <div className="flex min-h-[50vh] flex-1 flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-800">Resultados</p>
            <p className="text-xs text-slate-500">
              {!hasTerm
                ? "Digite um termo para buscar"
                : isFetching
                  ? "Buscando…"
                  : `${results.length} comentário(s) encontrado(s)`}
            </p>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {isError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-8 text-center text-sm text-rose-700">
              {(error as Error)?.message ||
                "Erro ao buscar comentários. Tente novamente."}
            </div>
          )}

          {!hasTerm && !isError && (
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-16 text-center">
              <MessageSquare className="h-10 w-10 text-slate-300" />
              <p className="text-sm font-medium text-slate-600">
                Busque em todos os comentários
              </p>
              <p className="max-w-sm text-xs text-slate-500">
                Digite palavras-chave para encontrar conversas em qualquer site
                do board.
              </p>
            </div>
          )}

          {showEmptyResults && (
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-16 text-center">
              <Search className="h-10 w-10 text-slate-300" />
              <p className="text-sm font-medium text-slate-600">
                Nenhum comentário encontrado para esta pesquisa
              </p>
              <p className="max-w-sm text-xs text-slate-500">
                Tente outro termo ou verifique a ortografia.
              </p>
            </div>
          )}

          {results.map((comment) => (
            <CommentResultItem
              key={comment.id}
              comment={comment}
              term={debouncedTerm}
              onOpen={() => openCard(comment.card_id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
