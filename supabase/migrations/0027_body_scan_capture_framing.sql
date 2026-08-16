-- Guarda como a foto foi enquadrada, junto com o escaneamento.
--
-- A `ADR-010` decidiu que o valor da análise está na comparação entre dois
-- escaneamentos, não no valor absoluto: o erro sistemático da estimativa se
-- repete nos dois e se cancela na diferença. Isso só vale se o enquadramento
-- for o mesmo — corpo à mesma distância, aparelho na mesma inclinação.
--
-- Sem registrar os parâmetros, não há como o próximo escaneamento reproduzir o
-- anterior, e a comparação vira ruído sem ninguém perceber. Guardar aqui é o
-- que permite dizer, depois, se dois escaneamentos são comparáveis ou não.
--
-- Nulável de propósito: escaneamentos feitos antes desta migration não têm
-- esses dados, e inventar um valor padrão faria uma captura desconhecida
-- parecer verificada.

ALTER TABLE body_scans
  -- Fração da altura da tela onde ficavam as marcas de cabeça e pés.
  ADD COLUMN IF NOT EXISTS framing_mark_top   numeric(4, 3),
  ADD COLUMN IF NOT EXISTS framing_mark_bottom numeric(4, 3),
  -- Inclinação do aparelho no disparo, em graus.
  ADD COLUMN IF NOT EXISTS framing_pitch      numeric(5, 2),
  ADD COLUMN IF NOT EXISTS framing_roll       numeric(5, 2),
  -- Falso quando o aparelho não tem sensor de movimento: aí pitch e roll são
  -- zero por ausência, não por estar nivelado. Sem esta coluna, os dois casos
  -- ficariam idênticos no banco.
  ADD COLUMN IF NOT EXISTS framing_level_sensor boolean;

COMMENT ON COLUMN body_scans.framing_level_sensor IS
  'Se o aparelho tinha sensor de nível. Falso torna pitch/roll não confiáveis.';
