-- O placar da semana (issue #320).
--
-- O serviço do ranking lia `ranking_scores` desde o começo, e a tabela nunca
-- existiu: a consulta falhava e a aba abria vazia. Esta migration cria a tabela,
-- a regra que transforma treino em ponto e a única leitura do placar.
--
-- Com o parecer do /lgpd-check na issue.
--
-- Base legal: Execução de Contrato (Art. 7°, V), a mesma de `workout_sessions`,
-- de onde o ponto sai. Refeição, água e meta de dieta **não pontuam**: o placar
-- revelaria a adesão à dieta, que é dado de saúde (Art. 11).
--
-- **Quem grava:** só o trigger. O aluno não tem INSERT, UPDATE nem DELETE, senão
-- escreveria a própria pontuação.
--
-- **Quem lê a linha:** o dono e o especialista vinculado, como as demais tabelas
-- de gamificação (0019). O placar com os outros participantes sai só pela
-- `get_leaderboard`, que devolve o mínimo: a RLS de `profiles` não deixa ler o
-- nome de quem não é vinculado, e não deve deixar.
--
-- Retenção: enquanto a conta existir (ON DELETE CASCADE a partir de profiles).

-- ── A regra do ponto ─────────────────────────────────────────────────────────

-- A semana vai de segunda a domingo no horário de Brasília. Em UTC, o treino de
-- domingo à noite cairia na semana seguinte.
CREATE FUNCTION private.ranking_week_start(p_at timestamptz)
RETURNS date
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT date_trunc('week', p_at AT TIME ZONE 'America/Sao_Paulo')::date;
$$;
--> statement-breakpoint

-- A regra mora aqui e em nenhum outro lugar. Cada sessão concluída vale 100, até
-- duas por dia: sem o teto, abrir e fechar sessão vazia subiria qualquer um.
CREATE FUNCTION private.ranking_points_for_day(p_sessions bigint)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT (100 * LEAST(p_sessions, 2))::integer;
$$;
--> statement-breakpoint

CREATE TABLE "ranking_scores" (
  "student_id" uuid NOT NULL
    REFERENCES "public"."profiles"("id") ON DELETE CASCADE,
  "week_start_date" date NOT NULL,
  "points" integer NOT NULL,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "ranking_scores_pkey" PRIMARY KEY ("student_id", "week_start_date"),
  CONSTRAINT "ranking_scores_points_positive" CHECK ("points" > 0),
  -- A semana é guardada pelo início, e o início é sempre uma segunda.
  CONSTRAINT "ranking_scores_week_is_monday" CHECK (extract(isodow FROM "week_start_date") = 1)
);
--> statement-breakpoint

COMMENT ON TABLE "ranking_scores" IS
  'Pontos da semana por aluno, gravados só pelo trigger de workout_sessions. Art. 7°, V. O placar com outros participantes sai só pela get_leaderboard (issue #320).';
--> statement-breakpoint

-- O placar ordena a semana inteira por pontos.
CREATE INDEX "ranking_scores_week_points_idx"
  ON "ranking_scores" ("week_start_date", "points" DESC);
--> statement-breakpoint

ALTER TABLE "ranking_scores" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- As default privileges do Supabase concedem tudo a cada tabela nova (0020). O
-- cliente só lê: a escrita é do trigger, que roda como dono.
REVOKE ALL ON "ranking_scores" FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON "ranking_scores" FROM authenticated;
GRANT SELECT ON "ranking_scores" TO authenticated;
--> statement-breakpoint

CREATE POLICY "ranking_scores_own_read" ON "ranking_scores"
  FOR SELECT TO authenticated
  USING ("student_id" = (SELECT auth.uid()));
--> statement-breakpoint

CREATE POLICY "ranking_scores_specialist_read" ON "ranking_scores"
  FOR SELECT TO authenticated
  USING ((SELECT private.is_linked_specialist("student_id")));
--> statement-breakpoint

-- Recalcula a semana inteira em vez de somar 100: o teto diário e a sessão
-- apagada pelo serviço ficam certos sem contador que desanda.
--
-- Sessão com data no futuro não pontua. Sem isso, o aluno gravaria hoje os
-- treinos da semana que vem.
CREATE FUNCTION private.recompute_ranking_week(p_student_id uuid, p_week date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_points integer;
BEGIN
  -- A conta sendo apagada leva as sessões em cascata, e cada uma dispara este
  -- recálculo: gravar o placar de quem já não existe violaria a FK.
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_student_id) THEN
    RETURN;
  END IF;

  SELECT COALESCE(SUM(private.ranking_points_for_day(per_day.sessions)), 0)
  INTO v_points
  FROM (
    SELECT count(*) AS sessions
    FROM public.workout_sessions ws
    WHERE ws.student_id = p_student_id
      AND ws.completed_at IS NOT NULL
      AND ws.completed_at <= now()
      -- Intervalo, e não `ranking_week_start(completed_at) = p_week`: assim o
      -- índice (student_id, completed_at) da 0017 serve.
      AND ws.completed_at >= (p_week::timestamp AT TIME ZONE 'America/Sao_Paulo')
      AND ws.completed_at < ((p_week + 7)::timestamp AT TIME ZONE 'America/Sao_Paulo')
    GROUP BY (ws.completed_at AT TIME ZONE 'America/Sao_Paulo')::date
  ) AS per_day;

  IF v_points = 0 THEN
    DELETE FROM public.ranking_scores
    WHERE student_id = p_student_id AND week_start_date = p_week;
    RETURN;
  END IF;

  INSERT INTO public.ranking_scores (student_id, week_start_date, points)
  VALUES (p_student_id, p_week, v_points)
  ON CONFLICT (student_id, week_start_date)
  DO UPDATE SET points = EXCLUDED.points, updated_at = now();
END;
$$;
--> statement-breakpoint

CREATE FUNCTION private.sync_ranking_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') AND OLD.completed_at IS NOT NULL THEN
    PERFORM private.recompute_ranking_week(OLD.student_id, private.ranking_week_start(OLD.completed_at));
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.completed_at IS NOT NULL THEN
    PERFORM private.recompute_ranking_week(NEW.student_id, private.ranking_week_start(NEW.completed_at));
  END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint

REVOKE EXECUTE ON FUNCTION private.ranking_week_start(timestamptz) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.ranking_points_for_day(bigint) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.recompute_ranking_week(uuid, date) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION private.sync_ranking_score() FROM PUBLIC, anon, authenticated;
--> statement-breakpoint

-- O cliente só insere sessão concluída e não mexe em `completed_at` (0036). O
-- UPDATE e o DELETE chegam pelo serviço, e o placar acompanha.
CREATE TRIGGER "workout_sessions_sync_ranking"
  AFTER INSERT OR DELETE OR UPDATE OF "completed_at", "student_id"
  ON "workout_sessions"
  FOR EACH ROW EXECUTE FUNCTION private.sync_ranking_score();
--> statement-breakpoint

-- O placar não nasce zerado: as semanas que já têm sessão entram agora.
INSERT INTO "ranking_scores" ("student_id", "week_start_date", "points")
SELECT student_id, week_start, SUM(private.ranking_points_for_day(sessions))
FROM (
  SELECT ws.student_id,
         private.ranking_week_start(ws.completed_at) AS week_start,
         count(*) AS sessions
  FROM "workout_sessions" ws
  WHERE ws.completed_at IS NOT NULL AND ws.completed_at <= now()
  GROUP BY ws.student_id, 2, (ws.completed_at AT TIME ZONE 'America/Sao_Paulo')::date
) AS per_day
GROUP BY student_id, week_start;
--> statement-breakpoint

-- ── A leitura do placar ──────────────────────────────────────────────────────

-- A versão do texto do aceite do ranking, a mesma de `RANKING_PURPOSE` no
-- `shared`. Diferente da saúde (0043), aqui o banco **compara**: o que o aceite
-- autoriza é aparecer para os outros, e quem aceitou um texto antigo não pode
-- seguir no placar enquanto o app lhe mostra o convite de novo. Subir a versão
-- é mudar as duas pontas no mesmo PR.
CREATE FUNCTION private.ranking_consent_version()
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT '1.0'::text;
$$;
--> statement-breakpoint

CREATE FUNCTION private.has_ranking_consent(p_student_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.student_consents sc
    WHERE sc.student_id = p_student_id
      AND sc.consent_type = 'ranking'
      AND sc.given_at IS NOT NULL
      AND sc.revoked_at IS NULL
      AND sc.policy_version = private.ranking_consent_version()
  );
$$;
--> statement-breakpoint

-- Para desconhecidos, "Ana C.": o primeiro nome e a inicial do último. O nome
-- inteiro é minimização que não custa nada ao placar (Art. 6°, III).
CREATE FUNCTION private.ranking_display_name(p_full_name text, p_full boolean)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  WITH name AS (
    SELECT regexp_split_to_array(COALESCE(NULLIF(btrim(p_full_name), ''), 'Aluno'), '\s+') AS parts
  )
  SELECT CASE
    WHEN p_full THEN array_to_string(parts, ' ')
    WHEN cardinality(parts) = 1 THEN parts[1]
    ELSE parts[1] || ' ' || upper(left(parts[cardinality(parts)], 1)) || '.'
  END
  FROM name;
$$;
--> statement-breakpoint

-- Os participantes do global. Só responde a quem também participa: o aceite
-- diz que o nome aparece para outros participantes (reciprocidade).
CREATE FUNCTION private.global_leaderboard_pool(p_me uuid)
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
BEGIN
  IF NOT private.has_ranking_consent(p_me) THEN
    RAISE EXCEPTION 'ranking_consent_required: quem não participa do ranking não lê o placar'
      USING ERRCODE = '42501';
  END IF;

  RETURN (
    SELECT array_agg(sc.student_id)
    FROM public.student_consents sc
    WHERE sc.consent_type = 'ranking'
      AND sc.given_at IS NOT NULL
      AND sc.revoked_at IS NULL
      AND sc.policy_version = private.ranking_consent_version()
  );
END;
$$;
--> statement-breakpoint

-- Os alunos com vínculo ativo do especialista, com ou sem opt-in: o vínculo já
-- lhe dá acesso ao perfil deles.
CREATE FUNCTION private.my_students_leaderboard_pool(p_me uuid)
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = p_me AND account_type = 'specialist'
  ) THEN
    RAISE EXCEPTION 'my_students é o placar do especialista; a conta % não é especialista', p_me
      USING ERRCODE = '42501';
  END IF;

  RETURN (
    SELECT array_agg(DISTINCT ss.student_id)
    FROM public.student_specialists ss
    WHERE ss.specialist_id = p_me AND ss.status = 'active'
  );
