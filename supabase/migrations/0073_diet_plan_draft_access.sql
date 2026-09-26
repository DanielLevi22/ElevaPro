-- Rascunho de dieta e o acesso a plano, refeição e item (#337).
--
-- O /lgpd-check da #337 (docs/LGPD_COMPLIANCE.md, módulo Nutrition) achou três
-- lacunas na RLS da 0013, que esta migration fecha junto com o rascunho:
--
-- 1. A política do especialista era só `specialist_id = auth.uid()`: o
--    desvinculado seguia lendo e editando, revogar o consentimento não fechava
--    nada, e — valendo também de WITH CHECK — qualquer especialista criava plano
--    para qualquer aluno. A trava de revogação da `verify-rls.sql` não via as
--    três tabelas porque só inspeciona política que cita o vínculo.
-- 2. `diet_meals` e `diet_meal_items` eram FOR ALL para o aluno: ele reescrevia
--    a prescrição do especialista pela API.
-- 3. O consentimento antes do primeiro plano do Praticante existia só no cliente.
--
-- O helper de consentimento do especialista é o tolerante
-- (`health_consent_not_revoked`), pelo mesmo motivo da 0044: há acervo de dieta
-- gravado sem linha em `student_consents`, e o estrito esvaziaria o painel. O do
-- Praticante é o estrito: ele passa pelo portão de consentimento ao abrir o app.
--
-- As condições ficam escritas na política, e não num helper, de propósito: a
-- trava de revogação da `verify-rls.sql` procura o vínculo e o consentimento no
-- texto da política, e um helper opaco a cegaria de novo.

-- ── Um plano ativo por aluno ─────────────────────────────────────────────────
-- O invariante existia só no cliente, e falhava: finalizar o plano anterior era
-- um UPDATE sob a RLS de quem criava, que afetava zero linhas quando o anterior
-- era do Praticante ou de outro especialista — sem erro. Fica o mais recente.

UPDATE public.diet_plans dp
   SET status = 'finished', end_date = COALESCE(dp.end_date, CURRENT_DATE)
 WHERE dp.status = 'active'
   AND EXISTS (
     SELECT 1 FROM public.diet_plans newer
      WHERE newer.student_id = dp.student_id
        AND newer.status = 'active'
        AND (newer.created_at, newer.id) > (dp.created_at, dp.id)
   );
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS diet_plans_one_active_per_student
  ON public.diet_plans (student_id) WHERE status = 'active';
--> statement-breakpoint

-- As colunas que a RLS consulta, e a FK que as refeições seguem.
CREATE INDEX IF NOT EXISTS diet_plans_specialist_id_idx ON public.diet_plans (specialist_id);
CREATE INDEX IF NOT EXISTS diet_meals_diet_plan_id_idx ON public.diet_meals (diet_plan_id);
CREATE INDEX IF NOT EXISTS diet_meal_items_diet_meal_id_idx
  ON public.diet_meal_items (diet_meal_id);
--> statement-breakpoint

-- ── diet_plans ───────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "student_read_own_diet_plans" ON public.diet_plans;
DROP POLICY IF EXISTS "member_manage_own_diet_plans" ON public.diet_plans;
DROP POLICY IF EXISTS "specialist_manage_own_diet_plans" ON public.diet_plans;

-- O aluno lê o que é dele, menos o rascunho que o especialista ainda monta. O
-- rascunho do próprio Praticante (sem especialista) é dele e ele lê.
CREATE POLICY diet_plans_student_read ON public.diet_plans
  FOR SELECT TO authenticated
  USING (
    student_id = (SELECT auth.uid())
    AND (status <> 'draft' OR specialist_id IS NULL)
  );

CREATE POLICY diet_plans_member_insert ON public.diet_plans
  FOR INSERT TO authenticated
  WITH CHECK (
    student_id = (SELECT auth.uid())
    AND specialist_id IS NULL
    AND private.has_health_consent(student_id)
  );

CREATE POLICY diet_plans_member_update ON public.diet_plans
  FOR UPDATE TO authenticated
  USING (student_id = (SELECT auth.uid()) AND specialist_id IS NULL)
  WITH CHECK (
    student_id = (SELECT auth.uid())
    AND specialist_id IS NULL
    AND private.health_consent_not_revoked(student_id)
  );

-- Apagar o próprio plano não pede consentimento: é o direito de eliminação.
CREATE POLICY diet_plans_member_delete ON public.diet_plans
  FOR DELETE TO authenticated
  USING (student_id = (SELECT auth.uid()) AND specialist_id IS NULL);

CREATE POLICY diet_plans_specialist_manage ON public.diet_plans
  FOR ALL TO authenticated
  USING (
    specialist_id = (SELECT auth.uid())
    AND private.is_linked_specialist(student_id)
    AND private.health_consent_not_revoked(student_id)
  )
  WITH CHECK (
    specialist_id = (SELECT auth.uid())
    AND private.is_linked_specialist(student_id)
    AND private.health_consent_not_revoked(student_id)
  );
--> statement-breakpoint

-- ── diet_meals ───────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "diet_meals_access" ON public.diet_meals;

CREATE POLICY diet_meals_student_read ON public.diet_meals
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.diet_plans dp
       WHERE dp.id = diet_meals.diet_plan_id
         AND dp.student_id = (SELECT auth.uid())
         AND (dp.status <> 'draft' OR dp.specialist_id IS NULL)
    )
  );

