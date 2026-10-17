-- O plano mais simples (#376, A5c): com aderência baixa na semana (2 dias ou
-- menos no alvo), a meta de calorias não muda; o plano fica mais fácil de
-- seguir, com uma refeição a menos e receitas mais rápidas. A dieta nova é
-- gravada pelo BFF, como o próximo bloco; aqui só o registro do ajuste e o
-- fim do check-in, pela mesma regra dos outros ajustes: só a função grava.
--
-- O ajuste guarda refeições por dia, antes e depois: não é dado de saúde novo,
-- é o estado do plano (o mesmo `plan_adjustments` da 0097, com a mesma RLS e a
-- mesma retenção). O `/lgpd-check` da fatia 1 já previa este tipo.

ALTER TYPE public.plan_adjustment_kind ADD VALUE IF NOT EXISTS 'plan_simplified';
--> statement-breakpoint

ALTER TABLE "plan_adjustments" DROP CONSTRAINT "plan_adjustments_reason";
--> statement-breakpoint
ALTER TABLE "plan_adjustments"
  ADD CONSTRAINT "plan_adjustments_reason"
    CHECK ("reason" IN ('weight_above_pace', 'weight_below_pace', 'undo', 'low_adherence'));
--> statement-breakpoint

CREATE FUNCTION public.record_plan_simplification(
  p_check_in_id uuid,
  p_diet_plan_id uuid,
  p_meals_before integer,
  p_meals_after integer
)
RETURNS public.plan_adjustments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_me uuid := (SELECT auth.uid());
  v_check_in public.weekly_check_ins := private.pending_check_in(p_check_in_id);
  v_adjustment public.plan_adjustments;
BEGIN
  IF p_meals_after <> p_meals_before - 1 OR p_meals_after < 3 OR p_meals_before > 6 THEN
    RAISE EXCEPTION 'simplificação de % para % refeições fora da regra: uma a menos, de 6 até 3',
      p_meals_before, p_meals_after
      USING ERRCODE = 'invalid_parameter_value';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.diet_plans d
                 WHERE d.id = p_diet_plan_id AND d.student_id = v_me
                   AND d.specialist_id IS NULL AND d.status = 'active') THEN
    RAISE EXCEPTION 'dieta % não é a dieta própria ativa de quem simplifica', p_diet_plan_id
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  INSERT INTO public.plan_adjustments
    (student_id, check_in_id, kind, before_value, after_value, reason, source, diet_plan_id)
  VALUES
    (v_me, v_check_in.id, 'plan_simplified', p_meals_before, p_meals_after, 'low_adherence',
     'rule', p_diet_plan_id)
  RETURNING * INTO v_adjustment;
  UPDATE public.weekly_check_ins SET status = 'approved' WHERE id = v_check_in.id;

  RETURN v_adjustment;
END;
$$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION public.record_plan_simplification(uuid, uuid, integer, integer) FROM PUBLIC, anon;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.record_plan_simplification(uuid, uuid, integer, integer) TO authenticated;
