-- A corrida vira medida: distância, ritmo, cadência e FC média.
--
-- Issue #278. Duas bases legais diferentes, e por isso dois destinos
-- diferentes — é a decisão central desta migration.
--
--   workout_sessions          distância, ritmo, cadência    Art. 7°, V
--   workout_session_vitals    FC média da sessão            Art. 11, II, f + I
--
-- Separar não é preciosismo. A RLS decide por LINHA, não por coluna: FC média
-- dentro de `workout_sessions` seria dado de Art. 11 numa tabela cuja política
-- de especialista não consulta consentimento — e não pode consultar, porque
-- somar a checagem ali desligaria a prescrição de treino de quem revoga. Seria
-- a pendência de `workout_sessions.notes` (§6 da LGPD_COMPLIANCE.md, aberta em
-- 2026-09-04) pela segunda vez, na mesma tabela, agora de propósito.
--
-- **Nenhuma coordenada.** Distância e ritmo são derivados no aparelho e só o
-- derivado chega aqui. A série de posições revela endereço de casa, janela de
-- ausência e os lugares que a pessoa frequenta, sem mudar nenhuma decisão de
-- prescrição — mesmo julgamento que tirou horário de dormir e acordar da `0046`
-- (§2.3). A `verify-rls.sql` trava isso contra o schema inteiro, inclusive
-- contra a tabela que ainda não existe.

-- ── Medidas de desempenho: execução de contrato ──────────────────────────────
-- Entram ao lado de `duration_seconds` e `active_calories`, que a `0035` já
-- classificou como execução de contrato pelo mesmo motivo: são a medida da
-- sessão que o aluno contratou, não relato clínico.

ALTER TABLE "workout_sessions"
  ADD COLUMN "distance_meters" integer,
  ADD COLUMN "avg_pace_seconds_per_km" integer,
  ADD COLUMN "avg_cadence_spm" integer;
--> statement-breakpoint

-- NULL é ausência de medida, nunca zero — a lição do `hasRecords` da `0015`,
-- repetida na `0046`. Aqui ela tem caso concreto: quem nega a permissão de
-- localização corre de verdade e termina sem distância. Zero diria que ele não
-- saiu do lugar.
COMMENT ON COLUMN "workout_sessions"."distance_meters" IS
  'Distância derivada do GPS, em metros. NULL = sem leitura de localização, nunca zero. A série de coordenadas não é gravada (issue #278).';
--> statement-breakpoint

COMMENT ON COLUMN "workout_sessions"."avg_pace_seconds_per_km" IS
  'Ritmo médio em segundos por quilômetro. NULL quando não houve percurso suficiente para o número significar algo.';
--> statement-breakpoint

COMMENT ON COLUMN "workout_sessions"."avg_cadence_spm" IS
  'Cadência média em passos por minuto, medida pelo acelerômetro do aparelho. Deliberadamente NÃO lida do Health Connect: vinda da plataforma de saúde herdaria o Art. 11 da fonte e exigiria permissão nova só para ela.';
--> statement-breakpoint

-- Faixas de plausibilidade. Existem para barrar erro de unidade, que é a falha
-- real deste caminho — metro gravado como quilômetro, ou segundo por quilômetro
-- gravado como minuto, passariam despercebidos para sempre.
ALTER TABLE "workout_sessions"
  ADD CONSTRAINT "workout_sessions_distance_plausible"
  CHECK ("distance_meters" IS NULL OR ("distance_meters" >= 0 AND "distance_meters" <= 300000));
--> statement-breakpoint

-- 60 s/km são 60 km/h, teto de bicicleta; 3600 s/km é 1 km/h, mais lento que
-- caminhada de idoso. Fora disso é defeito de leitura, não pessoa.
ALTER TABLE "workout_sessions"
  ADD CONSTRAINT "workout_sessions_pace_plausible"
  CHECK ("avg_pace_seconds_per_km" IS NULL OR ("avg_pace_seconds_per_km" >= 60 AND "avg_pace_seconds_per_km" <= 3600));
--> statement-breakpoint

ALTER TABLE "workout_sessions"
  ADD CONSTRAINT "workout_sessions_cadence_plausible"
  CHECK ("avg_cadence_spm" IS NULL OR ("avg_cadence_spm" >= 30 AND "avg_cadence_spm" <= 250));
--> statement-breakpoint

-- As três colunas nascem sem GRANT de UPDATE. A `0036` revogou o UPDATE de
-- tabela e concedeu por coluna; privilégio de coluna não se estende ao que vem
-- depois, então nada a fazer aqui — mas a guarda da `verify-rls.sql` afirma a
-- lista exata, e falha se alguém conceder por engano.

-- ── FC média da sessão: Art. 11, em tabela própria ───────────────────────────

