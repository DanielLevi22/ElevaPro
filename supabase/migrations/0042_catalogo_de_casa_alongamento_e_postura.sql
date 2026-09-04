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
-- O catálogo inteiro vive aqui e não no `seed.sql`: seed só roda em
-- `supabase db reset` local, e um banco de preview ou produção construído a
-- partir das migrations nascia sem exercício nenhum. Dado de produto entra por
-- migration, que é o único caminho que alcança os três ambientes.
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

-- ── O catálogo ───────────────────────────────────────────────────────────────
-- As 57 linhas que vinham do seed entram por aqui também, agora com as três
-- classificações. `WHERE NOT EXISTS` pelo nome: rodar de novo não duplica, e
-- banco que já tem a linha não é tocado.

INSERT INTO exercises (name, muscle_group, venue, category, is_verified)
SELECT v.name, v.muscle_group, v.venue, v.category, true
FROM (VALUES
-- Peito
('Supino reto com barra',                  'peito',   'academia', 'forca'),
('Supino inclinado com halteres',          'peito',   'academia', 'forca'),
('Crucifixo com halteres',                 'peito',   'academia', 'forca'),
('Crossover no cabo',                      'peito',   'academia', 'forca'),
('Supino declinado',                       'peito',   'academia', 'forca'),
('Supino reto com halteres',               'peito',   'academia', 'forca'),
('Supino inclinado com barra',             'peito',   'academia', 'forca'),
('Voador (peck deck)',                     'peito',   'academia', 'forca'),
('Crossover no cabo baixo',                'peito',   'academia', 'forca'),
('Supino na máquina articulada',           'peito',   'academia', 'forca'),
('Flexão de braço',                        'peito',   'ambos',    'forca'),
('Flexão de braço com joelhos apoiados',   'peito',   'casa',     'forca'),
('Flexão de braço inclinada',              'peito',   'casa',     'forca'),
('Flexão de braço declinada',              'peito',   'casa',     'forca'),
('Flexão diamante',                        'peito',   'casa',     'forca'),
('Flexão com elástico',                    'peito',   'casa',     'forca'),
('Crucifixo com elástico em pé',           'peito',   'casa',     'forca'),
('Supino com elástico deitado',            'peito',   'casa',     'forca'),

-- Costas
('Puxada frontal',                         'costas',  'academia', 'forca'),
('Remada curvada com barra',               'costas',  'academia', 'forca'),
('Remada unilateral com halter',           'costas',  'academia', 'forca'),
('Levantamento terra',                     'costas',  'academia', 'forca'),
('Pull-up (barra fixa)',                   'costas',  'academia', 'forca'),
('Remada no cabo sentado',                 'costas',  'academia', 'forca'),
('Pullover com halter',                    'costas',  'academia', 'forca'),
('Puxada supinada',                        'costas',  'academia', 'forca'),
('Puxada com pegada neutra',               'costas',  'academia', 'forca'),
('Remada cavalinho',                       'costas',  'academia', 'forca'),
('Remada na máquina',                      'costas',  'academia', 'forca'),
('Levantamento terra romeno',              'costas',  'academia', 'forca'),
('Pulldown com braços estendidos',         'costas',  'academia', 'forca'),
('Barra fixa com pegada supinada',         'costas',  'academia', 'forca'),
('Remada invertida na barra baixa',        'costas',  'ambos',    'forca'),
('Remada curvada com elástico',            'costas',  'casa',     'forca'),
('Remada sentada com elástico',            'costas',  'casa',     'forca'),
('Puxada alta com elástico',               'costas',  'casa',     'forca'),
('Remada unilateral com mochila',          'costas',  'casa',     'forca'),

-- Ombro
('Desenvolvimento com barra',              'ombro',   'academia', 'forca'),
('Elevação lateral com halteres',          'ombro',   'academia', 'forca'),
('Elevação frontal',                       'ombro',   'academia', 'forca'),
('Desenvolvimento Arnold',                 'ombro',   'academia', 'forca'),
('Encolhimento de ombros',                 'ombro',   'academia', 'forca'),
('Face pull no cabo',                      'ombro',   'academia', 'forca'),
('Desenvolvimento com halteres sentado',   'ombro',   'academia', 'forca'),
('Elevação lateral no cabo',               'ombro',   'academia', 'forca'),
('Remada alta com barra',                  'ombro',   'academia', 'forca'),
('Crucifixo inverso na máquina',           'ombro',   'academia', 'forca'),
('Desenvolvimento na máquina',             'ombro',   'academia', 'forca'),
('Elevação lateral com elástico',          'ombro',   'casa',     'forca'),
('Desenvolvimento com elástico',           'ombro',   'casa',     'forca'),
('Flexão pique (pike push-up)',            'ombro',   'casa',     'forca'),

-- Ombro — manguito rotador e estabilizadores da escápula
('Rotação externa com elástico',           'ombro',   'ambos',    'estabilizacao'),
('Rotação interna com elástico',           'ombro',   'ambos',    'estabilizacao'),
('Rotação externa deitado de lado',        'ombro',   'ambos',    'estabilizacao'),
('Elevação em Y no banco inclinado',       'ombro',   'academia', 'estabilizacao'),
('Elevação no plano escapular',            'ombro',   'ambos',    'estabilizacao'),
('Face pull com elástico',                 'ombro',   'ambos',    'estabilizacao'),
('Punch do serrátil com elástico',         'ombro',   'ambos',    'estabilizacao'),
('Deslizamento do braço na parede',        'ombro',   'casa',     'estabilizacao'),
('Rotação com bastão acima da cabeça',     'ombro',   'ambos',    'mobilidade'),
('Círculos de braço',                      'ombro',   'casa',     'mobilidade'),

-- Bíceps
('Rosca direta com barra',                 'biceps',  'academia', 'forca'),
('Rosca alternada com halteres',           'biceps',  'academia', 'forca'),
('Rosca martelo',                          'biceps',  'academia', 'forca'),
('Rosca concentrada',                      'biceps',  'academia', 'forca'),
('Rosca no cabo',                          'biceps',  'academia', 'forca'),
('Rosca scott no banco',                   'biceps',  'academia', 'forca'),
('Rosca inversa com barra',                'biceps',  'academia', 'forca'),
('Rosca 21',                               'biceps',  'academia', 'forca'),
('Rosca direta com elástico',              'biceps',  'casa',     'forca'),
('Rosca martelo com elástico',             'biceps',  'casa',     'forca'),

-- Tríceps
('Tríceps testa com barra W',              'triceps', 'academia', 'forca'),
('Tríceps pulley corda',                   'triceps', 'academia', 'forca'),
('Tríceps coice com halter',               'triceps', 'academia', 'forca'),
('Mergulho entre bancos',                  'triceps', 'ambos',    'forca'),
('Tríceps francês',                        'triceps', 'academia', 'forca'),
('Tríceps pulley barra reta',              'triceps', 'academia', 'forca'),
('Paralelas',                              'triceps', 'academia', 'forca'),
('Tríceps acima da cabeça com elástico',   'triceps', 'casa',     'forca'),
('Tríceps coice com elástico',             'triceps', 'casa',     'forca'),

-- Pernas
('Agachamento livre',                      'pernas',  'academia', 'forca'),
('Leg press 45°',                          'pernas',  'academia', 'forca'),
('Cadeira extensora',                      'pernas',  'academia', 'forca'),
('Mesa flexora',                           'pernas',  'academia', 'forca'),
('Agachamento búlgaro',                    'pernas',  'ambos',    'forca'),
('Afundo com halteres',                    'pernas',  'academia', 'forca'),
('Stiff com barra',                        'pernas',  'academia', 'forca'),
('Cadeira abdutora',                       'pernas',  'academia', 'forca'),
('Cadeira adutora',                        'pernas',  'academia', 'forca'),
('Panturrilha em pé',                      'pernas',  'academia', 'forca'),
('Panturrilha sentado',                    'pernas',  'academia', 'forca'),
('Hack squat',                             'pernas',  'academia', 'forca'),
('Agachamento frontal',                    'pernas',  'academia', 'forca'),
('Agachamento no Smith',                   'pernas',  'academia', 'forca'),
('Levantamento terra sumô',                'pernas',  'academia', 'forca'),
('Passada com halteres',                   'pernas',  'academia', 'forca'),
('Panturrilha no leg press',               'pernas',  'academia', 'forca'),
('Bom dia com barra',                      'pernas',  'academia', 'forca'),
('Agachamento livre sem peso',             'pernas',  'casa',     'forca'),
('Agachamento com salto',                  'pernas',  'casa',     'forca'),
('Afundo estático sem peso',               'pernas',  'casa',     'forca'),
('Agachamento sumô sem peso',              'pernas',  'casa',     'forca'),
('Cadeira na parede',                      'pernas',  'casa',     'forca'),
('Panturrilha em pé no degrau',            'pernas',  'ambos',    'forca'),
('Stiff unilateral sem peso',              'pernas',  'casa',     'forca'),
('Subida no banco',                        'pernas',  'ambos',    'forca'),
('Agachamento com elástico',               'pernas',  'casa',     'forca'),

-- Glúteos
('Hip thrust com barra',                   'gluteos', 'academia', 'forca'),
('Elevação pélvica',                       'gluteos', 'ambos',    'forca'),
('Glúteo no cabo',                         'gluteos', 'academia', 'forca'),
('Agachamento sumô',                       'gluteos', 'academia', 'forca'),
('Coice de glúteo na máquina',             'gluteos', 'academia', 'forca'),
('Abdução de quadril no cabo',             'gluteos', 'academia', 'forca'),
('Ponte de glúteo no solo',                'gluteos', 'casa',     'forca'),
('Ponte de glúteo unilateral',             'gluteos', 'casa',     'forca'),
('Concha com elástico',                    'gluteos', 'ambos',    'estabilizacao'),
('Abdução deitado de lado',                'gluteos', 'casa',     'estabilizacao'),
('Caminhada lateral com elástico',         'gluteos', 'ambos',    'estabilizacao'),
('Coice de glúteo em quatro apoios',       'gluteos', 'casa',     'estabilizacao'),
('Abdução em quatro apoios',               'gluteos', 'casa',     'estabilizacao'),

-- Abdômen e core
('Abdominal crunch',                       'abdomen', 'ambos',    'forca'),
('Prancha',                                'abdomen', 'ambos',    'estabilizacao'),
('Elevação de pernas',                     'abdomen', 'ambos',    'forca'),
('Abdominal bicicleta',                    'abdomen', 'ambos',    'forca'),
('Crunch no cabo',                         'abdomen', 'academia', 'forca'),
('Abdominal oblíquo',                      'abdomen', 'ambos',    'forca'),
('Prancha lateral',                        'abdomen', 'ambos',    'estabilizacao'),
('Prancha com toque no ombro',             'abdomen', 'ambos',    'estabilizacao'),
('Inseto morto (dead bug)',                'abdomen', 'ambos',    'estabilizacao'),
('Bird dog',                               'abdomen', 'ambos',    'estabilizacao'),
('Pallof press com elástico',              'abdomen', 'ambos',    'estabilizacao'),
('Hollow hold',                            'abdomen', 'ambos',    'estabilizacao'),
('Rollout na roda abdominal',              'abdomen', 'ambos',    'estabilizacao'),
('Prancha com elevação de perna',          'abdomen', 'ambos',    'estabilizacao'),
('Caminhada do fazendeiro',                'abdomen', 'academia', 'estabilizacao'),
('Escalador (mountain climber)',           'abdomen', 'casa',     'forca'),
('Elevação de pernas na barra fixa',       'abdomen', 'academia', 'forca'),
('Rotação russa',                          'abdomen', 'casa',     'forca'),

-- Cardio
('Esteira',                                'cardio',  'academia', 'cardio'),
('Bike ergométrica',                       'cardio',  'academia', 'cardio'),
('Elíptico',                               'cardio',  'academia', 'cardio'),
('Corda naval',                            'cardio',  'academia', 'cardio'),
('Burpee',                                 'cardio',  'ambos',    'cardio'),
('Polichinelo',                            'cardio',  'ambos',    'cardio'),
('Remo ergômetro',                         'cardio',  'academia', 'cardio'),
('Escada ergométrica',                     'cardio',  'academia', 'cardio'),
('Bicicleta de assalto',                   'cardio',  'academia', 'cardio'),
('Pular corda',                            'cardio',  'ambos',    'cardio'),
('Corrida no lugar',                       'cardio',  'casa',     'cardio'),
('Salto do patinador',                     'cardio',  'casa',     'cardio'),

-- Alongamento
('Alongamento de peitoral no batente',     'peito',   'ambos',    'alongamento'),
('Alongamento de dorsal suspenso',         'costas',  'ambos',    'alongamento'),
('Alongamento de lombar joelhos ao peito', 'costas',  'casa',     'alongamento'),
('Postura da criança',                     'costas',  'casa',     'alongamento'),
('Alongamento cervical lateral',           'costas',  'casa',     'alongamento'),
('Alongamento de deltoide cruzado',        'ombro',   'ambos',    'alongamento'),
('Alongamento de tríceps sobre a cabeça',  'triceps', 'ambos',    'alongamento'),
('Alongamento de bíceps na parede',        'biceps',  'ambos',    'alongamento'),
('Alongamento de isquiotibiais sentado',   'pernas',  'casa',     'alongamento'),
('Alongamento de quadríceps em pé',        'pernas',  'ambos',    'alongamento'),
('Alongamento de panturrilha na parede',   'pernas',  'ambos',    'alongamento'),
('Alongamento de adutores borboleta',      'pernas',  'casa',     'alongamento'),
('Alongamento de flexores do quadril',     'pernas',  'casa',     'alongamento'),
('Alongamento de glúteo figura quatro',    'gluteos', 'casa',     'alongamento'),
('Alongamento de piriforme sentado',       'gluteos', 'casa',     'alongamento'),

-- Mobilidade
('Gato e camelo',                          'costas',  'casa',     'mobilidade'),
('Rotação torácica deitado de lado',       'costas',  'casa',     'mobilidade'),
('Extensão torácica no rolo',              'costas',  'ambos',    'mobilidade'),
('Lagarta (inchworm)',                     'costas',  'casa',     'mobilidade'),
('Mobilidade de tornozelo na parede',      'pernas',  'casa',     'mobilidade'),
('Agachamento profundo com apoio',         'pernas',  'casa',     'mobilidade'),
('Círculos de quadril em quatro apoios',   'gluteos', 'casa',     'mobilidade'),
('Transição 90/90 de quadril',             'gluteos', 'casa',     'mobilidade'),

-- Postural
('Retração escapular deitado de bruços',   'costas',  'casa',     'postural'),
('Superman no solo',                       'costas',  'casa',     'postural'),
('Elevação em Y no solo',                  'costas',  'casa',     'postural'),
('Elevação em T no solo',                  'costas',  'casa',     'postural'),
('Elevação em W no solo',                  'costas',  'casa',     'postural'),
('Retração cervical',                      'costas',  'casa',     'postural'),
('Anjo na parede',                         'ombro',   'casa',     'postural'),
('Ponte de glúteo com elástico',           'gluteos', 'casa',     'postural')
) AS v(name, muscle_group, venue, category)
WHERE NOT EXISTS (SELECT 1 FROM exercises t WHERE t.name = v.name);

-- ── As linhas que já existiam ────────────────────────────────────────────────
-- Num banco que já tinha as 57, o INSERT acima pulou todas, e elas ficaram com
-- o default `academia` / `forca`. Aqui recebem a classificação de verdade — a
-- mesma da lista acima. Só toca linha oficial da plataforma: exercício criado
-- por especialista é dele, e a classificação dele não se sobrescreve.

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
