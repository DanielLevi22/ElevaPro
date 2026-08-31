-- Sai `body_scans.craniovertebral_angle_deg`.
--
-- ── Por que a coluna sai, e não muda de nome ─────────────────────────────────
--
-- O ângulo craniovertebral tem definição clínica própria: é medido entre a
-- horizontal e a reta que liga C7 ao trago, e fica tipicamente entre 45° e 55°.
-- O que a `0038` gravava era outra coisa — a inclinação da reta orelha-ombro
-- contra a vertical, com dois pontos que não são C7 nem o trago.
--
-- É medida geométrica legítima, mas o nome afirmava um índice que ela não é. E
-- o valor ia para o prompt rotulado como "ângulo craviovertebral", onde o
-- modelo o interpreta contra a faixa de referência clínica — comparando um
-- número com uma régua que não é a dele.
--
-- Renomear resolveria a mentira e deixaria o dado. Não foi o caminho escolhido:
-- ninguém sabe o que fazer com "inclinação da cabeça contra a vertical" sem
-- faixa de referência, e coluna sem leitor é dívida que alguém vai tentar
-- interpretar depois. O aparelho volta a medir isso quando houver a definição
-- certa e alguém para usá-la.
--
-- A anteriorização de cabeça não fica sem cobertura: `plumb_shoulder_cm` mede
-- o quanto o ombro está à frente do prumo do tornozelo, sem afirmar índice
-- nenhum.
--
-- Um scan tem valor gravado, e ele é o próprio motivo de a coluna sair: 166.6°,
-- que é `180 − 13.4` — o defeito de wrap corrigido na mesma entrega. Não há o
-- que preservar.

ALTER TABLE body_scans
  DROP COLUMN craniovertebral_angle_deg;