CREATE TABLE "workout_session_vitals" (
  -- Chave primária E estrangeira: uma linha por sessão, no máximo. Sem coluna
  -- `student_id` de propósito — quem é o dono da sessão já está em
  -- `workout_sessions`, e duplicar aqui criaria a possibilidade de as duas
  -- discordarem. Uma linha com o dono errado entregaria a FC de um aluno ao
  -- especialista de outro.
  "session_id" uuid PRIMARY KEY
    REFERENCES "workout_sessions"("id") ON DELETE CASCADE,
  "avg_heart_rate" integer NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint

COMMENT ON TABLE "workout_session_vitals" IS
  'FC média por sessão, lida do Health Connect/HealthKit. Art. 11, II, f + I: tutela da saúde MAIS consentimento. Existe separada de workout_sessions porque a RLS decide por linha e aquela tabela é de execução de contrato.';
--> statement-breakpoint

-- **Só a média.** A série de batimentos permite inferir estresse, atividade
-- sexual e crise de ansiedade — muito além de acompanhar treino. É a mesma
-- minimização que a `0046` aplicou à FC de repouso, e o motivo de esta tabela
-- ter uma coluna de medida, e não um `jsonb`.
COMMENT ON COLUMN "workout_session_vitals"."avg_heart_rate" IS
  'FC média da sessão em bpm. Só a média — a série intradiária é vedada.';
--> statement-breakpoint

-- 30 bpm é abaixo do atleta de endurance mais bradicárdico em esforço; 230 é
-- acima da FC máxima de qualquer adulto.
ALTER TABLE "workout_session_vitals"
  ADD CONSTRAINT "workout_session_vitals_hr_plausible"
  CHECK ("avg_heart_rate" >= 30 AND "avg_heart_rate" <= 230);
--> statement-breakpoint

ALTER TABLE "workout_session_vitals" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- A `0020` concede SELECT, INSERT, UPDATE e DELETE por ALTER DEFAULT
-- PRIVILEGES a toda tabela nova. Sem este REVOKE, os dois últimos chegam de
-- graça e a única coisa que os barra é a ausência de política — que é
-- exatamente a proteção que a `0017` achou que tinha e não tinha. Camada dupla,
-- e as duas verificáveis de fora.
REVOKE UPDATE, DELETE ON "workout_session_vitals" FROM authenticated;
--> statement-breakpoint

-- O `REVOKE ... ON ALL TABLES ... FROM anon` da `0020` foi uma varredura de uma
-- vez só: as default privileges do Supabase voltam a conceder a cada tabela
-- nova, então toda migration que cria tabela refaz este revoke. Sem ele, dado
-- de saúde fica ao alcance da chave anônima, que vai no bundle do app.
REVOKE ALL ON "workout_session_vitals" FROM anon;
--> statement-breakpoint

-- O aluno lê a própria FC. Histórico dele, sempre — revogar consentimento
-- interrompe a coleta e fecha o especialista, e não apaga o que já foi medido
-- (§7).
CREATE POLICY "vitals_own_select" ON "workout_session_vitals"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workout_sessions ws
      WHERE ws.id = session_id AND ws.student_id = (SELECT auth.uid())
    )
  );
--> statement-breakpoint

-- Só o aluno grava, e só na própria sessão. O especialista não escreve FC de
-- ninguém: terceiro registrando sinal vital alheio não é medida, é invenção —
-- mesma razão de ele não escrever em `workout_sessions`.
CREATE POLICY "vitals_own_insert" ON "workout_session_vitals"
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workout_sessions ws
      WHERE ws.id = session_id AND ws.student_id = (SELECT auth.uid())
    )
  );
--> statement-breakpoint

-- Vínculo ativo E consentimento vigente. Para o especialista ler dado de saúde
-- o Art. 11 pede tutela da saúde (II, f) e consentimento (I): caiu o
-- consentimento, caiu a base. É a política que põe esta tabela na lista de
-- Art. 11 da guarda de classificação da `verify-rls.sql`.
CREATE POLICY "specialist_read_consented_session_vitals" ON "workout_session_vitals"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workout_sessions ws
      WHERE ws.id = session_id
        AND (SELECT private.is_linked_specialist(ws.student_id))
        AND (SELECT private.has_health_consent(ws.student_id))
    )
  );
--> statement-breakpoint

-- Sem política de UPDATE e sem política de DELETE, de propósito: não existe
-- "FOR ALL exceto DELETE", e foi assim que a `0017` concedeu ao aluno um DELETE
-- que ninguém decidiu conceder. Medida corrigida não é medida; a eliminação
-- chega pelo CASCADE a partir da conta.
COMMENT ON POLICY "specialist_read_consented_session_vitals" ON "workout_session_vitals" IS
  'is_linked_specialist + has_health_consent. Revogar o consentimento fecha o acesso — mesma dupla da 0043 em health_daily_metrics.';
