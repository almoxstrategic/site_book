-- Dynamic per-company default checklist definitions (MVP)
CREATE TABLE IF NOT EXISTS public.company_checklist_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_slug text NOT NULL REFERENCES public.companies(slug)
    ON UPDATE CASCADE ON DELETE CASCADE,
  category_name text NOT NULL,
  item_name text NOT NULL,
  category_sort integer NOT NULL DEFAULT 0,
  item_sort integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS company_checklist_templates_unique_item
  ON public.company_checklist_templates (company_slug, category_name, item_name);

CREATE INDEX IF NOT EXISTS company_checklist_templates_company_idx
  ON public.company_checklist_templates (company_slug, category_sort, item_sort);

ALTER TABLE public.company_checklist_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to company_checklist_templates"
  ON public.company_checklist_templates FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

GRANT ALL ON public.company_checklist_templates TO anon, authenticated;

-- Seed Global (existing default)
INSERT INTO public.company_checklist_templates
  (company_slug, category_name, item_name, category_sort, item_sort)
VALUES
  ('global', 'ART', '1.3 - ART de Execução Civil', 0, 0),
  ('global', 'ART', '1.4 - ART de Execução Elétrica', 0, 1),
  ('global', 'ART', '1.8 - ART de Montagem Estrutura Metálica', 0, 2),
  ('global', 'ART', '1.11 - ART de Aterramento', 0, 3),
  ('global', 'ART', '1.12 - ART de Instalação', 0, 4),
  ('global', 'ART', '1.13 - ART do Ensaio de Resistência do Concreto', 0, 5),
  ('global', 'ART', '1.12 - ART de Verticalidade', 0, 6),
  ('global', 'Laudo/Certificado/As-Build', '3.1 - Carta Início de Obra', 1, 0),
  ('global', 'Laudo/Certificado/As-Build', '3.2 - Cronograma de Obra', 1, 1),
  ('global', 'Laudo/Certificado/As-Build', '3.3 - Template de Energia', 1, 2),
  ('global', 'Laudo/Certificado/As-Build', '4.3 - As-Built', 1, 3),
  ('global', 'Laudo/Certificado/As-Build', '5.2 - Certificado de Garantia da Implantação Civil', 1, 4),
  ('global', 'Laudo/Certificado/As-Build', '5.3 - Certificados Galvanização', 1, 5),
  ('global', 'Laudo/Certificado/As-Build', '6.1 - Laudo do Ensaio de Resistência do Concreto', 1, 6),
  ('global', 'Laudo/Certificado/As-Build', '6.2 - Laudo de Verticalidade', 1, 7),
  ('global', 'Laudo/Certificado/As-Build', '6.3 - Laudo de Aterramento (com medição)', 1, 8),
  ('global', 'Etapa final', '7.1 - Relatório Final - RFI', 2, 0),
  ('global', 'Etapa final', 'ENVIO DO SITEBOOK', 2, 1),
  ('global', 'Etapa final', 'STATUS DE ACEITAÇÃO', 2, 2)
ON CONFLICT DO NOTHING;

-- Seed Phoenix if company exists
INSERT INTO public.company_checklist_templates
  (company_slug, category_name, item_name, category_sort, item_sort)
SELECT v.company_slug, v.category_name, v.item_name, v.category_sort, v.item_sort
FROM (VALUES
  ('phoenix', 'Pastas de Projetos e Desenhos - As-Built (DWG/PDF)', 'As-Built_desenhos_Executivos.dwg', 0, 0),
  ('phoenix', 'Pastas de Projetos e Desenhos - As-Built (DWG/PDF)', 'As-Built_desenhos_Executivos.pdf', 0, 1),
  ('phoenix', 'Pastas de Projetos e Desenhos - As-Built (DWG/PDF)', 'As_Built_projeto.dwg', 0, 2),
  ('phoenix', 'Pastas de Projetos e Desenhos - As-Built (DWG/PDF)', 'As_Built_projeto.pdf', 0, 3),
  ('phoenix', 'Anotações de Responsabilidade Técnicas (ARTs)', 'ART de Execução civil', 1, 0),
  ('phoenix', 'Anotações de Responsabilidade Técnicas (ARTs)', 'ART de Projeto', 1, 1),
  ('phoenix', 'Anotações de Responsabilidade Técnicas (ARTs)', 'ART de Sondagem', 1, 2),
  ('phoenix', 'Anotações de Responsabilidade Técnicas (ARTs)', 'ART de Execução Elétrica', 1, 3),
  ('phoenix', 'Anotações de Responsabilidade Técnicas (ARTs)', 'ART de Laudo de Concreto', 1, 4),
  ('phoenix', 'Documentos Administrativos e Cartas', 'Carta de Inicio de Obra', 2, 0),
  ('phoenix', 'Documentos Administrativos e Cartas', 'Carta Final de Obra', 2, 1),
  ('phoenix', 'Laudos, Teste e Certificados Técnicos', 'Lab Tests', 3, 0),
  ('phoenix', 'Laudos, Teste e Certificados Técnicos', 'Laudo aterramento', 3, 1),
  ('phoenix', 'Laudos, Teste e Certificados Técnicos', 'Laudo de Concreto', 3, 2),
  ('phoenix', 'Laudos, Teste e Certificados Técnicos', 'Relatório de Sondagem', 3, 3),
  ('phoenix', 'Laudos, Teste e Certificados Técnicos', 'Certificado de Garantia de Cimento', 3, 4),
  ('phoenix', 'Laudos, Teste e Certificados Técnicos', 'Teste de Compactação', 3, 5),
  ('phoenix', 'Controle, Operação & Manutenção e Outros', 'PASDP (Profress Report / Pendências)', 4, 0),
  ('phoenix', 'Controle, Operação & Manutenção e Outros', 'RFI', 4, 1),
  ('phoenix', 'Controle, Operação & Manutenção e Outros', 'PASDP_O&M NEW (Manual / Ddos de O&M)', 4, 2),
  ('phoenix', 'Controle, Operação & Manutenção e Outros', 'PASDP_WRC (Work Acceptance / WRC)', 4, 3),
  ('phoenix', 'Controle, Operação & Manutenção e Outros', 'PASDP_ SITE BOOK DIGITAL', 4, 4)
) AS v(company_slug, category_name, item_name, category_sort, item_sort)
WHERE EXISTS (SELECT 1 FROM public.companies c WHERE c.slug = 'phoenix')
ON CONFLICT DO NOTHING;
