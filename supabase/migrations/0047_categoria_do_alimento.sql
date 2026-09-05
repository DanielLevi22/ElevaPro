-- Categoria do alimento, com vocabulário fechado.
--
-- `foods.category` existe desde a criação da tabela e está `NULL` nas 44
-- linhas. A ferramenta do assistente registra a consequência por escrito: ela
-- não filtra por categoria porque filtrar devolveria zero em toda chamada, e o
-- modelo concluiria que o catálogo está vazio — exatamente o que `muscle_group`
-- fez no assistente de treino.
--
-- Aqui a coluna passa a ter vocabulário fechado. Texto livre repetiria o
-- defeito do painel de admin de exercícios, onde o placeholder dizia
-- "ex: Peito", gravava `Peito`, e a busca procurava `peito`: o item recém
-- criado nunca mais era encontrado.
--
-- O catálogo em si vive no `seed.sql`, que roda em todos os ambientes — local
-- por `db reset`, preview e produção pelo passo `psql -f supabase/seed.sql` do
-- workflow. O que fica aqui é o que o seed não sabe fazer: a restrição e a
-- classificação das linhas que já existiam antes dela, que o guard
-- `where not exists` do seed pula.

-- ── Vocabulário ──────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'foods_category_check' AND conrelid = 'public.foods'::regclass
  ) THEN
    ALTER TABLE foods ADD CONSTRAINT foods_category_check
      CHECK (category IS NULL OR category IN (
        'proteina', 'carboidrato', 'leguminosa', 'fruta',
        'hortalica', 'gordura', 'laticinio', 'bebida', 'suplemento'
      ));
  END IF;
END $$;

COMMENT ON COLUMN foods.category IS
  'proteina, carboidrato, leguminosa, fruta, hortalica, gordura, laticinio, bebida, suplemento.';

-- `NULL` continua aceito de propósito: alimento criado por especialista pelo
-- painel não é obrigado a se encaixar, e recusar o insert seria trocar um
-- catálogo sem categoria por um catálogo sem o alimento.

-- ── As linhas que já existiam ────────────────────────────────────────────────
-- As 44 do catálogo antigo são puladas pelo guard do seed e ficariam sem
-- categoria para sempre — e uma busca por "proteína" que devolve metade das
-- proteínas é pior que uma que não filtra, porque a de cima parece completa.

UPDATE foods f
   SET category = v.category
  FROM (VALUES
('Frango (peito grelhado)',     'proteina'),
('Carne bovina (patinho)',      'proteina'),
('Ovo inteiro cozido',          'proteina'),
('Clara de ovo',                'proteina'),
('Atum em água (lata)',         'proteina'),
('Salmão grelhado',             'proteina'),
('Tilápia grelhada',            'proteina'),
('Whey protein (pó)',           'suplemento'),
('Iogurte natural desnatado',   'laticinio'),
('Queijo cottage',              'laticinio'),
('Leite desnatado',             'laticinio'),
('Tofu',                        'proteina'),
('Arroz branco cozido',         'carboidrato'),
('Arroz integral cozido',       'carboidrato'),
('Batata doce cozida',          'carboidrato'),
('Batata inglesa cozida',       'carboidrato'),
('Mandioca cozida',             'carboidrato'),
('Macarrão cozido',             'carboidrato'),
('Pão francês',                 'carboidrato'),
('Pão integral',                'carboidrato'),
('Aveia em flocos',             'carboidrato'),
('Tapioca (goma)',              'carboidrato'),
('Cuscuz de milho',             'carboidrato'),
('Quinoa cozida',               'carboidrato'),
('Azeite de oliva',             'gordura'),
('Abacate',                     'fruta'),
('Castanha do Pará',            'gordura'),
('Amendoim',                    'gordura'),
('Pasta de amendoim',           'gordura'),
('Chia',                        'gordura'),
('Linhaça',                     'gordura'),
('Brócolis cozido',             'hortalica'),
('Alface',                      'hortalica'),
('Tomate',                      'hortalica'),
('Cenoura crua',                'hortalica'),
('Abobrinha cozida',            'hortalica'),
('Couve refogada',              'hortalica'),
('Espinafre',                   'hortalica'),
('Banana prata',                'fruta'),
('Maçã',                        'fruta'),
('Mamão',                       'fruta'),
('Laranja',                     'fruta'),
('Morango',                     'fruta'),
('Uva',                         'fruta'),
('Feijão carioca cozido',       'leguminosa'),
('Feijão preto cozido',         'leguminosa'),
('Lentilha cozida',             'leguminosa'),
('Grão de bico cozido',         'leguminosa'),
('Edamame',                     'leguminosa'),

-- Nomes de versões anteriores do seed, ainda vivos em bancos que nasceram
-- antes da padronização. Categorizar pelo nome de hoje deixaria estes de fora,
-- e uma busca por "frutas" sem a banana antiga parece completa e não é.
('Banana',                      'fruta'),
('Mamão papaia',                'fruta'),
('Amendoim torrado',            'gordura'),
('Cottage',                     'laticinio'),
('Espinafre cru',               'hortalica'),
('Iogurte grego natural',       'laticinio'),
('Queijo minas frescal',        'laticinio'),
('Macarrão integral cozido',    'carboidrato'),
('Chuchu cozido',               'hortalica'),
('Pepino',                      'hortalica')
) AS v(name, category)
 WHERE f.name = v.name
   AND f.category IS NULL;
