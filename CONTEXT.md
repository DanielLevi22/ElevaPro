# Eleva Pro

SaaS de acompanhamento de treino e nutrição para personal trainers e para alunos
autônomos. Um especialista monta periodização, treino e plano alimentar; o aluno
registra o que executou e o que comeu; a IA lê esse histórico para orientar os dois.

Este arquivo é a linguagem ubíqua do projeto. Quando houver dúvida sobre como nomear
algo — no código, na UI ou na documentação — ele decide. Aqui fica só o significado:
a tabela de cada conceito está em `shared/src/database/schema/*.ts`, e o porquê de
cada schema ser assim está em [`docs/schema/`](docs/schema/).

## Language

### Pessoas

**Specialist**:
Profissional que prescreve e acompanha o treino e a dieta de um student. É quem paga
a assinatura no modelo B2B.
_Avoid_: personal, trainer, coach, professional

**Student**:
Aluno que treina sob a orientação de um specialist. Não gerencia os próprios planos e
não paga — o specialist paga por ele.
_Avoid_: cliente, paciente, user, managed student

**Member**:
Aluno independente, sem specialist. Gerencia os próprios planos e paga a própria
assinatura no modelo B2C.
_Avoid_: aluno autônomo, autonomous student

**Admin**:
Operador da plataforma, com acesso administrativo que atravessa contas.
_Avoid_: root, superuser

> A fonte da verdade dos quatro é o enum `account_type` em
> [`shared/src/types/auth.types.ts`](shared/src/types/auth.types.ts) — divergência
> aqui é bug de documentação.

### Nutrição

**DietPlan**:
Plano nutricional completo atribuído a um aluno, composto de DietMeals.

**Plano único**:
DietPlan cujo cardápio é o mesmo todos os dias.
_Avoid_: plano fixo, plano diário

**Plano cíclico**:
DietPlan cujo cardápio varia conforme o dia da semana.
_Avoid_: plano rotativo, plano semanal

**DietMeal**:
Uma refeição dentro de um DietPlan, com horário e ordem.
_Avoid_: meal, cardápio

**DietMealItem**:
Um alimento específico dentro de uma DietMeal, com quantidade e unidade.

**Food**:
Item do banco de alimentos, com informação nutricional por porção de referência.
_Avoid_: alimento genérico, ingrediente

**Porção de referência**:
Quantidade base de um Food sobre a qual os macros são declarados (ex.: 100 g). Macro
de um DietMealItem é sempre proporcional a ela.
_Avoid_: porção padrão, serving

**MealLog**:
Registro de que o aluno de fato consumiu uma DietMeal numa data.
_Avoid_: check-in de refeição, consumo

### Treino

**Periodization**:
Estrutura macro do planejamento de treino de um aluno, composta de Phases.
_Avoid_: macrociclo, programa

**Phase**:
Bloco de tempo dentro de uma Periodization com um objetivo próprio (ex.: hipertrofia,
força). Contém Workouts.
_Avoid_: mesociclo, etapa, bloco

**Workout**:
Sessão de treino modelo dentro de uma Phase, composta de WorkoutItems. É o que foi
prescrito, não o que foi feito.
_Avoid_: ficha, rotina

**WorkoutItem**:
Um exercício dentro de um Workout, com séries, repetições e carga prescritas.

**Exercise**:
Item do banco de exercícios, com nome, grupo muscular e instrução de execução.

**WorkoutSession**:
Execução real de um Workout por um aluno numa data. É o que foi feito, em oposição ao
Workout, que é o que foi prescrito.
_Avoid_: treino realizado, sessão de treino

**WorkoutSessionItem**:
Um exercício dentro de uma WorkoutSession, com a carga e as repetições reais.

### Avaliação

**Assessment**:
Avaliação física de um aluno numa data: peso, medidas e composição corporal.
_Avoid_: medição, anamnese

**Body scan**:
Estimativa de composição corporal a partir de foto, sempre calibrada pela altura
declarada do aluno. O valor está na diferença entre dois scans, não no número
absoluto de um só. A imagem nunca é guardada — só o resultado derivado.
_Avoid_: análise de foto, scan corporal
