-- O Modo Descanso (#376, A8): a pessoa pausa o plano por uns dias, e a meta, a
-- sequência e o check-in esperam. Ao voltar de uma pausa longa, a semana de
-- retorno começa mais leve.
--
-- Sem o motivo: "estou doente" e "estou machucada" são dado de saúde, e a pausa
-- não precisa deles para funcionar. O motivo só muda o texto da tela na hora
-- (minimização, Art. 6°, III). O que fica é o estado do plano — de quando a
-- quando —, execução de contrato (Art. 7°, V).
--
-- Gravada só por `start_rest` e `end_rest`; o aluno lê a sua, e o especialista
-- com vínculo ativo lê para saber que o aluno está pausado.
CREATE TABLE "rest_periods" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "student_id" uuid NOT NULL
    REFERENCES "public"."profiles"("id") ON DELETE CASCADE,
  "starts_on" date NOT NULL,
  -- O fim previsto; nulo é "não sei".
  "planned_until" date,
  -- O dia em que a pessoa voltou; nulo enquanto descansa.
  "ended_on" date,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "rest_periods_planned_after_start" CHECK ("planned_until" >= "starts_on"),
  CONSTRAINT "rest_periods_ended_after_start" CHECK ("ended_on" >= "starts_on")
);
--> statement-breakpoint

COMMENT ON TABLE "rest_periods" IS
  'Modo Descanso: de quando a quando o plano ficou pausado. Sem o motivo (dado de saúde que a pausa não precisa). Execução de contrato (Art. 7°, V). Gravada só por public.start_rest e public.end_rest (#376).';
--> statement-breakpoint

-- Uma pausa aberta por vez.
CREATE UNIQUE INDEX "rest_periods_one_open" ON "rest_periods" ("student_id") WHERE "ended_on" IS NULL;
--> statement-breakpoint

ALTER TABLE "rest_periods" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON "rest_periods" FROM anon;
--> statement-breakpoint
REVOKE INSERT, UPDATE, DELETE ON "rest_periods" FROM authenticated;
--> statement-breakpoint
GRANT SELECT ON "rest_periods" TO authenticated;
--> statement-breakpoint

CREATE POLICY "rest_periods_student_read" ON "rest_periods"
  FOR SELECT TO authenticated
  USING ("student_id" = (SELECT auth.uid()));
--> statement-breakpoint
CREATE POLICY "rest_periods_specialist_read" ON "rest_periods"
  FOR SELECT TO authenticated
  USING ((SELECT private.is_linked_specialist("student_id")));
--> statement-breakpoint
CREATE POLICY privileged_session_requires_mfa ON "rest_periods"
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (private.current_session_meets_mfa_requirement())
  WITH CHECK (private.current_session_meets_mfa_requirement());
--> statement-breakpoint

-- Começa a pausa hoje, no fuso do Brasil, até `p_until` (nulo é "não sei").
CREATE OR REPLACE FUNCTION public.start_rest(p_until date)
RETURNS public.rest_periods
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_me uuid := (SELECT auth.uid());
  v_today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_rest public.rest_periods;
BEGIN
  IF v_me IS NULL OR NOT private.current_session_meets_mfa_requirement()
     OR NOT EXISTS (SELECT 1 FROM public.profiles p
                    WHERE p.id = v_me AND p.account_type IN ('student', 'member')) THEN
    RAISE EXCEPTION 'pausa recusada: só o aluno pausa o próprio plano'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_until IS NOT NULL AND p_until < v_today THEN
    RAISE EXCEPTION 'pausa recusada: o fim % é antes de hoje (%)', p_until, v_today
      USING ERRCODE = 'invalid_parameter_value';
  END IF;
  IF EXISTS (SELECT 1 FROM public.rest_periods r WHERE r.student_id = v_me AND r.ended_on IS NULL) THEN
    RAISE EXCEPTION 'pausa recusada: o Modo Descanso já está ligado'
      USING ERRCODE = 'unique_violation';
  END IF;

  INSERT INTO public.rest_periods (student_id, starts_on, planned_until)
    VALUES (v_me, v_today, p_until)
  RETURNING * INTO v_rest;
  RETURN v_rest;
END;
$$;
--> statement-breakpoint

-- Encerra a pausa aberta hoje: "Voltar antes", ou a volta no fim previsto.
CREATE OR REPLACE FUNCTION public.end_rest()
RETURNS public.rest_periods
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_me uuid := (SELECT auth.uid());
  v_today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_rest public.rest_periods;
BEGIN
  IF v_me IS NULL OR NOT private.current_session_meets_mfa_requirement() THEN
    RAISE EXCEPTION 'volta recusada: só o aluno encerra a própria pausa'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  UPDATE public.rest_periods
     SET ended_on = GREATEST(v_today, starts_on)
   WHERE student_id = v_me AND ended_on IS NULL
  RETURNING * INTO v_rest;
  IF v_rest.id IS NULL THEN
    RAISE EXCEPTION 'volta recusada: o Modo Descanso não está ligado'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN v_rest;
END;
$$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION public.start_rest(date) FROM PUBLIC, anon;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.start_rest(date) TO authenticated;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.end_rest() FROM PUBLIC, anon;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.end_rest() TO authenticated;
