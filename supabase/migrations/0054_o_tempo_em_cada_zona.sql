-- O tempo em cada zona de FC da sessão de cardio.
--
-- Issue #304. A média não distingue 40 minutos constantes de um intervalado, e
-- é essa diferença que um ajuste de plano precisa ver. As zonas entram na linha
-- da média, em `workout_session_vitals`, e não em `workout_sessions`: são Art. 11,
-- II, f + I, e a RLS desta tabela é a que consulta consentimento (0049).
--
-- **A série continua fora.** O aparelho lê os batimentos da janela da sessão,
-- conta quantos caem em cada zona pela FC máxima de 220 − idade, e só os cinco
-- percentuais chegam aqui. Cinco números não reconstroem a série nem permitem
-- inferir estresse — o motivo do veto da 0049 continua de pé.
--
-- As colunas herdam da tabela o REVOKE de UPDATE e DELETE e as políticas por
-- linha, sem política nova: o especialista que perde o consentimento perde as
-- zonas junto com a média.

ALTER TABLE "workout_session_vitals"
  ADD COLUMN "zone_1_pct" smallint,
  ADD COLUMN "zone_2_pct" smallint,
  ADD COLUMN "zone_3_pct" smallint,
  ADD COLUMN "zone_4_pct" smallint,
  ADD COLUMN "zone_5_pct" smallint;
--> statement-breakpoint

-- Nulas juntas: sem idade declarada na anamnese não há FC máxima, e a sessão
-- guarda só a média. Zona pela metade não é distribuição, é dado quebrado.
ALTER TABLE "workout_session_vitals"
  ADD CONSTRAINT "workout_session_vitals_zones_all_or_none"
  CHECK (
    num_nulls("zone_1_pct", "zone_2_pct", "zone_3_pct", "zone_4_pct", "zone_5_pct") IN (0, 5)
  );
--> statement-breakpoint

-- Percentual inteiro, e a soma fecha em 100: o app arredonda pelo maior resto
-- justamente para a barra da tela não mostrar 99 ou 101.
ALTER TABLE "workout_session_vitals"
  ADD CONSTRAINT "workout_session_vitals_zones_percentages"
  CHECK (
    "zone_1_pct" IS NULL OR (
      "zone_1_pct" BETWEEN 0 AND 100
      AND "zone_2_pct" BETWEEN 0 AND 100
      AND "zone_3_pct" BETWEEN 0 AND 100
      AND "zone_4_pct" BETWEEN 0 AND 100
      AND "zone_5_pct" BETWEEN 0 AND 100
      AND "zone_1_pct" + "zone_2_pct" + "zone_3_pct" + "zone_4_pct" + "zone_5_pct" = 100
    )
  );
--> statement-breakpoint

COMMENT ON COLUMN "workout_session_vitals"."zone_1_pct" IS
  'Percentual do tempo abaixo de 60% da FC máxima (220 − idade). Só o derivado — a série de batimentos é vedada.';
--> statement-breakpoint
COMMENT ON COLUMN "workout_session_vitals"."zone_2_pct" IS
  'Percentual do tempo entre 60% e 70% da FC máxima (220 − idade).';
--> statement-breakpoint
COMMENT ON COLUMN "workout_session_vitals"."zone_3_pct" IS
  'Percentual do tempo entre 70% e 80% da FC máxima (220 − idade).';
--> statement-breakpoint
COMMENT ON COLUMN "workout_session_vitals"."zone_4_pct" IS
  'Percentual do tempo entre 80% e 90% da FC máxima (220 − idade).';
--> statement-breakpoint
COMMENT ON COLUMN "workout_session_vitals"."zone_5_pct" IS
  'Percentual do tempo acima de 90% da FC máxima (220 − idade).';
