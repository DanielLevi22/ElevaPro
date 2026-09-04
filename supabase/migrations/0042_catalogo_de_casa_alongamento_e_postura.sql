-- Catálogo de exercícios: onde dá para fazer, e que tipo de trabalho é.
--
-- O catálogo nasceu com 57 exercícios de sala de musculação e uma única
-- classificação: `muscle_group`. Isso responde "que músculo", e só. Três coisas
-- que o produto precisa não cabiam em lugar nenhum:
--
--   treino em casa — nada no dado distinguia o que exige máquina do que exige
--   só o corpo, então o coach não tinha como montar um treino sem academia;
--
--   alongamento, mobilidade e postura — não existiam como linha, então um
--   treino que termina em alongamento não era prescritível;
--
--   estabilização — manguito rotador, core profundo, glúteo médio: o trabalho
--   que a anamnese com dor e restrição pede, e que não é hipertrofia.
--
-- `venue` responde onde, `category` responde o quê, `muscle_group` continua
-- respondendo onde no corpo. São três perguntas diferentes e nenhuma substitui
-- a outra: "prancha" é abdômen, em casa, estabilização.
--
-- Aqui só o schema. As 181 linhas do catálogo vivem no `seed.sql`, que alcança
-- os três ambientes: o workflow `supabase-migrations` roda `db push` e, logo
-- depois, `psql -f supabase/seed.sql` — e o `db reset` local faz o mesmo, nessa
-- ordem. O que fica nesta migration é o que o seed não sabe fazer: as colunas
-- em si e a classificação das linhas que já existiam antes delas.
--
-- Nada aqui é dado de titular. A recusa deliberada foi rotular a linha com a
-- condição que ela trata ("hérnia de disco", "impacto do ombro"): o rótulo é
-- inofensivo sozinho, mas só serve cruzado com o aluno, e aí a frase na tela
-- vira inferência sobre saúde de titular identificado (Art. 11). Registrado em
-- docs/LGPD_COMPLIANCE.md, seção 2.3.

-- ── Colunas ──────────────────────────────────────────────────────────────────
-- Default conservador: exercício criado por especialista pelo painel nasce
-- `academia` / `forca`, que é o que ele quase sempre é. Prometer `casa` por
-- omissão colocaria na prescrição de quem treina em casa algo que precisa de
-- máquina.

ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS venue text NOT NULL DEFAULT 'academia',
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'forca';

COMMENT ON COLUMN exercises.venue IS
  'Onde dá para executar: academia, casa, ambos. Vocabulário fechado por CHECK.';
COMMENT ON COLUMN exercises.category IS
  'Que trabalho é: forca, cardio, alongamento, mobilidade, postural, estabilizacao.';

-- Postgres não tem ADD CONSTRAINT IF NOT EXISTS: o bloco DO é o que torna a
-- migration re-executável.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'exercises_venue_check' AND conrelid = 'public.exercises'::regclass
  ) THEN
    ALTER TABLE exercises ADD CONSTRAINT exercises_venue_check
      CHECK (venue IN ('academia', 'casa', 'ambos'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'exercises_category_check' AND conrelid = 'public.exercises'::regclass
  ) THEN
    ALTER TABLE exercises ADD CONSTRAINT exercises_category_check
      CHECK (category IN ('forca', 'cardio', 'alongamento', 'mobilidade', 'postural', 'estabilizacao'));
  END IF;
END $$;

-- ── As linhas que já existiam ────────────────────────────────────────────────
-- As 57 do catálogo antigo já estão no banco, e o guard `where not exists` do
-- seed pula todas — elas ficariam com o default `academia` / `forca` para
-- sempre, com prancha marcada como exercício de academia. Aqui recebem a
-- classificação de verdade, a mesma que o seed dá às novas.
--
-- Num banco vazio isto não afeta linha nenhuma (o seed roda depois) e não custa
-- nada. Num banco que já rodou, é a única chance de corrigir.
--
-- Só toca linha oficial da plataforma: exercício criado por especialista é
-- dele, e a classificação dele não se sobrescreve.

UPDATE exercises e
   SET venue = v.venue, category = v.category
  FROM (VALUES
('Flexão de braço',           'ambos',    'forca'),
('Mergulho entre bancos',     'ambos',    'forca'),
('Agachamento búlgaro',       'ambos',    'forca'),
('Elevação pélvica',          'ambos',    'forca'),
('Abdominal crunch',          'ambos',    'forca'),
('Prancha',                   'ambos',    'estabilizacao'),
('Elevação de pernas',        'ambos',    'forca'),
('Abdominal bicicleta',       'ambos',    'forca'),
('Abdominal oblíquo',         'ambos',    'forca'),
('Esteira',                   'academia', 'cardio'),
('Bike ergométrica',          'academia', 'cardio'),
('Elíptico',                  'academia', 'cardio'),
('Corda naval',               'academia', 'cardio'),
('Burpee',                    'ambos',    'cardio'),
('Polichinelo',               'ambos',    'cardio')
) AS v(name, venue, category)
 WHERE e.name = v.name
   AND e.created_by IS NULL;
