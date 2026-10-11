-- O vínculo por código vale nos dois sentidos (#365, O5b).
--
-- Até aqui só o aluno gerava código (`student_link_codes`) e só o especialista
-- resgatava (`link_student_by_code`, 0016). Quem já tem conta — o Praticante,
-- sempre — não entra pelo convite por e-mail ("Email já cadastrado"), e o
-- especialista não tinha onde digitar o código. Agora o especialista também
-- gera, e o aluno resgata.
--
-- Mesmas travas da 0016: o código vence em 24 horas, é apagado ao ser usado, e
-- quem resgata sai de `auth.uid()`, nunca de um parâmetro. O especialista só
-- enxerga os próprios códigos; o aluno não lê a tabela — o resgate acontece
-- dentro da função, que roda como definer.
CREATE TABLE "specialist_link_codes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "specialist_id" uuid NOT NULL
    REFERENCES "public"."profiles"("id") ON DELETE CASCADE,
  "code" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "specialist_link_codes_code_unique" UNIQUE ("code")
);
--> statement-breakpoint

COMMENT ON TABLE "specialist_link_codes" IS
  'Código que o especialista compartilha para o aluno se vincular. Execução de contrato (Art. 7°, V). Lido e gerado só pelo dono; resgatado só por public.link_to_specialist_by_code (#365).';
--> statement-breakpoint

ALTER TABLE "specialist_link_codes" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON "specialist_link_codes" FROM anon;
--> statement-breakpoint
GRANT SELECT, INSERT, DELETE ON "specialist_link_codes" TO authenticated;
--> statement-breakpoint

CREATE POLICY "specialist_link_codes_own" ON "specialist_link_codes"
  FOR ALL TO authenticated
  USING ("specialist_id" = (SELECT auth.uid()))
  WITH CHECK (
    "specialist_id" = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.account_type = 'specialist'
    )
  );
--> statement-breakpoint

CREATE POLICY privileged_session_requires_mfa ON "specialist_link_codes"
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (private.current_session_meets_mfa_requirement())
  WITH CHECK (private.current_session_meets_mfa_requirement());
--> statement-breakpoint

-- O aluno (ou Praticante) resgata o código do especialista. O espelho de
-- `link_student_by_code`: o serviço do vínculo é o do especialista, e não há
-- dois vínculos ativos no mesmo serviço.
CREATE OR REPLACE FUNCTION public.link_to_specialist_by_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_student_id    uuid := (SELECT auth.uid());
  v_specialist_id uuid;
  v_service       public.service_type;
  v_clean_code    text := upper(trim(p_code));
BEGIN
  IF v_student_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não autenticado.');
  END IF;

  -- Só aluno se vincula a especialista. Sem isto, um especialista resgataria o
  -- código de outro e viraria "aluno" dele.
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = v_student_id AND p.account_type IN ('student', 'member')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas alunos usam o código do especialista.');
  END IF;

  SELECT slc.specialist_id INTO v_specialist_id
  FROM public.specialist_link_codes slc
  WHERE slc.code = v_clean_code AND slc.expires_at > now();

  IF v_specialist_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Código inválido ou expirado.');
  END IF;

  SELECT ss.service_type INTO v_service
  FROM public.specialist_services ss
  WHERE ss.specialist_id = v_specialist_id
  LIMIT 1;

  IF v_service IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Especialista sem serviço cadastrado.');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.student_specialists s
    WHERE s.student_id = v_student_id
      AND s.service_type = v_service
      AND s.status = 'active'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Você já tem um especialista deste serviço.');
  END IF;

  INSERT INTO public.student_specialists (student_id, specialist_id, service_type, status)
  VALUES (v_student_id, v_specialist_id, v_service, 'active');

  DELETE FROM public.specialist_link_codes WHERE code = v_clean_code;

  RETURN jsonb_build_object('success', true);
END;
$$;
--> statement-breakpoint

REVOKE EXECUTE ON FUNCTION public.link_to_specialist_by_code(text) FROM PUBLIC, anon;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.link_to_specialist_by_code(text) TO authenticated;
