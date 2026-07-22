import * as XLSX from "xlsx";
import { checklistItemLabel, DEFAULT_CHECKLIST } from "@/lib/checklist-defaults";
import type { Card, CardChecklistItem } from "@/lib/types";

function collectTaskLabels(checklist: CardChecklistItem[]): string[] {
  const fromDefaults = DEFAULT_CHECKLIST.flatMap((g) => g.items);
  const seen = new Set(fromDefaults);
  const extras: string[] = [];

  for (const item of checklist) {
    const label = checklistItemLabel(item);
    if (label === "Item") continue;
    if (!seen.has(label)) {
      seen.add(label);
      extras.push(label);
    }
  }

  extras.sort((a, b) => a.localeCompare(b));
  return [...fromDefaults, ...extras];
}

/** Exports Kanban site books. Pass already-filtered cards to mirror the current view. */
export function exportSitebooksToExcel(
  cards: Card[],
  checklist: CardChecklistItem[]
) {
  const taskLabels = collectTaskLabels(checklist);

  const statusByCardTask = new Map<string, Map<string, boolean>>();
  for (const item of checklist) {
    const task = checklistItemLabel(item);
    if (!statusByCardTask.has(item.card_id)) {
      statusByCardTask.set(item.card_id, new Map());
    }
    statusByCardTask.get(item.card_id)!.set(task, item.is_completed);
  }

  const sortedCards = [...cards].sort((a, b) =>
    (a.title || a.id).localeCompare(b.title || b.id)
  );

  const baseHeaders = ["Site", "UF", "ATRIBUTOS"] as const;

  const rows = sortedCards.map((card) => {
    const siteName = card.title || card.id;
    const row: Record<string, string> = {
      Site: siteName,
      UF: card.state?.trim() || "—",
      ATRIBUTOS: card.attribute?.trim() || "—",
    };
    const statuses = statusByCardTask.get(card.id);

    for (const task of taskLabels) {
      const done = statuses?.get(task);
      row[task] = done === true ? "FEITO" : "PENDENTE";
    }

    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(rows, {
    header: [...baseHeaders, ...taskLabels],
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Site Books");
  XLSX.writeFile(workbook, "relatorio_sitebooks.xlsx");
}

export type FilteredReportRow = {
  nome: string;
  posicao: string;
  uf: string;
  atributos: string;
  descricao: string;
  isCompleted: boolean;
};

/** Exports the currently filtered Relatórios rows. */
export function exportFilteredReportToExcel(rows: FilteredReportRow[]) {
  const data = rows.map((row) => ({
    "Nome do Site": row.nome,
    Posição: row.posicao,
    UF: row.uf,
    ATRIBUTOS: row.atributos,
    Tarefa: row.descricao,
    Status: row.isCompleted ? "Feito" : "Pendente",
  }));

  const worksheet = XLSX.utils.json_to_sheet(data, {
    header: ["Nome do Site", "Posição", "UF", "ATRIBUTOS", "Tarefa", "Status"],
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Relatório");
  XLSX.writeFile(workbook, "relatorio_filtrado.xlsx");
}

export type CrossFilteredReportRow = {
  siteName: string;
  columnName: string;
  uf: string;
  atributos: string;
  task1Label: string;
  task1Completed: boolean;
  task2Label: string | null;
  task2Completed: boolean | null;
};

/** Exports site-level cross-filtered Relatórios rows with dynamic task columns. */
export function exportCrossFilteredReportToExcel(
  rows: CrossFilteredReportRow[]
) {
  const hasTask2 = rows.some((r) => r.task2Label);

  const header = hasTask2
    ? [
        "Nome do Site",
        "Posição",
        "UF",
        "ATRIBUTOS",
        "Tarefa 1",
        "Status 1",
        "Tarefa 2",
        "Status 2",
      ]
    : ["Nome do Site", "Posição", "UF", "ATRIBUTOS", "Tarefa", "Status"];

  const data = rows.map((row) => {
    if (hasTask2) {
      return {
        "Nome do Site": row.siteName,
        Posição: row.columnName,
        UF: row.uf,
        ATRIBUTOS: row.atributos,
        "Tarefa 1": row.task1Label,
        "Status 1": row.task1Completed ? "Feito" : "Pendente",
        "Tarefa 2": row.task2Label ?? "—",
        "Status 2":
          row.task2Completed === null
            ? "—"
            : row.task2Completed
              ? "Feito"
              : "Pendente",
      };
    }

    return {
      "Nome do Site": row.siteName,
      Posição: row.columnName,
      UF: row.uf,
      ATRIBUTOS: row.atributos,
      Tarefa: row.task1Label,
      Status: row.task1Completed ? "Feito" : "Pendente",
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data, { header });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Relatório");
  XLSX.writeFile(workbook, "relatorio_filtrado.xlsx");
}
