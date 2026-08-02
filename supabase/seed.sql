-- Seed idempotente: re-executavel em qualquer ambiente.
-- O guard 'where not exists' existe porque este arquivo roda no pipeline
-- (preview e producao) e um insert simples duplicaria a cada deploy.

-- Seed: alimentos básicos
-- Macros por 100g. serving_size em gramas.
-- Fonte de referência: TACO (Tabela Brasileira de Composição de Alimentos)

insert into foods (name, calories, protein, carbs, fat, fiber, serving_size)
select v.name, v.calories, v.protein, v.carbs, v.fat, v.fiber, v.serving_size
from (values
-- Proteínas animais
('Frango (peito grelhado)',    159, 32.0, 0.0,  2.7,  0.0,  100),
('Carne bovina (patinho)',     219, 28.0, 0.0,  11.6, 0.0,  100),
('Ovo inteiro cozido',        146, 13.0, 0.6,  9.9,  0.0,  50),
('Clara de ovo',              48,  11.1, 0.7,  0.2,  0.0,  30),
('Atum em água (lata)',       109, 24.4, 0.0,  0.9,  0.0,  130),
('Salmão grelhado',           208, 28.0, 0.0,  10.0, 0.0,  100),
('Tilápia grelhada',          128, 26.0, 0.0,  2.7,  0.0,  100),
('Whey protein (pó)',         380, 75.0, 7.0,  5.0,  0.0,  30),

-- Proteínas vegetais / laticínios
('Cottage',                   98,  11.1, 3.4,  4.3,  0.0,  100),
('Iogurte grego natural',     97,  9.0,  3.6,  5.0,  0.0,  170),
('Queijo minas frescal',      264, 17.4, 3.0,  20.2, 0.0,  30),
('Leite desnatado',           35,  3.4,  4.9,  0.2,  0.0,  240),

-- Carboidratos
('Arroz branco cozido',       128, 2.5,  28.1, 0.2,  0.3,  150),
('Arroz integral cozido',     124, 2.6,  25.8, 1.0,  1.8,  150),
('Batata doce cozida',        77,  1.4,  17.6, 0.1,  2.2,  130),
('Macarrão integral cozido',  124, 5.3,  25.0, 0.9,  3.9,  140),
('Pão integral',              253, 8.1,  48.0, 3.1,  6.9,  30),
('Aveia em flocos',           394, 13.9, 67.0, 8.5,  9.1,  40),
('Mandioca cozida',           125, 0.6,  30.1, 0.3,  1.9,  100),
('Quinoa cozida',             120, 4.4,  21.3, 1.9,  2.8,  185),

-- Gorduras boas
('Azeite de oliva',           884, 0.0,  0.0,  100.0, 0.0, 10),
('Abacate',                   160, 2.0,  8.5,  14.7, 6.7,  100),
('Amendoim torrado',          581, 27.7, 19.8, 47.5, 6.5,  30),
('Pasta de amendoim',         589, 25.1, 19.6, 49.9, 6.0,  30),
('Castanha do Pará',          643, 14.3, 12.3, 63.5, 7.9,  30),

-- Vegetais
('Brócolis cozido',           35,  2.4,  7.2,  0.4,  2.6,  80),
('Espinafre cru',             23,  2.9,  3.6,  0.4,  2.2,  30),
('Tomate',                    15,  0.8,  2.9,  0.3,  1.2,  120),
('Alface',                    11,  1.3,  1.0,  0.2,  1.8,  50),
('Cenoura crua',              34,  0.9,  7.3,  0.2,  2.8,  80),
('Pepino',                    13,  0.7,  2.4,  0.1,  0.7,  100),
('Chuchu cozido',             20,  0.9,  4.5,  0.1,  1.5,  100),
('Couve refogada',            41,  3.1,  5.1,  1.5,  2.9,  60),

-- Frutas
('Banana',                    98,  1.3,  26.0, 0.1,  2.0,  100),
('Maçã',                      52,  0.3,  13.8, 0.2,  2.4,  130),
('Laranja',                   37,  0.9,  8.9,  0.1,  1.8,  130),
('Mamão papaia',              45,  0.6,  11.8, 0.1,  1.8,  150),
('Morango',                   32,  0.7,  7.7,  0.3,  2.0,  100),
('Uva',                       69,  0.6,  18.1, 0.2,  0.9,  100),

-- Leguminosas
('Feijão carioca cozido',     76,  4.8,  13.6, 0.5,  8.4,  100),
('Feijão preto cozido',       77,  5.1,  14.0, 0.5,  8.7,  100),
('Lentilha cozida',           116, 9.0,  20.1, 0.4,  7.9,  100),
('Grão de bico cozido',       164, 8.9,  27.4, 2.6,  7.6,  100),
('Edamame',                   122, 11.9, 8.9,  5.2,  5.2,  100)
) as v(name, calories, protein, carbs, fat, fiber, serving_size)
where not exists (select 1 from foods t where t.name = v.name);

