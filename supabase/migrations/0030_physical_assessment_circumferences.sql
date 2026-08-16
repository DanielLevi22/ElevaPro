-- Completa as circunferências de `physical_assessments`.
--
-- O formulário do web coleta 14 circunferências e a tela do mobile exibe 13.
-- O banco tinha 7. Sete medidas que as duas plataformas pedem não tinham onde
-- ser gravadas: pescoço, ombro, abdômen, antebraço e panturrilha.
--
-- Não é campo novo de produto — é reconciliar o banco com o que já foi
-- desenhado em três telas. O que faltava era decidir a lateralidade, e a
-- decisão foi: bilateral onde a assimetria importa, que é exatamente o que a
-- análise por imagem já reporta. Não faz sentido a IA dizer "ombro direito mais
-- elevado" e a fita métrica registrar um número só.
--
-- Cada uma tem uso concreto:
--   pescoço     entra na fórmula Navy de % de gordura (pescoço + cintura + quadril)
--   ombro       razão ombro/cintura — o próprio prompt da análise já a reporta
--   abdômen     ponto diferente da cintura: cintura é a parte mais estreita,
--               abdômen é na altura do umbigo. As duas são padrão em protocolo
--   antebraço   segmentos que menos respondem a treino, então servem de
--   panturrilha referência para saber se o ganho foi muscular ou geral
--
-- **Fora, de propósito:** braço contraído e coxa proximal/distal. Só o
-- formulário do web pedia, nenhuma tela exibia, e dobrar pontos de coleta que
-- ninguém lê alonga a avaliação sem entregar nada — Necessidade (Art. 6°, III).

ALTER TABLE physical_assessments
  ADD COLUMN IF NOT EXISTS circ_neck          numeric(5, 2),
  ADD COLUMN IF NOT EXISTS circ_shoulder      numeric(5, 2),
  ADD COLUMN IF NOT EXISTS circ_abdomen       numeric(5, 2),
  ADD COLUMN IF NOT EXISTS circ_right_forearm numeric(5, 2),
  ADD COLUMN IF NOT EXISTS circ_left_forearm  numeric(5, 2),
  ADD COLUMN IF NOT EXISTS circ_right_calf    numeric(5, 2),
  ADD COLUMN IF NOT EXISTS circ_left_calf     numeric(5, 2);

COMMENT ON COLUMN physical_assessments.circ_abdomen IS
  'Na altura do umbigo. Diferente de circ_waist, que é a parte mais estreita.';
