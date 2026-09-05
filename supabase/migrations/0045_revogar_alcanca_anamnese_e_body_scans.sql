-- Revogar o consentimento fecha o acesso do especialista à anamnese e aos
-- body scans — as duas tabelas de saúde que faltavam.
--
-- Fecha o levantamento aberto pela `0043`: toda tabela em que o especialista
-- alcança dado do aluno foi conferida, e o critério é a **base legal**, não o
-- vínculo.
--
-- ── O que ganha a checagem, e o que não pode ganhar ──────────────────────────
--
-- Art. 11 (tutela da saúde + consentimento) — o consentimento é metade da base,
-- então revogar derruba o acesso:
--
--   health_daily_metrics    0043
--   meal_logs               0044
--   physical_assessments    0044
--   student_anamnesis       aqui
--   body_scans              aqui
--
-- Art. 7°, V (execução de contrato) — o consentimento **não** é a base, e somar
-- a checagem quebraria o serviço contratado sem ganho jurídico nenhum:
--
--   profiles                identificação
--   specialist_services     o que o profissional oferece
--   workout_sessions        séries, cargas, datas, intensity
--   workout_session_sets    idem
--   workout_session_exercises idem
--   achievements            gamificação
--   daily_goals             gamificação
--   student_streaks         gamificação
--
-- Revogar o consentimento de dados de saúde não pode desligar a prescrição de
-- treino nem apagar o aluno do painel: são coisas que o aluno contratou, e o
-- caminho para encerrá-las é encerrar o vínculo. Estas oito ficam como estão.
--
-- ── O caso que a RLS não resolve ─────────────────────────────────────────────
--
-- `workout_sessions` é **mista**: séries e datas são execução de contrato, mas
-- `workout_sessions.notes` é o campo aberto onde o aluno escreve sobre dor,
-- tontura e cirurgia — Art. 11, e assim classificado na `LGPD_COMPLIANCE.md`
-- §2.2 desde 2026-08-28. RLS decide por linha, não por coluna: fechar a tabela
-- derrubaria o acompanhamento de desempenho junto.
--
-- Hoje a proteção existe e mora no cliente, em
-- `app/src/modules/workout/services/consentimento.ts` (`notasSeConsentido`),
-- que é a mesma classe de lacuna que a `0043` fechou — checagem fora do banco.
-- Não é resolvida aqui: pede coluna gerada, view ou trigger, e é decisão de
-- desenho, não de política. Fica registrada como pendência.
--
-- ── Helper ───────────────────────────────────────────────────────────────────
--
-- `health_consent_not_revoked`, o mesmo da `0044`, e não o estrito da `0043`:
-- a anamnese é preenchida pelo aluno no onboarding sem passar por portão de
-- consentimento, então existe acervo sem linha em `student_consents`. O estrito
-- apagaria do especialista a anamnese de todo aluno anterior ao portão — o
-- histórico de lesões e medicamentos de quem ele atende hoje.
--
-- `body_scans` nasce com consentimento checado (`aiBodyScan.ts` e a rota de
-- body scan recusam sem ele) e aceitaria o helper estrito. Fica com o suave por
-- consistência: duas semânticas já são uma a mais do que o necessário, e o
-- ganho de apertar só o scan não paga a terceira regra na cabeça de quem lê.

DROP POLICY IF EXISTS "anamnesis_specialist_read" ON "student_anamnesis";

CREATE POLICY "anamnesis_specialist_read" ON "student_anamnesis"
  FOR SELECT USING (
    private.is_linked_specialist(student_id)
    AND private.health_consent_not_revoked(student_id)
  );

DROP POLICY IF EXISTS "body_scans_specialist_read" ON "body_scans";

CREATE POLICY "body_scans_specialist_read" ON "body_scans"
  FOR SELECT USING (
    private.is_linked_specialist(student_id)
    AND private.health_consent_not_revoked(student_id)
  );
