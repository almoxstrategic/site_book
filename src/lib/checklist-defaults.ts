/** Default checklist used by "Adicionar Checklists Padrão". */
export const DEFAULT_CHECKLIST: {
  category: string;
  items: string[];
}[] = [
  {
    category: "ART",
    items: [
      "1.3 - ART de Execução Civil",
      "1.4 - ART de Execução Elétrica",
      "1.8 - ART de Montagem Estrutura Metálica",
      "1.11 - ART de Aterramento",
      "1.12 - ART de Instalação",
      "1.13 - ART do Ensaio de Resistência do Concreto",
      "1.12 - ART de Verticalidade",
    ],
  },
  {
    category: "Laudo/Certificado/As-Build",
    items: [
      "3.1 - Carta Início de Obra",
      "3.2 - Cronograma de Obra",
      "3.3 - Template de Energia",
      "4.3 - As-Build",
      "5.2 - Certificado de Garantia da Implantação Civil",
      "5.3 - Certificados Galvanização",
      "6.1 - Laudo do Ensaio de Resistência do Concreto",
      "6.2 - Laudo de Verticalidade",
      "6.3 - Laudo de Aterramento (com medição)",
    ],
  },
  {
    category: "Etapa final",
    items: [
      "7.1 - Relatório Final - RFI",
      "ENVIO SITE BOOK",
      "STATUS DE ACEITAÇÃO",
    ],
  },
];

export function checklistItemLabel(item: {
  label?: string | null;
  checklist_templates?: { label?: string | null } | null;
}): string {
  return item.label?.trim() || item.checklist_templates?.label?.trim() || "Item";
}
