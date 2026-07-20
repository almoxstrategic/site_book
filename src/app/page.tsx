"use client";

import { BookOpen, Columns3, LayoutDashboard } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { FiltersDashboard } from "@/components/dashboard/filters-dashboard";
import { SitesTotalCard } from "@/components/dashboard/sites-total-card";
import { SelectedCardProvider } from "@/hooks/use-selected-card";

export default function Home() {
  return (
    <div className="mx-auto flex min-h-screen w-full min-w-0 max-w-[1600px] flex-1 flex-col px-4 py-3 pb-8 sm:px-6 lg:px-8">
      <header className="animate-fade-up mb-2 shrink-0">
        <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-0.5 flex items-center gap-1.5 text-teal-800">
              <BookOpen className="h-4 w-4" strokeWidth={1.75} />
              <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                Site Book
              </span>
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
              Gestão de projetos
            </h1>
            <p className="mt-0.5 max-w-xl text-xs text-slate-600 sm:text-sm">
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
          className="animate-fade-up-delay flex min-h-0 min-w-0 flex-1 flex-col"
        >
          <TabsList className="flex h-auto w-full shrink-0 flex-wrap justify-start gap-1 sm:w-auto">
            <TabsTrigger value="kanban" className="flex-1 gap-2 sm:flex-none">
              <Columns3 className="h-4 w-4" />
              Kanban
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="flex-1 gap-2 sm:flex-none">
              <LayoutDashboard className="h-4 w-4" />
              Relatórios
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="kanban"
            className="mt-2 flex h-[calc(100dvh-11rem)] min-h-[28rem] min-w-0 flex-col overflow-hidden outline-none data-[state=inactive]:hidden"
          >
            <KanbanBoard />
          </TabsContent>

          <TabsContent
            value="dashboard"
            className="mt-2 flex min-h-0 min-w-0 flex-1 flex-col outline-none data-[state=inactive]:hidden"
          >
            <FiltersDashboard />
          </TabsContent>
        </Tabs>
      </SelectedCardProvider>
    </div>
  );
}
