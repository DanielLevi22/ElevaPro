-- A Escala do Body scan: altura e peso obrigatórios na avaliação, e a origem
-- gravada em cada scan.
--
-- ── O que estava errado ───────────────────────────────────────────────────────
--
-- `physical_assessments.height_cm` e `weight_kg` eram opcionais. Uma avaliação
-- com só circunferências não serve de Escala, e o aluno era barrado na análise
-- sem que nada explicasse por quê — a rota devolvia 422 e o app mostrava
-- "não consegui completar, tente de novo", num botão que nunca podia funcionar.
--
-- E `body_scans` guardava a altura usada sem dizer de onde ela veio. Enquanto a
-- única fonte era a avaliação do especialista isso era inofensivo; com a
-- Anamnese entrando como segunda fonte, o rótulo "medido" que o web mostra
-- passa a mentir para todo aluno sem avaliação.
--
-- ── Por que DELETE e não backfill ─────────────────────────────────────────────
--
-- Preencher uma altura que faltava fabrica uma medição que ninguém fez. É
-- violação direta de Qualidade dos Dados (Art. 6º, V) e produz exatamente o tipo
-- de número inventado que o `ADR-0010` existe para eliminar. Avaliação
-- incompleta se apaga; não se completa.
--
-- ── Exceção à imutabilidade, registrada ───────────────────────────────────────
--
-- `physical_assessments` é imutável por política: a RLS da `0017` concede ao
-- especialista apenas INSERT, e a seção 10 do `LGPD_COMPLIANCE.md` afirma
-- "nunca UPDATE". Esta migration roda como owner e passa por cima da RLS.
--
-- A exceção é deliberada e está anotada no documento de compliance na mesma
-- entrega — controle documentado que o banco não tem foi o achado da auditoria
-- de 2026-08-11, e deixar a doc dizendo "imutável" sem ressalva repetiria isso.
-- Autorizado pelo mantenedor: ambiente de teste, sem nada em produção.

-- 1. Fora as avaliações que não servem de Escala.
DELETE FROM physical_assessments
WHERE height_cm IS NULL OR weight_kg IS NULL;

-- 2. A partir daqui, avaliação sem os dois não entra.
ALTER TABLE physical_assessments
  ALTER COLUMN height_cm SET NOT NULL,
  ALTER COLUMN weight_kg SET NOT NULL;

-- 3. De onde veio a Escala de cada scan.
--
-- Anulável de propósito: os scans já gravados foram feitos quando a avaliação
-- do especialista era a única fonte possível, mas afirmar isso agora seria
-- inventar procedência. NULL aqui significa "feito antes de a origem ser
-- registrada", e a tela sabe dizer isso sem mentir.
CREATE TYPE scale_source AS ENUM ('assessment', 'anamnese');

ALTER TABLE body_scans
  ADD COLUMN scale_source scale_source;

COMMENT ON COLUMN body_scans.scale_source IS
  'Fonte da Escala: assessment (medida com fita pelo especialista) ou anamnese (declarada pelo aluno). NULL em scan anterior a 0037.';
