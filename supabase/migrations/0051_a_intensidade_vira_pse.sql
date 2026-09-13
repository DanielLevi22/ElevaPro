-- A intensidade da sessão passa a se chamar pelo nome do kit: PSE.
--
-- Issue #295. `workout_sessions.intensity` vira `perceived_exertion` — a
-- percepção subjetiva de esforço, que o feedback do kit chama de "Intensidade
-- percebida" e o resumo do descanso chama de PSE. O dado não muda: continua o
-- mesmo inteiro de 1 a 10 que o aluno responde no fim da sessão.
--
-- O nome antigo confundia duas coisas que o código já precisava explicar em
-- comentário: esta escala, que é gravada, e a `intensity` do acelerômetro na
-- tela de cardio, que nunca é.
--
-- ## Por que renomear, e não criar coluna nova com cópia
--
-- Coluna nova com cópia deixa duas colunas com o mesmo dado durante a
-- transição, e dado de saúde duplicado é o que o Art. 6°, III manda não ter.
-- O rename é uma operação de catálogo: não reescreve a tabela e não toca linha.
--
-- ## O que acompanha o rename sem precisar de nada
--
-- O `GRANT UPDATE (intensity, notes, feedback_edited_at)` da `0036` é o
-- controle do Art. 18, III — o aluno corrige o que declarou, e não o que
-- aconteceu. Privilégio de coluna fica preso ao número da coluna, e não ao
-- nome: depois do rename ele vale para `perceived_exertion` sem reconceder. A
-- `verify-rls.sql` confere isso pelo `information_schema`.
--
-- Nenhuma função, view ou política cita a coluna (conferido no banco local
-- antes de escrever esta migration). O bloco abaixo repete a conferência no
-- banco onde a migration roda, para um objeto criado fora das migrations não
-- quebrar calado.
--
-- ## Ordem de deploy
--
-- Uma versão do app anterior a este lote grava `intensity` e passa a receber
-- 42703. A migration vai para preview e produção junto com a versão do app que
-- grava `perceived_exertion`, não antes.

DO $$
DECLARE
  dependentes text;
BEGIN
  SELECT string_agg(p.proname, ', ') INTO dependentes
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prosrc ILIKE '%workout_sessions%'
    AND p.prosrc ILIKE '%intensity%';

  IF dependentes IS NOT NULL THEN
    RAISE EXCEPTION
      'funções citam workout_sessions.intensity e quebrariam com o rename: %. Reescreva-as nesta migration.',
      dependentes;
  END IF;
END $$;

ALTER TABLE public.workout_sessions RENAME COLUMN intensity TO perceived_exertion;

COMMENT ON COLUMN public.workout_sessions.perceived_exertion IS
  'Percepção subjetiva de esforço (PSE), 1 a 10, respondida pelo aluno no fim da sessão. '
  'Execução de contrato: medida de carga, não relato clínico. A sensação do kit '
  '(Leve, Na medida, Puxado) é derivada deste número e não é gravada.';

COMMENT ON COLUMN public.workout_sessions.feedback_edited_at IS
  'Quando o aluno corrigiu o próprio feedback (notes/perceived_exertion). Metadado '
  'da correção (Art. 18, III): guarda que mudou e quando, nunca o texto anterior.';
