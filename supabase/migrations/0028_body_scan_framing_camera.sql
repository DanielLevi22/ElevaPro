-- Registra qual lente tirou a foto.
--
-- A frontal e a traseira têm distância focal diferente. O guia de captura
-- garante que o corpo ocupe a mesma fração do quadro, mas isso só significa
-- "mesma distância" dentro da mesma lente — entre lentes diferentes, a mesma
-- fração corresponde a distâncias distintas.
--
-- Sem esta coluna, comparar um escaneamento feito na traseira com outro na
-- frontal introduziria um erro de escala que ninguém conseguiria explicar
-- depois, porque nada no banco diria que as duas capturas não são comparáveis.
--
-- A frontal passou a existir na captura junto com o temporizador: sem ele, o
-- aluno via a si mesmo e continuava sem alcançar o botão a metros de distância.
--
-- Nulável: capturas anteriores a esta migration não têm o dado, e assumir
-- 'back' faria uma origem desconhecida parecer confirmada.

ALTER TABLE body_scans
  ADD COLUMN IF NOT EXISTS framing_camera text;

ALTER TABLE body_scans
  DROP CONSTRAINT IF EXISTS body_scans_framing_camera_check;

ALTER TABLE body_scans
  ADD CONSTRAINT body_scans_framing_camera_check
  CHECK (framing_camera IS NULL OR framing_camera IN ('front', 'back'));

COMMENT ON COLUMN body_scans.framing_camera IS
  'Lente usada. Escaneamentos de lentes diferentes não são diretamente comparáveis.';
