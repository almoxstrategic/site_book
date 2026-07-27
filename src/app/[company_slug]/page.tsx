"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Bell,
  BookOpen,
  Columns3,
  LayoutDashboard,
  ListTodo,
  MessageSquare,
  Users,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { FiltersDashboard } from "@/components/dashboard/filters-dashboard";
import { CommentsSearchView } from "@/components/comments/comments-search-view";
import { TeamKanbanView } from "@/components/team/team-kanban-view";
import {
  dueRemindersCountKey,
  RemindersView,
} from "@/components/reminders/reminders-view";
import { DefineChecklistDialog } from "@/components/checklist/define-checklist-dialog";
import { SitesTotalCard } from "@/components/dashboard/sites-total-card";
import { SelectedCardProvider } from "@/hooks/use-selected-card";
import { useCompany } from "@/hooks/use-company";
import { fetchDueRemindersCount } from "@/lib/api";

export default function CompanyHomePage() {
  const { company } = useCompany();
  const [defineChecklistOpen, setDefineChecklistOpen] = useState(false);

  const { data: dueCount = 0 } = useQuery({
    queryKey: dueRemindersCountKey(),
    queryFn: fetchDueRemindersCount,
    enabled: !!company.slug,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const hasDueReminders = dueCount > 0;

  return (
    <div className="mx-auto flex min-h-screen w-full min-w-0 max-w-[1600px] flex-1 flex-col overflow-x-hidden px-4 py-3 pb-8 sm:px-6 lg:px-8">
      <header className="animate-fade-up mb-2 shrink-0">
        <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-0.5 flex items-center gap-2 text-teal-800">
              <BookOpen className="h-4 w-4" strokeWidth={1.75} />
              <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                Site Book
              </span>
              <span className="text-slate-300">·</span>
              <Link
                href="/"
                className="text-xs font-medium text-slate-500 underline-offset-2 hover:text-teal-800 hover:underline"
              >
                Trocar empresa
              </Link>
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
              Gestão de Projetos - {company.name.toUpperCase()}
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
          className="animate-fade-up-delay flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden"
        >
          <TabsList className="flex h-auto w-full shrink-0 flex-wrap items-center justify-start gap-1">
            <TabsTrigger value="kanban" className="gap-2">
              <Columns3 className="h-4 w-4" />
              Kanban de Sitebook
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Relatórios
            </TabsTrigger>
            <TabsTrigger value="comments-search" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Pesquisar Comentários
            </TabsTrigger>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="ml-auto h-10 gap-2 rounded-md px-4 text-sm font-medium text-slate-600 hover:bg-white hover:text-teal-800 hover:shadow-sm"
              onClick={() => setDefineChecklistOpen(true)}
            >
              <ListTodo className="h-4 w-4" />
              Definir Check list
            </Button>
            <TabsTrigger value="reminders" className="relative gap-2">
              <Bell className="h-4 w-4" />
              Lembretes
              {hasDueReminders && (
                <span
                  className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white"
                  aria-label={`${dueCount} lembrete(s) para hoje ou atrasados`}
                  title={`${dueCount} lembrete(s) para hoje ou atrasados`}
                />
              )}
            </TabsTrigger>
            <TabsTrigger value="team-kanban" className="gap-2">
              <Users className="h-4 w-4" />
              Kanban de Equipe
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

          <TabsContent
            value="comments-search"
            className="mt-2 flex min-h-0 min-w-0 flex-1 flex-col outline-none data-[state=inactive]:hidden"
          >
            <CommentsSearchView />
          </TabsContent>

          <TabsContent
            value="reminders"
            className="mt-2 flex min-h-0 min-w-0 flex-1 flex-col outline-none data-[state=inactive]:hidden"
          >
            <RemindersView />
          </TabsContent>

          <TabsContent
            value="team-kanban"
            className="mt-2 flex h-[calc(100dvh-11rem)] min-h-[28rem] min-w-0 flex-col overflow-hidden outline-none data-[state=inactive]:hidden"
          >
            <TeamKanbanView />
          </TabsContent>
        </Tabs>

        <DefineChecklistDialog
          open={defineChecklistOpen}
          onOpenChange={setDefineChecklistOpen}
        />
      </SelectedCardProvider>
    </div>
  );
}
