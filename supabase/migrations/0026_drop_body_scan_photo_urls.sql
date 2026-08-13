-- Apaga as quatro colunas de URL de foto de `body_scans`.
--
-- A `ADR-010` decidiu que a análise corporal guarda o resultado derivado e
-- **nunca a imagem**: é a maior minimização possível para um dado biométrico,
-- e é o que o parecer de LGPD do PRD `body-scan-integrity` registrou. As
-- colunas nasceram antes dessa decisão e ficariam nulas para sempre.
--
-- Coluna que nunca deve ser preenchida não é neutra, é convite: enquanto ela
-- existir, alguém escreve nela sem saber que há uma decisão contrária, e aí
-- passamos a ter foto de corpo persistida sem bucket com política própria.
-- Foi o mesmo raciocínio da 0023 com `sets_data` — deprecar não bastou, duas
-- telas continuaram gravando no caminho antigo enquanto ele compilava.
--
-- Duas delas ainda carregam o nome das laterais que a captura não usa mais:
-- desde 2026-08-12 são três fotos (frente, costas e uma lateral), porque as
-- duas laterais davam a mesma informação e dobravam o incômodo de se
-- fotografar — que é onde o aluno desiste.
--
-- Confirmado antes de rodar: `body_scans` está vazia e as quatro colunas não
-- têm um único valor. Não há produção — o projeto está em construção.
--
-- Se um dia guardar a imagem voltar a ser necessário, o caminho não é
-- ressuscitar estas colunas: é bucket privado com política própria, retenção
-- declarada na seção 7 do LGPD_COMPLIANCE e consentimento específico. Ver
-- dívida 24 no STATUS.

ALTER TABLE body_scans
  DROP COLUMN IF EXISTS photo_front_url,
  DROP COLUMN IF EXISTS photo_back_url,
  DROP COLUMN IF EXISTS photo_side_right_url,
  DROP COLUMN IF EXISTS photo_side_left_url;