CREATE POLICY diet_meals_member_write ON public.diet_meals
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.diet_plans dp
       WHERE dp.id = diet_meals.diet_plan_id
         AND dp.student_id = (SELECT auth.uid())
         AND dp.specialist_id IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.diet_plans dp
       WHERE dp.id = diet_meals.diet_plan_id
         AND dp.student_id = (SELECT auth.uid())
         AND dp.specialist_id IS NULL
         AND private.health_consent_not_revoked(dp.student_id)
    )
  );

CREATE POLICY diet_meals_specialist_manage ON public.diet_meals
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.diet_plans dp
       WHERE dp.id = diet_meals.diet_plan_id
         AND dp.specialist_id = (SELECT auth.uid())
         AND private.is_linked_specialist(dp.student_id)
         AND private.health_consent_not_revoked(dp.student_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.diet_plans dp
       WHERE dp.id = diet_meals.diet_plan_id
         AND dp.specialist_id = (SELECT auth.uid())
         AND private.is_linked_specialist(dp.student_id)
         AND private.health_consent_not_revoked(dp.student_id)
    )
  );
--> statement-breakpoint

-- ── diet_meal_items ──────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "diet_meal_items_access" ON public.diet_meal_items;

CREATE POLICY diet_meal_items_student_read ON public.diet_meal_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.diet_meals dm
        JOIN public.diet_plans dp ON dp.id = dm.diet_plan_id
       WHERE dm.id = diet_meal_items.diet_meal_id
         AND dp.student_id = (SELECT auth.uid())
         AND (dp.status <> 'draft' OR dp.specialist_id IS NULL)
    )
  );

CREATE POLICY diet_meal_items_member_write ON public.diet_meal_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.diet_meals dm
        JOIN public.diet_plans dp ON dp.id = dm.diet_plan_id
       WHERE dm.id = diet_meal_items.diet_meal_id
         AND dp.student_id = (SELECT auth.uid())
         AND dp.specialist_id IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.diet_meals dm
        JOIN public.diet_plans dp ON dp.id = dm.diet_plan_id
       WHERE dm.id = diet_meal_items.diet_meal_id
         AND dp.student_id = (SELECT auth.uid())
         AND dp.specialist_id IS NULL
         AND private.health_consent_not_revoked(dp.student_id)
    )
  );

CREATE POLICY diet_meal_items_specialist_manage ON public.diet_meal_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.diet_meals dm
        JOIN public.diet_plans dp ON dp.id = dm.diet_plan_id
       WHERE dm.id = diet_meal_items.diet_meal_id
         AND dp.specialist_id = (SELECT auth.uid())
         AND private.is_linked_specialist(dp.student_id)
         AND private.health_consent_not_revoked(dp.student_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.diet_meals dm
        JOIN public.diet_plans dp ON dp.id = dm.diet_plan_id
       WHERE dm.id = diet_meal_items.diet_meal_id
         AND dp.specialist_id = (SELECT auth.uid())
         AND private.is_linked_specialist(dp.student_id)
         AND private.health_consent_not_revoked(dp.student_id)
    )
  );
--> statement-breakpoint

-- ── Enviar o rascunho ────────────────────────────────────────────────────────
-- Atômico: finaliza o ativo do aluno e ativa o rascunho na mesma transação.
-- SECURITY DEFINER porque o ativo anterior pode ser de outro autor (Praticante
-- ou outro especialista), que a RLS de quem envia não alcança — e foi assim
-- que nasciam dois planos ativos. Por escapar da RLS, a função confere tudo o
-- que a política conferiria, inclusive a trava de MFA da 0067.

CREATE OR REPLACE FUNCTION public.activate_diet_plan(p_plan_id uuid)
RETURNS public.diet_plans
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_me uuid := (SELECT auth.uid());
  v_plan public.diet_plans;
