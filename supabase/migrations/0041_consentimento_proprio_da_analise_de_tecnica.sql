-- Análise de Técnica ganha consentimento próprio, em vez de entrar no do body scan.
--
-- A #194 propunha reusar `health_data_collection` e subir a `POLICY_VERSION`
-- para 1.3, aceitando como efeito colateral que toda a base reconsentisse. Esta
-- migration diverge disso, e o motivo é o mesmo artigo que a issue cita:
--
--   Art. 8°, §4° — "O consentimento deverá referir-se a finalidades
--   determinadas, e as autorizações genéricas para o tratamento de dados
--   pessoais serão nulas."
--
-- Empacotadas num consentimento só, as duas finalidades ficam presas uma na
-- outra: quem recusar a câmera contínua durante o exercício perde junto a
-- avaliação física, a anamnese e o acompanhamento de passos — que não têm nada
-- a ver com isso. Consentimento cuja recusa custa funcionalidade alheia não é
-- livre (Art. 8°, caput), e é a liberdade que sustenta a base do Art. 11, I.
--
-- São finalidades genuinamente distintas, e a diferença é visível para o
-- titular: o body scan são fotos que o aluno tira num momento que ele escolhe;
-- a Análise de Técnica é a câmera aberta e lendo o corpo durante a série
-- inteira. É razoável querer uma e não querer a outra.
--
-- Efeito de separar: a `POLICY_VERSION` do body scan **não sobe**, o texto da
-- 1.2 continua exato para o que ele descreve, e ninguém é obrigado a
-- reconsentir o que já consentiu. Reconsentimento pedido à toa é o que ensina a
-- aceitar sem ler.
--
-- Nada é persistido pela feature em si: os landmarks sobem do nativo para o JS
-- e morrem no quadro seguinte. O que esta migration cria é só o registro de que
-- o titular autorizou o processamento — que é o que o Art. 5°, X exige, porque
-- não armazenar não é não tratar.

-- `ADD VALUE` roda dentro da transação da migration no PG 12+, mas o valor novo
-- não pode ser USADO nela. Por isso aqui só se acrescenta: quem grava é o app,
-- depois, com o enum já comitado.
ALTER TYPE public.consent_type ADD VALUE IF NOT EXISTS 'technique_analysis';

COMMENT ON TYPE public.consent_type IS
  'Uma finalidade por valor. Art. 8°, §4°: autorização genérica é nula, então finalidade nova entra como valor novo — nunca como texto novo dentro de um consentimento que já existe.';
