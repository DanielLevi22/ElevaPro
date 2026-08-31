-- O aparelho mede: as medidas geométricas entram no scan, e a análise deixa de
-- ser a única coisa gravada sobre o corpo do aluno.
--
-- Decisão estrutural no `ADR-0022 — O aparelho mede, o modelo interpreta`.
--
-- ── Por que os scans existentes saem ─────────────────────────────────────────
--
-- Todos os `body_scans` de hoje vieram do método antigo: o modelo localizava a
-- cabeça e os pés no olho, a cada chamada, com `temperature` no padrão 1.0. Os
-- números não são reprodutíveis e não têm como ser convertidos para o método
-- novo — não existe conta que transforme uma estimativa visual em medida.
--
-- Preencher as colunas novas para eles fabricaria medição que ninguém fez
-- (Art. 6º, V), e deixá-las nulas manteria na mesma série dois métodos que não
-- se comparam — exatamente o que o `ADR-0022` recusa ao proibir o fallback.
--
-- É o molde da `0037`: avaliação incompleta se apaga, não se completa. Não há
-- nada em produção, e os scans afetados são de teste.
--
-- ── Por que não há marcador de método ────────────────────────────────────────
--
-- Com a série antiga apagada não sobra nada de que distinguir. Uma coluna
-- `measurement_method` seria seam hipotético — o segundo método pagaria por ela
-- se algum dia existisse.

-- 1. Fora a série do método antigo.
DELETE FROM body_scans;

-- ── 2. `muscle_mass_kg` vira `lean_mass_kg` ──────────────────────────────────
--
-- O nome mente: o valor sai de `peso × (1 − gordura)`, e essa conta devolve
-- massa magra, que inclui osso, órgão e água. Chamar isso de massa muscular
-- afirma uma discriminação de tecido que nenhum dos dois lados do cálculo faz.
-- As duas telas já rotulam "Massa magra"; quem estava desalinhado era o schema.
--
-- A coluna homônima de `physical_assessments` NÃO é renomeada: lá a massa vem
-- do protocolo Jackson-Pollock de 7 dobras, medido com adipômetro. Renomear as
-- duas por simetria apagaria a diferença que importa.
--
-- Pela `ADR-0019` a coluna substituída sai na mesma migration, sem deprecação.
ALTER TABLE body_scans
  RENAME COLUMN muscle_mass_kg TO lean_mass_kg;

COMMENT ON COLUMN body_scans.lean_mass_kg IS
  'Massa magra derivada de peso × (1 − gordura). Inclui osso, órgão e água — não é massa muscular.';

-- ── 3. A conversão px/cm, por pose ───────────────────────────────────────────
--
-- Uma por foto, e não uma por scan: o aluno não para exatamente na mesma
-- distância nas três, e usar a conversão de uma foto para ler outra deslocaria
-- as larguras sem ninguém perceber.
--
-- É gravada porque é o que torna a medida defensável. Sem ela, "largura de
-- cintura 32,4 cm" é um número sem procedência; com ela, dá para refazer a
-- conta e ver de onde veio.
ALTER TABLE body_scans
  ADD COLUMN px_per_cm_front numeric(7, 3),
  ADD COLUMN px_per_cm_back  numeric(7, 3),
  ADD COLUMN px_per_cm_side  numeric(7, 3);

-- ── 4. As assimetrias da vista frontal ───────────────────────────────────────
--
-- Em centímetro E em grau, porque respondem a perguntas diferentes: o
-- centímetro diz o quanto, o grau diz o quanto isso é inclinação e não distância
-- entre ombros largos. O sinal carrega o lado — positivo é o direito mais alto.
--
-- Substituem "ombro direito elevado", que é impressão, por evidência que o
-- especialista consegue acompanhar entre dois scans.
ALTER TABLE body_scans
  ADD COLUMN shoulder_drop_cm  numeric(5, 2),
  ADD COLUMN shoulder_tilt_deg numeric(5, 2),
  ADD COLUMN hip_drop_cm       numeric(5, 2),
  ADD COLUMN hip_tilt_deg      numeric(5, 2),
  ADD COLUMN axis_deviation_cm numeric(5, 2);

-- Veredito, não a razão bruta: o número interessa a quem decide se a foto valia,
-- e essa decisão já foi tomada. O que o laudo precisa saber é se as assimetrias
-- daquela foto podem ser perspectiva.
ALTER TABLE body_scans
  ADD COLUMN trunk_rotated boolean;

COMMENT ON COLUMN body_scans.trunk_rotated IS
  'A foto dita frontal tinha o tronco rotacionado. Quando true, assimetria pode ser perspectiva.';

-- ── 5. A postura sagital, da vista lateral ───────────────────────────────────
--
-- Anteriorização de cabeça só existe em ângulo, e é a medida que mais muda ao
-- longo de meses de trabalho postural. Os prumos dizem o quanto cada referência
-- está à frente do tornozelo.
ALTER TABLE body_scans
  ADD COLUMN craniovertebral_angle_deg numeric(5, 2),
  ADD COLUMN plumb_shoulder_cm         numeric(5, 2),
  ADD COLUMN plumb_hip_cm              numeric(5, 2),
  ADD COLUMN plumb_knee_cm             numeric(5, 2);

-- ── 6. Os vereditos de qualidade da captura ─────────────────────────────────
--
-- Guarda-se o veredito, nunca o histograma nem recorte de imagem: o especialista
-- precisa saber se pondera o número, não reprocessar a foto — que, aliás, não
-- existe mais.
--
-- Luz não trava a captura, marca o scan. O precedente é `framing_level_sensor`,
-- que desde a `0027` significa "este sinal não conta para este scan".
ALTER TABLE body_scans
  ADD COLUMN quality_backlit   boolean,
  ADD COLUMN quality_low_light boolean,
  ADD COLUMN quality_blown_out boolean;

-- O portão confirmou o enquadramento antes do disparo, ou o aluno usou a saída
-- manual depois de 45s preso. Sem isto, um scan feito num cômodo impossível
-- entra na série parecendo igual aos outros.
ALTER TABLE body_scans
  ADD COLUMN framing_confirmed boolean;

COMMENT ON COLUMN body_scans.framing_confirmed IS
  'false quando o aluno usou a saída manual do portão — o enquadramento não foi confirmado.';

-- ── 7. `body_scans_own` deixa de ser FOR ALL ─────────────────────────────────
--
-- Hoje o aluno pode dar UPDATE na própria análise. Era tolerável enquanto os
-- números eram estimativa do modelo; com eles virando medida, adulterar passa a
-- ter consequência e a tabela deixa de permitir.
--
-- O DELETE fica: o direito de exclusão por item (Art. 18, VI) depende dele, e
-- apagar uma medida errada é o remédio certo — corrigi-la seria inventar outra.
--
-- Mesma correção que a `0036` fez em `workout_sessions`, onde a doc dizia que o
-- histórico era imutável e o banco discordava.
DROP POLICY IF EXISTS "body_scans_own" ON body_scans;

CREATE POLICY "body_scans_own_insert" ON body_scans
  FOR INSERT WITH CHECK (student_id = (SELECT auth.uid()));

CREATE POLICY "body_scans_own_select" ON body_scans
  FOR SELECT USING (student_id = (SELECT auth.uid()));

CREATE POLICY "body_scans_own_delete" ON body_scans
  FOR DELETE USING (student_id = (SELECT auth.uid()));