END;
$$;
--> statement-breakpoint

-- As linhas do placar de um grupo: os 50 primeiros e quem consulta, se ficou de
-- fora. A posição da semana anterior é contada no mesmo grupo.
--
-- `p_my_students` liga as duas diferenças do placar do especialista, que andam
-- juntas: aluno sem ponto também aparece, e com o nome inteiro.
CREATE FUNCTION private.leaderboard_rows(
  p_pool uuid[],
  p_week date,
  p_me uuid,
  p_my_students boolean
)
RETURNS TABLE (
  student_id uuid,
  display_name text,
  points integer,
  rank integer,
  previous_rank integer,
  is_me boolean
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  WITH current_week AS (
    SELECT p.id, p.full_name, COALESCE(rs.points, 0) AS points
    FROM public.profiles p
    LEFT JOIN public.ranking_scores rs
      ON rs.student_id = p.id AND rs.week_start_date = p_week
    WHERE p.id = ANY (p_pool)
      AND (rs.points IS NOT NULL OR p_my_students OR p.id = p_me)
  ),
  ranked AS (
    SELECT cw.*,
           rank() OVER (ORDER BY cw.points DESC)::integer AS position,
           row_number() OVER (ORDER BY cw.points DESC, cw.full_name, cw.id) AS line
    FROM current_week cw
  ),
  previous_week AS (
    SELECT rs.student_id,
           rank() OVER (ORDER BY rs.points DESC)::integer AS position
    FROM public.ranking_scores rs
    WHERE rs.week_start_date = p_week - 7
      AND rs.student_id = ANY (p_pool)
  )
  SELECT r.id,
         private.ranking_display_name(r.full_name, p_my_students OR r.id = p_me),
         r.points,
         r.position,
         pw.position,
         r.id = p_me
  FROM ranked r
  LEFT JOIN previous_week pw ON pw.student_id = r.id
  WHERE r.line <= 50 OR r.id = p_me
  ORDER BY r.line;
$$;
--> statement-breakpoint

REVOKE EXECUTE ON FUNCTION private.ranking_consent_version() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION private.has_ranking_consent(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION private.ranking_display_name(text, boolean) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION private.global_leaderboard_pool(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION private.my_students_leaderboard_pool(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION private.leaderboard_rows(uuid[], date, uuid, boolean) FROM PUBLIC, anon, authenticated;
--> statement-breakpoint

-- O placar da semana, e a única forma de ler a pontuação de outra pessoa.
--
-- `global`: os participantes, e só para quem também participa. O especialista
-- não participa, então não lê (ADR-0032).
-- `my_students`: os alunos com vínculo ativo de quem consulta.
--
-- Nunca devolve foto, e-mail nem especialista. Sem `p_week_start`, a semana
-- corrente no relógio do banco — o mesmo que gravou os pontos.
--
-- @example
-- supabase.rpc('get_leaderboard', { p_scope: 'global' })
CREATE FUNCTION public.get_leaderboard(p_scope text, p_week_start date DEFAULT NULL)
RETURNS TABLE (
  student_id uuid,
  display_name text,
  points integer,
  rank integer,
  previous_rank integer,
  is_me boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_me uuid := (SELECT auth.uid());
  v_week date := COALESCE(p_week_start, private.ranking_week_start(now()));
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'get_leaderboard exige sessão autenticada' USING ERRCODE = '42501';
  END IF;
  IF p_scope NOT IN ('global', 'my_students') THEN
    RAISE EXCEPTION 'p_scope "%" inválido; esperado "global" ou "my_students"', p_scope
      USING ERRCODE = '22023';
  END IF;
  IF extract(isodow FROM v_week) <> 1 THEN
    RAISE EXCEPTION 'p_week_start "%" não é uma segunda-feira; esperado o início da semana', v_week
      USING ERRCODE = '22023';
  END IF;

  RETURN QUERY SELECT * FROM private.leaderboard_rows(
    CASE p_scope
      WHEN 'global' THEN private.global_leaderboard_pool(v_me)
      ELSE private.my_students_leaderboard_pool(v_me)
    END,
    v_week, v_me, p_scope = 'my_students'
  );
END;
$$;
--> statement-breakpoint

REVOKE EXECUTE ON FUNCTION public.get_leaderboard(text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(text, date) TO authenticated;
