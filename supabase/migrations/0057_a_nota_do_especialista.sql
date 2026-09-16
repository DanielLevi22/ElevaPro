-- A nota que o especialista escreve sobre o progresso do Aluno (issue #312 §4).
--
-- Com o parecer do /lgpd-check comentado na issue.
--
-- Base legal: Tutela da Saúde (Art. 11, II, f) + Consentimento (Art. 11, I) — é
-- registro clínico do acompanhamento, a mesma base da avaliação física. Não é
-- `workout_sessions.notes`, que é o que o **aluno** escreve sobre a sessão dele.
--
-- **Quem lê.** O Aluno, sempre, inclusive depois de revogar: revogar fecha o
-- acesso do especialista, e nunca apaga o histórico do titular. E o especialista
-- **autor**, com vínculo ativo e consentimento. Outro especialista do mesmo aluno
-- não lê: a nota é o registro de quem escreveu, e o painel de um profissional não
-- é a agenda do outro.
--
-- **Quem escreve, corrige e apaga:** só o autor, enquanto o acesso dele existir. O aluno não apaga a nota —
-- apagar o registro do profissional reescreve o acompanhamento dele, que é a
-- mesma razão da imutabilidade da avaliação (0017). Os caminhos do titular são
-- revogar o consentimento, encerrar o vínculo e excluir a conta.
--
-- **Helper suave** (`health_consent_not_revoked`), como a 0044 e a 0045, e não o
-- estrito da medida declarada: a nota nasce do lado do especialista, que tem
-- acervo de alunos sem linha em `student_consents`, e o estrito esvaziaria o
-- painel de quem nunca passou pelo portão de consentimento.
--
-- Retenção: enquanto a conta do aluno existir (ON DELETE CASCADE a partir de
-- profiles). A conta do especialista apagada deixa a nota com o autor nulo, e não
-- leva o histórico do aluno junto — mesma escolha de `physical_assessments`.

CREATE TABLE "specialist_notes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "student_id" uuid NOT NULL
    REFERENCES "public"."profiles"("id") ON DELETE CASCADE,
  "specialist_id" uuid
    REFERENCES "public"."profiles"("id") ON DELETE SET NULL,
  "body" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  -- Texto vazio não é nota, e o limite existe para o campo aberto não virar
  -- prontuário inteiro colado num lugar que nenhuma tela mostra por completo.
  CONSTRAINT "specialist_notes_body_length" CHECK (char_length("body") BETWEEN 1 AND 2000)
);
--> statement-breakpoint

COMMENT ON TABLE "specialist_notes" IS
  'Nota do especialista sobre o progresso do Aluno. Art. 11, II, f + I. Lida pelo aluno e pelo autor com vínculo ativo e consentimento; escrita, corrigida e apagada só pelo autor (issue #312).';
--> statement-breakpoint

ALTER TABLE "specialist_notes" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- As default privileges do Supabase voltam a conceder a cada tabela nova (0020,
-- 0049): sem este revoke, dado de saúde fica ao alcance da chave anônima, que
-- vai no bundle do app.
REVOKE ALL ON "specialist_notes" FROM anon;
--> statement-breakpoint

-- O relatório do período mostra a última nota dentro da janela: aluno e data.
CREATE INDEX "specialist_notes_student_created_idx"
  ON "specialist_notes" ("student_id", "created_at" DESC);
--> statement-breakpoint

CREATE POLICY "specialist_notes_student_read" ON "specialist_notes"
  FOR SELECT TO authenticated
  USING ("student_id" = (SELECT auth.uid()));
--> statement-breakpoint

CREATE POLICY "specialist_notes_author_read" ON "specialist_notes"
  FOR SELECT TO authenticated
  USING (
    "specialist_id" = (SELECT auth.uid())
    AND (SELECT private.is_linked_specialist("student_id"))
    AND (SELECT private.health_consent_not_revoked("student_id"))
  );
--> statement-breakpoint

CREATE POLICY "specialist_notes_author_insert" ON "specialist_notes"
  FOR INSERT TO authenticated WITH CHECK (
    "specialist_id" = (SELECT auth.uid())
    AND (SELECT private.is_linked_specialist("student_id"))
    AND (SELECT private.health_consent_not_revoked("student_id"))
  );
--> statement-breakpoint

-- Corrigir o que escreveu, sem poder passar a nota para outro autor nem para
-- outro aluno: as duas colunas continuam as mesmas no WITH CHECK.
CREATE POLICY "specialist_notes_author_update" ON "specialist_notes"
  FOR UPDATE TO authenticated
  USING (
    "specialist_id" = (SELECT auth.uid())
    AND (SELECT private.is_linked_specialist("student_id"))
    AND (SELECT private.health_consent_not_revoked("student_id"))
  )
  WITH CHECK (
    "specialist_id" = (SELECT auth.uid())
    AND (SELECT private.is_linked_specialist("student_id"))
  );
--> statement-breakpoint

-- Apagar tem as mesmas condições de ler, e não menos: o Postgres exige que a
-- política de SELECT passe para a linha citada no WHERE de um DELETE, então uma
-- política mais frouxa aqui prometeria o que o banco não entrega. Revogado o
-- consentimento, o autor não lê nem apaga — a nota fica com o aluno, e sai pelo
-- CASCADE da conta dele.
CREATE POLICY "specialist_notes_author_delete" ON "specialist_notes"
  FOR DELETE TO authenticated
  USING (
    "specialist_id" = (SELECT auth.uid())
    AND (SELECT private.is_linked_specialist("student_id"))
    AND (SELECT private.health_consent_not_revoked("student_id"))
  );
