-- Duas correções de superfície de ataque encontradas na auditoria das rotas do
-- BFF em 2026-08-11.

-- ── 1. O padrão do cadastro era a conta mais privilegiada ────────────────────
--
-- `handle_new_user` caía em 'specialist' quando o cadastro não mandava
-- `account_type`. Hoje todos os caminhos mandam — `auth.service.ts` tem uma
-- função por tipo —, então o default nunca é exercido. É exatamente por isso
-- que ele precisa mudar: um caminho novo que esqueça o campo cria um
-- profissional, com acesso a aluno, em vez de um aluno comum.
--
-- Errar para menos gera chamado de suporte; errar para mais gera vazamento.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, account_type, account_status)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(
      (NEW.raw_user_meta_data->>'account_type')::public.account_type,
      'member'
    ),
    'active'::public.account_status
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ── 2. O bucket de fotos de avaliação ────────────────────────────────────────
--
-- `PostureAnalysis.tsx` faz upload para o bucket 'assessments' desde sempre, e
-- ele não existia em lugar nenhum: nem local nem no projeto remoto. Ou seja, a
-- funcionalidade estava quebrada — e, quando alguém a consertasse pelo painel,
-- o bucket nasceria com a política que a pessoa escolhesse naquele minuto, sem
-- revisão e sem histórico. Foi assim que 18 tabelas ficaram sem RLS.
--
-- `public = false`: o acesso é por URL assinada, que é o que o app já usa.
-- Sem isso o `getPublicUrl` de qualquer um serve a foto de qualquer aluno.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'assessments',
  'assessments',
  false,
  10485760, -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- O caminho carrega o dono: '<student_id>/<resto>'. É o que a política usa para
-- decidir, então mudar o formato do caminho quebra o isolamento — está fixado
-- em SupabaseStorageService.getAssessmentPhotoPath.
DROP POLICY IF EXISTS "assessments_student_own" ON storage.objects;
CREATE POLICY "assessments_student_own" ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'assessments'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'assessments'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

-- Mesmo recorte de `physical_assessments`: quem fotografa é o especialista —
-- a tela vive na aba de alunos dele —, então ele insere e lê, mas não altera
-- nem apaga. Foto de avaliação é registro; corrigir é fotografar de novo.
-- E o acesso cai no desvínculo, porque a checagem é feita na leitura.
DROP POLICY IF EXISTS "assessments_specialist_read" ON storage.objects;
CREATE POLICY "assessments_specialist_read" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'assessments'
    AND (SELECT private.is_linked_specialist(((storage.foldername(name))[1])::uuid))
  );

DROP POLICY IF EXISTS "assessments_specialist_insert" ON storage.objects;
CREATE POLICY "assessments_specialist_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'assessments'
    AND (SELECT private.is_linked_specialist(((storage.foldername(name))[1])::uuid))
  );
