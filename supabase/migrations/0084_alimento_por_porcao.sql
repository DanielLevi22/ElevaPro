-- As calorias e os macros do alimento passam a estar por porção nas 72 linhas
-- do catálogo público que estavam por 100 g.
--
-- O app inteiro lê `foods` por porção: a quantidade dividida por `serving_size`
-- (o diário, a troca equivalente, as buscas, o item estimado do scan e o plano
-- do onboarding). O seed, seguindo o rótulo do formulário do admin ("por
-- 100g"), gravou os valores de 100 g em toda linha, inclusive nas 72 com
-- porção menor ou maior. O azeite ficou "10 g com 884 kcal e 100 g de
-- gordura": 10 g de azeite no diário contavam 884 kcal, dez vezes o real.
-- Achado no teste de ponta a ponta do onboarding do Praticante (#365).
--
-- Cada linha é casada pelo nome, pela porção e pelo valor antigo: rodar de novo
-- não converte duas vezes, e linha já corrigida à mão não é tocada. O diário
-- calcula na leitura, então o histórico de quem registrou estes alimentos passa
-- a mostrar o número certo sem reescrever registro nenhum.

UPDATE public.foods AS f
   SET calories = round(f.calories * f.serving_size / 100, 2),
       protein  = round(f.protein  * f.serving_size / 100, 2),
       carbs    = round(f.carbs    * f.serving_size / 100, 2),
       fat      = round(f.fat      * f.serving_size / 100, 2),
       fiber    = round(f.fiber    * f.serving_size / 100, 2)
  FROM (VALUES
  ('Água de coco', 200.00, 22.00),
  ('Albumina (pó)', 30.00, 375.00),
  ('Alho', 10.00, 113.00),
  ('Amêndoas', 30.00, 579.00),
  ('Amendoim', 30.00, 544.00),
  ('Atum em água (lata)', 130.00, 109.00),
  ('Aveia em flocos', 30.00, 394.00),
  ('Avelã', 30.00, 628.00),
  ('Azeite de oliva', 10.00, 884.00),
  ('Azeitona verde', 30.00, 145.00),
  ('Banana passa', 30.00, 318.00),
  ('Barra de proteína', 50.00, 350.00),
  ('Bebida de amêndoas sem açúcar', 200.00, 15.00),
  ('Bebida de soja sem açúcar', 200.00, 41.00),
  ('Biscoito de arroz', 20.00, 387.00),
  ('Café sem açúcar', 200.00, 2.00),
  ('Caseína (pó)', 30.00, 360.00),
  ('Castanha de caju', 30.00, 570.00),
  ('Castanha do Pará', 30.00, 643.00),
  ('Chá verde sem açúcar', 200.00, 1.00),
  ('Chia', 15.00, 486.00),
  ('Clara de ovo', 30.00, 48.00),
  ('Coco fresco', 30.00, 354.00),
  ('Colágeno hidrolisado (pó)', 10.00, 360.00),
  ('Creatina monoidratada', 5.00, 0.00),
  ('Damasco seco', 30.00, 241.00),
  ('Dextrose', 30.00, 380.00),
  ('Farinha de aveia', 30.00, 394.00),
  ('Gergelim', 15.00, 573.00),
  ('Granola sem açúcar', 40.00, 425.00),
  ('Homus', 50.00, 166.00),
  ('Iogurte grego natural', 130.00, 97.00),
  ('Iogurte grego zero', 130.00, 59.00),
  ('Iogurte natural desnatado', 170.00, 41.00),
  ('Iogurte natural integral', 170.00, 70.00),
  ('Isotônico', 500.00, 26.00),
  ('Kefir de leite', 200.00, 55.00),
  ('Leite desnatado', 200.00, 35.00),
  ('Leite integral', 200.00, 61.00),
  ('Leite sem lactose desnatado', 200.00, 35.00),
  ('Linhaça', 15.00, 495.00),
  ('Maltodextrina', 30.00, 380.00),
  ('Manteiga', 10.00, 717.00),
  ('Manteiga ghee', 10.00, 876.00),
  ('Nozes', 30.00, 654.00),
  ('Óleo de canola', 10.00, 884.00),
  ('Óleo de coco', 10.00, 862.00),
  ('Ovo de codorna cozido', 50.00, 158.00),
  ('Ovo inteiro cozido', 50.00, 146.00),
  ('Pão de forma integral', 50.00, 253.00),
  ('Pão de queijo', 40.00, 363.00),
  ('Pão francês', 50.00, 300.00),
  ('Pão integral', 50.00, 253.00),
  ('Pão sírio integral', 60.00, 275.00),
  ('Pasta de amendoim', 20.00, 588.00),
  ('Proteína de soja texturizada', 50.00, 336.00),
  ('Proteína vegetal (pó)', 30.00, 375.00),
  ('Queijo minas frescal', 50.00, 264.00),
  ('Queijo muçarela', 30.00, 330.00),
  ('Queijo parmesão', 20.00, 453.00),
  ('Requeijão light', 30.00, 175.00),
  ('Ricota', 50.00, 140.00),
  ('Semente de abóbora', 20.00, 559.00),
  ('Semente de girassol', 20.00, 584.00),
  ('Suco de laranja natural', 200.00, 45.00),
  ('Suco de uva integral', 200.00, 60.00),
  ('Tâmara', 30.00, 282.00),
  ('Tapioca (goma)', 50.00, 350.00),
  ('Torrada integral', 30.00, 371.00),
  ('Uva passa', 30.00, 299.00),
  ('Whey isolado (pó)', 30.00, 370.00),
  ('Whey protein (pó)', 30.00, 380.00)

  ) AS antigo(name, serving_size, calories)
 WHERE f.is_custom = false
   AND f.name = antigo.name
   AND f.serving_size = antigo.serving_size
   AND f.calories = antigo.calories;
--> statement-breakpoint

-- A trava que teria barrado o defeito: por porção, nenhum alimento passa de
-- 9 kcal por grama (a gordura pura tem 9), e proteína, carboidrato e gordura
-- não somam mais que o peso da porção. "10 g com 884 kcal" é recusado na hora.
--
-- NOT VALID de propósito: vale para toda linha nova ou alterada, sem derrubar o
-- deploy por um alimento personalizado antigo que alguém tenha gravado errado
-- em produção. Validar o acervo é um passo à parte, depois de conferir.
ALTER TABLE public.foods
  ADD CONSTRAINT foods_values_per_serving_plausible CHECK (
    (calories IS NULL OR calories <= serving_size * 9.1)
    AND coalesce(protein, 0) + coalesce(carbs, 0) + coalesce(fat, 0) <= serving_size
  ) NOT VALID;