BEGIN
  IF NOT private.current_session_meets_mfa_requirement() THEN
    RAISE EXCEPTION 'activate_diet_plan requires an aal2 session for privileged accounts'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO v_plan FROM public.diet_plans WHERE id = p_plan_id FOR UPDATE;

  IF v_plan.id IS NULL
     OR NOT (
       (v_plan.specialist_id = v_me
         AND private.is_linked_specialist(v_plan.student_id)
         AND private.health_consent_not_revoked(v_plan.student_id))
       OR (v_plan.specialist_id IS NULL
         AND v_plan.student_id = v_me
         AND private.has_health_consent(v_me))
     ) THEN
    RAISE EXCEPTION 'diet plan % not found or not writable by the caller', p_plan_id
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_plan.status <> 'draft' THEN
    RAISE EXCEPTION 'diet plan % is %, expected draft', p_plan_id, v_plan.status
      USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.diet_plans
     SET status = 'finished', end_date = CURRENT_DATE
   WHERE student_id = v_plan.student_id AND status = 'active';

  UPDATE public.diet_plans SET status = 'active' WHERE id = p_plan_id
  RETURNING * INTO v_plan;

  RETURN v_plan;
END;
$$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION public.activate_diet_plan(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.activate_diet_plan(uuid) TO authenticated;
--> statement-breakpoint

-- ── Auditoria do ciclo de vida ───────────────────────────────────────────────
-- Evento sem conteúdo: ator, titular e plano pseudonimizados (padrão da 0071).

CREATE OR REPLACE FUNCTION private.audit_diet_plan_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_event_type text;
BEGIN
  IF NEW.status = 'active' AND OLD.status IS DISTINCT FROM 'active' THEN
    v_event_type := 'health.diet_plan.activated';
  ELSIF NEW.status = 'finished' AND OLD.status IS DISTINCT FROM 'finished' THEN
    v_event_type := 'health.diet_plan.finished';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO private.security_audit_events (
    occurred_at, event_type, outcome, actor_hash, subject_hash,
    resource_type, resource_id, origin, expires_at
  ) VALUES (
    v_now, v_event_type, 'succeeded', private.audit_principal_hash((SELECT auth.uid())),
    private.audit_principal_hash(NEW.student_id), 'diet_plan',
    private.audit_principal_hash(NEW.id), 'database', v_now + interval '365 days'
  );

  RETURN NEW;
END;
$$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION private.audit_diet_plan_status_change()
  FROM PUBLIC, anon, authenticated, service_role;
--> statement-breakpoint

CREATE TRIGGER diet_plans_audit_status_change
  AFTER UPDATE OF status ON public.diet_plans
  FOR EACH ROW EXECUTE FUNCTION private.audit_diet_plan_status_change();
--> statement-breakpoint

-- ── Retenção do rascunho ─────────────────────────────────────────────────────
-- Rascunho que ninguém envia é dado de saúde sem finalidade (Art. 15, I). Sai
-- ao fim do vínculo do autor — o aluno não o lê e o autor perdeu o acesso — e,
-- de qualquer forma, 90 dias depois de criado. Refeições e itens vão em cascata.

CREATE OR REPLACE FUNCTION private.purge_drafts_of_ended_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.diet_plans
   WHERE student_id = OLD.student_id
     AND specialist_id = OLD.specialist_id
     AND status = 'draft';
  RETURN NULL;
END;
$$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION private.purge_drafts_of_ended_link()
  FROM PUBLIC, anon, authenticated, service_role;
--> statement-breakpoint

CREATE TRIGGER student_specialists_purge_diet_drafts_on_end
  AFTER UPDATE OF status ON public.student_specialists
  FOR EACH ROW
  WHEN (OLD.status = 'active' AND NEW.status <> 'active')
  EXECUTE FUNCTION private.purge_drafts_of_ended_link();
--> statement-breakpoint

CREATE TRIGGER student_specialists_purge_diet_drafts_on_delete
  AFTER DELETE ON public.student_specialists
  FOR EACH ROW EXECUTE FUNCTION private.purge_drafts_of_ended_link();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION private.purge_stale_diet_plan_drafts()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_deleted bigint;
BEGIN
  DELETE FROM public.diet_plans
   WHERE status = 'draft' AND created_at < clock_timestamp() - interval '90 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION private.purge_stale_diet_plan_drafts()
  FROM PUBLIC, anon, authenticated, service_role;
--> statement-breakpoint

DO $$
DECLARE
  v_job_id bigint;
BEGIN
  FOR v_job_id IN SELECT jobid FROM cron.job WHERE jobname = 'purge-stale-diet-plan-drafts'
  LOOP
    PERFORM cron.unschedule(v_job_id);
  END LOOP;
  PERFORM cron.schedule(
    'purge-stale-diet-plan-drafts',
    '17 4 * * *',
    'SELECT private.purge_stale_diet_plan_drafts()'
  );
END;
$$;
