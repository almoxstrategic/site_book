"use client";

import { BookOpen, Columns3, LayoutDashboard } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { FiltersDashboard } from "@/components/dashboard/filters-dashboard";
import { SitesTotalCard } from "@/components/dashboard/sites-total-card";
import { SelectedCardProvider } from "@/hooks/use-selected-card";

export default function Home() {
  return (
    <div className="mx-auto flex h-full w-full min-h-0 min-w-0 max-w-[1600px] flex-1 flex-col overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
      <header className="animate-fade-up mb-4 shrink-0">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2 text-teal-800">
              <BookOpen className="h-6 w-6" strokeWidth={1.75} />
              <span className="text-sm font-semibold uppercase tracking-[0.18em]">
                Site Book
              </span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Gestão de projetos
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-600 sm:text-base">
              Kanban operacional e painel de filtros para acompanhar ARTs,
              laudos e certificados em todos os sites.
            </p>
          </div>
          <SitesTotalCard />
        </div>
      </header>

      <SelectedCardProvider>
        <Tabs
          defaultValue="kanban"
          className="animate-fade-up-delay flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
        >
          <TabsList className="shrink-0">
            <TabsTrigger value="kanban" className="gap-2">
              <Columns3 className="h-4 w-4" />
              Kanban
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Relatórios
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="kanban"
            className="mt-4 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden outline-none data-[state=inactive]:hidden"
          >
            <KanbanBoard />
          </TabsContent>

          <TabsContent
            value="dashboard"
            className="mt-4 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden outline-none data-[state=inactive]:hidden"
          >
            <FiltersDashboard />
          </TabsContent>
        </Tabs>
      </SelectedCardProvider>
    </div>
  );
}
