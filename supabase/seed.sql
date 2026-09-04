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

-- Seed: catálogo de exercícios
--
-- 181 exercícios, classificados em três eixos: `muscle_group` diz onde no
-- corpo, `venue` diz onde dá para executar, `category` diz que trabalho é.
-- As colunas nascem na migration 0042, que roda antes deste arquivo tanto no
-- `db reset` local quanto no workflow (db push, depois este seed).
--
-- Mesmo guard `where not exists` do resto: re-executar não duplica, e uma
-- linha que já existe não é tocada — a classificação das que vieram antes da
-- 0042 é responsabilidade do UPDATE que mora lá.

insert into exercises (name, muscle_group, venue, category, is_verified)
select v.name, v.muscle_group, v.venue, v.category, true
from (values
-- Peito
('Supino reto com barra',                  'peito',   'academia', 'forca'),
('Supino inclinado com halteres',          'peito',   'academia', 'forca'),
('Crucifixo com halteres',                 'peito',   'academia', 'forca'),
('Crossover no cabo',                      'peito',   'academia', 'forca'),
('Supino declinado',                       'peito',   'academia', 'forca'),
('Supino reto com halteres',               'peito',   'academia', 'forca'),
('Supino inclinado com barra',             'peito',   'academia', 'forca'),
('Voador (peck deck)',                     'peito',   'academia', 'forca'),
('Crossover no cabo baixo',                'peito',   'academia', 'forca'),
('Supino na máquina articulada',           'peito',   'academia', 'forca'),
('Flexão de braço',                        'peito',   'ambos',    'forca'),
('Flexão de braço com joelhos apoiados',   'peito',   'casa',     'forca'),
('Flexão de braço inclinada',              'peito',   'casa',     'forca'),
('Flexão de braço declinada',              'peito',   'casa',     'forca'),
('Flexão diamante',                        'peito',   'casa',     'forca'),
('Flexão com elástico',                    'peito',   'casa',     'forca'),
('Crucifixo com elástico em pé',           'peito',   'casa',     'forca'),
('Supino com elástico deitado',            'peito',   'casa',     'forca'),

-- Costas
('Puxada frontal',                         'costas',  'academia', 'forca'),
('Remada curvada com barra',               'costas',  'academia', 'forca'),
('Remada unilateral com halter',           'costas',  'academia', 'forca'),
('Levantamento terra',                     'costas',  'academia', 'forca'),
('Pull-up (barra fixa)',                   'costas',  'academia', 'forca'),
('Remada no cabo sentado',                 'costas',  'academia', 'forca'),
('Pullover com halter',                    'costas',  'academia', 'forca'),
('Puxada supinada',                        'costas',  'academia', 'forca'),
('Puxada com pegada neutra',               'costas',  'academia', 'forca'),
('Remada cavalinho',                       'costas',  'academia', 'forca'),
('Remada na máquina',                      'costas',  'academia', 'forca'),
('Levantamento terra romeno',              'costas',  'academia', 'forca'),
('Pulldown com braços estendidos',         'costas',  'academia', 'forca'),
('Barra fixa com pegada supinada',         'costas',  'academia', 'forca'),
('Remada invertida na barra baixa',        'costas',  'ambos',    'forca'),
('Remada curvada com elástico',            'costas',  'casa',     'forca'),
('Remada sentada com elástico',            'costas',  'casa',     'forca'),
('Puxada alta com elástico',               'costas',  'casa',     'forca'),
('Remada unilateral com mochila',          'costas',  'casa',     'forca'),

-- Ombro
('Desenvolvimento com barra',              'ombro',   'academia', 'forca'),
('Elevação lateral com halteres',          'ombro',   'academia', 'forca'),
('Elevação frontal',                       'ombro',   'academia', 'forca'),
('Desenvolvimento Arnold',                 'ombro',   'academia', 'forca'),
('Encolhimento de ombros',                 'ombro',   'academia', 'forca'),
('Face pull no cabo',                      'ombro',   'academia', 'forca'),
('Desenvolvimento com halteres sentado',   'ombro',   'academia', 'forca'),
('Elevação lateral no cabo',               'ombro',   'academia', 'forca'),
('Remada alta com barra',                  'ombro',   'academia', 'forca'),
('Crucifixo inverso na máquina',           'ombro',   'academia', 'forca'),
('Desenvolvimento na máquina',             'ombro',   'academia', 'forca'),
('Elevação lateral com elástico',          'ombro',   'casa',     'forca'),
('Desenvolvimento com elástico',           'ombro',   'casa',     'forca'),
('Flexão pique (pike push-up)',            'ombro',   'casa',     'forca'),

-- Ombro — manguito rotador e estabilizadores da escápula
('Rotação externa com elástico',           'ombro',   'ambos',    'estabilizacao'),
('Rotação interna com elástico',           'ombro',   'ambos',    'estabilizacao'),
('Rotação externa deitado de lado',        'ombro',   'ambos',    'estabilizacao'),
('Elevação em Y no banco inclinado',       'ombro',   'academia', 'estabilizacao'),
('Elevação no plano escapular',            'ombro',   'ambos',    'estabilizacao'),
('Face pull com elástico',                 'ombro',   'ambos',    'estabilizacao'),
('Punch do serrátil com elástico',         'ombro',   'ambos',    'estabilizacao'),
('Deslizamento do braço na parede',        'ombro',   'casa',     'estabilizacao'),
('Rotação com bastão acima da cabeça',     'ombro',   'ambos',    'mobilidade'),
('Círculos de braço',                      'ombro',   'casa',     'mobilidade'),

-- Bíceps
('Rosca direta com barra',                 'biceps',  'academia', 'forca'),
('Rosca alternada com halteres',           'biceps',  'academia', 'forca'),
('Rosca martelo',                          'biceps',  'academia', 'forca'),
('Rosca concentrada',                      'biceps',  'academia', 'forca'),
('Rosca no cabo',                          'biceps',  'academia', 'forca'),
('Rosca scott no banco',                   'biceps',  'academia', 'forca'),
('Rosca inversa com barra',                'biceps',  'academia', 'forca'),
('Rosca 21',                               'biceps',  'academia', 'forca'),
('Rosca direta com elástico',              'biceps',  'casa',     'forca'),
('Rosca martelo com elástico',             'biceps',  'casa',     'forca'),

-- Tríceps
('Tríceps testa com barra W',              'triceps', 'academia', 'forca'),
('Tríceps pulley corda',                   'triceps', 'academia', 'forca'),
('Tríceps coice com halter',               'triceps', 'academia', 'forca'),
('Mergulho entre bancos',                  'triceps', 'ambos',    'forca'),
('Tríceps francês',                        'triceps', 'academia', 'forca'),
('Tríceps pulley barra reta',              'triceps', 'academia', 'forca'),
('Paralelas',                              'triceps', 'academia', 'forca'),
('Tríceps acima da cabeça com elástico',   'triceps', 'casa',     'forca'),
('Tríceps coice com elástico',             'triceps', 'casa',     'forca'),

-- Pernas
('Agachamento livre',                      'pernas',  'academia', 'forca'),
('Leg press 45°',                          'pernas',  'academia', 'forca'),
('Cadeira extensora',                      'pernas',  'academia', 'forca'),
('Mesa flexora',                           'pernas',  'academia', 'forca'),
('Agachamento búlgaro',                    'pernas',  'ambos',    'forca'),
('Afundo com halteres',                    'pernas',  'academia', 'forca'),
('Stiff com barra',                        'pernas',  'academia', 'forca'),
('Cadeira abdutora',                       'pernas',  'academia', 'forca'),
('Cadeira adutora',                        'pernas',  'academia', 'forca'),
('Panturrilha em pé',                      'pernas',  'academia', 'forca'),
('Panturrilha sentado',                    'pernas',  'academia', 'forca'),
('Hack squat',                             'pernas',  'academia', 'forca'),
('Agachamento frontal',                    'pernas',  'academia', 'forca'),
('Agachamento no Smith',                   'pernas',  'academia', 'forca'),
('Levantamento terra sumô',                'pernas',  'academia', 'forca'),
('Passada com halteres',                   'pernas',  'academia', 'forca'),
('Panturrilha no leg press',               'pernas',  'academia', 'forca'),
('Bom dia com barra',                      'pernas',  'academia', 'forca'),
('Agachamento livre sem peso',             'pernas',  'casa',     'forca'),
('Agachamento com salto',                  'pernas',  'casa',     'forca'),
('Afundo estático sem peso',               'pernas',  'casa',     'forca'),
('Agachamento sumô sem peso',              'pernas',  'casa',     'forca'),
('Cadeira na parede',                      'pernas',  'casa',     'forca'),
('Panturrilha em pé no degrau',            'pernas',  'ambos',    'forca'),
('Stiff unilateral sem peso',              'pernas',  'casa',     'forca'),
('Subida no banco',                        'pernas',  'ambos',    'forca'),
('Agachamento com elástico',               'pernas',  'casa',     'forca'),

-- Glúteos
('Hip thrust com barra',                   'gluteos', 'academia', 'forca'),
('Elevação pélvica',                       'gluteos', 'ambos',    'forca'),
('Glúteo no cabo',                         'gluteos', 'academia', 'forca'),
('Agachamento sumô',                       'gluteos', 'academia', 'forca'),
('Coice de glúteo na máquina',             'gluteos', 'academia', 'forca'),
('Abdução de quadril no cabo',             'gluteos', 'academia', 'forca'),
('Ponte de glúteo no solo',                'gluteos', 'casa',     'forca'),
('Ponte de glúteo unilateral',             'gluteos', 'casa',     'forca'),
('Concha com elástico',                    'gluteos', 'ambos',    'estabilizacao'),
('Abdução deitado de lado',                'gluteos', 'casa',     'estabilizacao'),
('Caminhada lateral com elástico',         'gluteos', 'ambos',    'estabilizacao'),
('Coice de glúteo em quatro apoios',       'gluteos', 'casa',     'estabilizacao'),
('Abdução em quatro apoios',               'gluteos', 'casa',     'estabilizacao'),

-- Abdômen e core
('Abdominal crunch',                       'abdomen', 'ambos',    'forca'),
('Prancha',                                'abdomen', 'ambos',    'estabilizacao'),
('Elevação de pernas',                     'abdomen', 'ambos',    'forca'),
('Abdominal bicicleta',                    'abdomen', 'ambos',    'forca'),
('Crunch no cabo',                         'abdomen', 'academia', 'forca'),
('Abdominal oblíquo',                      'abdomen', 'ambos',    'forca'),
('Prancha lateral',                        'abdomen', 'ambos',    'estabilizacao'),
('Prancha com toque no ombro',             'abdomen', 'ambos',    'estabilizacao'),
('Inseto morto (dead bug)',                'abdomen', 'ambos',    'estabilizacao'),
('Bird dog',                               'abdomen', 'ambos',    'estabilizacao'),
('Pallof press com elástico',              'abdomen', 'ambos',    'estabilizacao'),
('Hollow hold',                            'abdomen', 'ambos',    'estabilizacao'),
('Rollout na roda abdominal',              'abdomen', 'ambos',    'estabilizacao'),
('Prancha com elevação de perna',          'abdomen', 'ambos',    'estabilizacao'),
('Caminhada do fazendeiro',                'abdomen', 'academia', 'estabilizacao'),
('Escalador (mountain climber)',           'abdomen', 'casa',     'forca'),
('Elevação de pernas na barra fixa',       'abdomen', 'academia', 'forca'),
('Rotação russa',                          'abdomen', 'casa',     'forca'),

-- Cardio
('Esteira',                                'cardio',  'academia', 'cardio'),
('Bike ergométrica',                       'cardio',  'academia', 'cardio'),
('Elíptico',                               'cardio',  'academia', 'cardio'),
('Corda naval',                            'cardio',  'academia', 'cardio'),
('Burpee',                                 'cardio',  'ambos',    'cardio'),
('Polichinelo',                            'cardio',  'ambos',    'cardio'),
('Remo ergômetro',                         'cardio',  'academia', 'cardio'),
('Escada ergométrica',                     'cardio',  'academia', 'cardio'),
('Bicicleta de assalto',                   'cardio',  'academia', 'cardio'),
('Pular corda',                            'cardio',  'ambos',    'cardio'),
('Corrida no lugar',                       'cardio',  'casa',     'cardio'),
('Salto do patinador',                     'cardio',  'casa',     'cardio'),

-- Alongamento
('Alongamento de peitoral no batente',     'peito',   'ambos',    'alongamento'),
('Alongamento de dorsal suspenso',         'costas',  'ambos',    'alongamento'),
('Alongamento de lombar joelhos ao peito', 'costas',  'casa',     'alongamento'),
('Postura da criança',                     'costas',  'casa',     'alongamento'),
('Alongamento cervical lateral',           'costas',  'casa',     'alongamento'),
('Alongamento de deltoide cruzado',        'ombro',   'ambos',    'alongamento'),
('Alongamento de tríceps sobre a cabeça',  'triceps', 'ambos',    'alongamento'),
('Alongamento de bíceps na parede',        'biceps',  'ambos',    'alongamento'),
('Alongamento de isquiotibiais sentado',   'pernas',  'casa',     'alongamento'),
('Alongamento de quadríceps em pé',        'pernas',  'ambos',    'alongamento'),
('Alongamento de panturrilha na parede',   'pernas',  'ambos',    'alongamento'),
('Alongamento de adutores borboleta',      'pernas',  'casa',     'alongamento'),
('Alongamento de flexores do quadril',     'pernas',  'casa',     'alongamento'),
('Alongamento de glúteo figura quatro',    'gluteos', 'casa',     'alongamento'),
('Alongamento de piriforme sentado',       'gluteos', 'casa',     'alongamento'),

-- Mobilidade
('Gato e camelo',                          'costas',  'casa',     'mobilidade'),
('Rotação torácica deitado de lado',       'costas',  'casa',     'mobilidade'),
('Extensão torácica no rolo',              'costas',  'ambos',    'mobilidade'),
('Lagarta (inchworm)',                     'costas',  'casa',     'mobilidade'),
('Mobilidade de tornozelo na parede',      'pernas',  'casa',     'mobilidade'),
('Agachamento profundo com apoio',         'pernas',  'casa',     'mobilidade'),
('Círculos de quadril em quatro apoios',   'gluteos', 'casa',     'mobilidade'),
('Transição 90/90 de quadril',             'gluteos', 'casa',     'mobilidade'),

-- Postural
('Retração escapular deitado de bruços',   'costas',  'casa',     'postural'),
('Superman no solo',                       'costas',  'casa',     'postural'),
('Elevação em Y no solo',                  'costas',  'casa',     'postural'),
('Elevação em T no solo',                  'costas',  'casa',     'postural'),
('Elevação em W no solo',                  'costas',  'casa',     'postural'),
('Retração cervical',                      'costas',  'casa',     'postural'),
('Anjo na parede',                         'ombro',   'casa',     'postural'),
('Ponte de glúteo com elástico',           'gluteos', 'casa',     'postural')
) as v(name, muscle_group, venue, category)
where not exists (select 1 from exercises t where t.name = v.name);
