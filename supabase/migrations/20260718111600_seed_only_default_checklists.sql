-- Seed new cards with only the standard checklist (3 categories / exact labels)
CREATE OR REPLACE FUNCTION public.seed_card_checklist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.card_checklist_items (
    card_id,
    template_id,
    category_id,
    label,
    is_completed,
    sort_order
  )
  SELECT
    NEW.id,
    t.id,
    t.category_id,
    NULL,
    false,
    t.sort_order
  FROM public.checklist_templates t
  INNER JOIN public.checklist_categories c ON c.id = t.category_id
  WHERE (c.name, t.label) IN (
    ('ART', '1.3 - ART de Execução Civil'),
    ('ART', '1.4 - ART de Execução Elétrica'),
    ('ART', '1.8 - ART de Montagem Estrutura Metálica'),
    ('ART', '1.11 - ART de Aterramento'),
    ('ART', '1.12 - ART de Instalação'),
    ('ART', '1.13 - ART do Ensaio de Resistência do Concreto'),
    ('ART', '1.12 - ART de Verticalidade'),
    ('Laudo/Certificado/As-Build', '3.1 - Carta Início de Obra'),
    ('Laudo/Certificado/As-Build', '3.2 - Cronograma de Obra'),
    ('Laudo/Certificado/As-Build', '3.3 - Template de Energia'),
    ('Laudo/Certificado/As-Build', '4.3 - As-Built'),
    ('Laudo/Certificado/As-Build', '5.2 - Certificado de Garantia da Implantação Civil'),
    ('Laudo/Certificado/As-Build', '5.3 - Certificados Galvanização'),
    ('Laudo/Certificado/As-Build', '6.1 - Laudo do Ensaio de Resistência do Concreto'),
    ('Laudo/Certificado/As-Build', '6.2 - Laudo de Verticalidade'),
    ('Laudo/Certificado/As-Build', '6.3 - Laudo de Aterramento (com medição)'),
    ('Etapa final', '7.1 - Relatório Final - RFI'),
    ('Etapa final', 'ENVIO DO SITEBOOK'),
    ('Etapa final', 'STATUS DE ACEITAÇÃO')
  );
  RETURN NEW;
END;
$function$;
