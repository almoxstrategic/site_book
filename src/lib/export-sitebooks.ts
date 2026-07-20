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

  const rows = sortedCards.map((card) => {
    const siteName = card.title || card.id;
    const row: Record<string, string> = { Site: siteName };
    const statuses = statusByCardTask.get(card.id);

    for (const task of taskLabels) {
      const done = statuses?.get(task);
      row[task] = done === true ? "FEITO" : "PENDENTE";
    }

    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(rows, {
    header: ["Site", ...taskLabels],
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Site Books");
  XLSX.writeFile(workbook, "relatorio_sitebooks.xlsx");
}

export type FilteredReportRow = {
  nome: string;
  descricao: string;
  isCompleted: boolean;
};

/** Exports the currently filtered Relatórios rows (Nome, Descrição, Status). */
export function exportFilteredReportToExcel(rows: FilteredReportRow[]) {
  const data = rows.map((row) => ({
    Nome: row.nome,
    Descrição: row.descricao,
    Status: row.isCompleted ? "Concluído" : "Pendente",
  }));

  const worksheet = XLSX.utils.json_to_sheet(data, {
    header: ["Nome", "Descrição", "Status"],
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Relatório");
  XLSX.writeFile(workbook, "relatorio_filtrado.xlsx");
}
