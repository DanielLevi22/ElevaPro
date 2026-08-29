-- Direito de correção do feedback de sessão (Art. 18, III) e fechamento do
-- UPDATE/DELETE irrestrito que a `sessions_own` concedia desde a `0017`.
--
-- ── O que estava errado ───────────────────────────────────────────────────────
--
-- A `0017` criou `sessions_own` como `FOR ALL`, e `FOR ALL` inclui UPDATE e
-- DELETE. Verificado no banco em 2026-08-28, assumindo o papel `authenticated`
-- com as claims de um aluno, dentro de transação com ROLLBACK:
--
--   NOTICE:  UPDATE pelo aluno: PERMITIDO
--   NOTICE:  DELETE pelo aluno: PERMITIDO -- doc diz que e proibido
--
-- A seção 10 do LGPD_COMPLIANCE.md afirmava "DELETE proibido via RLS em
-- sessions". Era controle documentado que o banco não tinha — a mesma classe de
-- defeito que a auditoria de 2026-08-11 encontrou nesta exata tabela, quando as
-- decisões diziam "RLS bloqueia" e a tabela estava sem RLS nenhuma. A afirmação
-- do documento é corrigida no mesmo commit que esta migration, de propósito:
-- foi a distância entre os dois que produziu o defeito.
--
-- O problema nunca foi falta de permissão. Era permissão sem desenho: o aluno
-- podia tudo pelo PostgREST, inclusive reescrever a data de uma sessão, e não
-- podia nada pela interface.
--
-- ── Declaração contra medida ─────────────────────────────────────────────────
--
-- O Art. 18, III garante a correção de dado inexato — e diz também o que é
-- corrigir. O remédio para uma MEDIDA inexata é medir de novo, não digitar
-- outro número: editar uma medida não devolve exatidão, cria um dado falso que
-- o profissional vai usar para prescrever.
--
-- Então o direito é integral e o caminho muda conforme a natureza do dado:
--
--   `notes`     → declaração do titular  → edita no lugar, apaga o texto
--   `intensity` → declaração do titular  → edita no lugar (RPE é o que ele sentiu)
--   datas, séries, duração, calorias → medida do evento → não se editam
--
-- ── Por que o DELETE fecha sem contrariar o Art. 18, VI ──────────────────────
--
-- Aquele inciso cobre dado tratado COM CONSENTIMENTO. A parte consentida da
-- sessão é o texto — e o aluno passa a poder apagá-lo. A execução em si é
-- execução de contrato (Art. 7°, V), e o inciso não a alcança. Quem quiser
-- eliminar tudo tem o caminho da exclusão de conta, com ON DELETE CASCADE.

ALTER TABLE workout_sessions ADD COLUMN feedback_edited_at timestamptz;

COMMENT ON COLUMN workout_sessions.feedback_edited_at IS
  'Quando o aluno corrigiu o próprio feedback (notes/intensity). Metadado '
  'gerado pelo sistema, não conteúdo — execução de contrato (Art. 7°, V). '
  'Existe para o especialista saber que a frase que ele leu ontem pode não ser '
  'a de hoje. Nulo enquanto a sessão nunca foi corrigida. Guardamos QUE mudou '
  'e QUANDO, nunca o texto anterior: a versão antiga é o dado inexato que o '
  'Art. 6°, V manda corrigir, e preservá-la para sempre é o contrário disso.';

-- ── A política deixa de ser FOR ALL ──────────────────────────────────────────
--
-- Uma política por comando, em vez de `FOR ALL` menos alguma coisa: não existe
-- "FOR ALL exceto DELETE". A ausência de política de DELETE é o que fecha o
-- DELETE — e ela é visível em `pg_policies` como ausência, que é exatamente o
-- que a guarda de `verify-rls.sql` passa a afirmar.

DROP POLICY "sessions_own" ON workout_sessions;

CREATE POLICY "sessions_own_read" ON workout_sessions
  FOR SELECT USING (student_id = (SELECT auth.uid()));

CREATE POLICY "sessions_own_insert" ON workout_sessions
  FOR INSERT WITH CHECK (student_id = (SELECT auth.uid()));

-- WITH CHECK repete a condição do USING para que o aluno não consiga mover a
-- sessão para outro `student_id` no mesmo UPDATE. Sem ele, a linha sairia da
-- visão dele — e da RLS — no instante em que fosse gravada.
CREATE POLICY "sessions_own_update" ON workout_sessions
  FOR UPDATE USING (student_id = (SELECT auth.uid()))
          WITH CHECK (student_id = (SELECT auth.uid()));

-- Sem política de DELETE, para ninguém. `sessions_specialist_read` (0017)
-- continua como está: o especialista lê e nunca escreve. Terceiro editando
-- declaração alheia não é correção, é falsificação.

-- ── Privilégio de coluna, e não trigger ──────────────────────────────────────
--
-- A RLS decide QUAIS LINHAS; o GRANT decide QUAIS COLUNAS. São camadas
-- distintas e é a segunda que impede o aluno de transformar um cardio em
-- musculação ou mudar a data de uma sessão.
--
-- Um trigger faria o mesmo com código a mais — e código que precisa ser LIDO
-- para se saber o que ele proíbe. O privilégio é declarativo e aparece em
-- `information_schema.role_column_grants`, verificável por guarda: é o tipo de
-- controle que a auditoria de 2026-08-11 teria encontrado sozinha.
--
-- Atenção registrada: privilégio de coluna vale para o papel inteiro, não por
-- linha. Confirmado antes do REVOKE que nenhum caminho legítimo faz UPDATE em
-- `workout_sessions` pelo cliente — os 16 pontos que tocam a tabela em app/,
-- web/ e shared/ fazem só SELECT e INSERT. O `service_role` das rotas do BFF
-- ignora privilégio e RLS, então não é afetado.
--
-- O REVOKE precisa vir depois da `0020`, que dá `GRANT UPDATE` em todas as
-- tabelas de `public` para `authenticated`. A ordem numérica já garante isso;
-- num banco reconstruído do zero, a `0020` roda antes e esta desfaz o excesso.

REVOKE UPDATE ON workout_sessions FROM authenticated;
GRANT UPDATE (intensity, notes, feedback_edited_at) ON workout_sessions TO authenticated;