-- Seed: exercícios básicos por grupo muscular

insert into exercises (name, muscle_group, is_verified)
select v.name, v.muscle_group, v.is_verified
from (values
-- Peito
('Supino reto com barra',          'peito',   true),
('Supino inclinado com halteres',  'peito',   true),
('Crucifixo com halteres',         'peito',   true),
('Flexão de braço',                'peito',   true),
('Crossover no cabo',              'peito',   true),
('Supino declinado',               'peito',   true),

-- Costas
('Puxada frontal',                 'costas',  true),
('Remada curvada com barra',       'costas',  true),
('Remada unilateral com halter',   'costas',  true),
('Levantamento terra',             'costas',  true),
('Pull-up (barra fixa)',           'costas',  true),
('Remada no cabo sentado',         'costas',  true),
('Pullover com halter',            'costas',  true),

-- Ombros
('Desenvolvimento com barra',      'ombro',   true),
('Elevação lateral com halteres',  'ombro',   true),
('Elevação frontal',               'ombro',   true),
('Desenvolvimento Arnold',         'ombro',   true),
('Encolhimento de ombros',         'ombro',   true),
('Face pull no cabo',              'ombro',   true),

-- Bíceps
('Rosca direta com barra',         'biceps',  true),
('Rosca alternada com halteres',   'biceps',  true),
('Rosca martelo',                  'biceps',  true),
('Rosca concentrada',              'biceps',  true),
('Rosca no cabo',                  'biceps',  true),

-- Tríceps
('Tríceps testa com barra W',      'triceps', true),
('Tríceps pulley corda',           'triceps', true),
('Tríceps coice com halter',       'triceps', true),
('Mergulho entre bancos',          'triceps', true),
('Tríceps francês',                'triceps', true),

-- Pernas
('Agachamento livre',              'pernas',  true),
('Leg press 45°',                  'pernas',  true),
('Cadeira extensora',              'pernas',  true),
('Mesa flexora',                   'pernas',  true),
('Agachamento búlgaro',            'pernas',  true),
('Afundo com halteres',            'pernas',  true),
('Stiff com barra',                'pernas',  true),
('Cadeira abdutora',               'pernas',  true),
('Cadeira adutora',                'pernas',  true),
('Panturrilha em pé',              'pernas',  true),
('Panturrilha sentado',            'pernas',  true),
('Hack squat',                     'pernas',  true),

-- Glúteos
('Hip thrust com barra',           'gluteos', true),
('Elevação pélvica',               'gluteos', true),
('Glúteo no cabo',                 'gluteos', true),
('Agachamento sumô',               'gluteos', true),

-- Abdômen
('Abdominal crunch',               'abdomen', true),
('Prancha',                        'abdomen', true),
('Elevação de pernas',             'abdomen', true),
('Abdominal bicicleta',            'abdomen', true),
('Crunch no cabo',                 'abdomen', true),
('Abdominal oblíquo',              'abdomen', true),

-- Cardio / Funcional
('Esteira',                        'cardio',  true),
('Bike ergométrica',               'cardio',  true),
('Elíptico',                       'cardio',  true),
('Corda naval',                    'cardio',  true),
('Burpee',                         'cardio',  true),
('Polichinelo',                    'cardio',  true)
) as v(name, muscle_group, is_verified)
where not exists (select 1 from exercises t where t.name = v.name);
