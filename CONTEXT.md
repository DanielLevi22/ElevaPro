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

### Assistente

**Assistente**:
A IA que conversa com o specialist para montar periodização, treinos e plano alimentar,
e com o student para acompanhá-lo. Uma coisa só, com duas superfícies.
_Avoid_: AI Coach, Coach IA, coach, bot, IA

> "Coach" já é o que o **specialist** é para o student — usar a mesma palavra para a
> máquina apaga a distinção justamente onde ela importa, que é quem responde pela
> prescrição. E "AI"/"IA" no nome descreve a tecnologia, não o que ela faz.
>
> Em rota e em símbolo de código o termo antigo permanece: `/dashboard/student/coach`,
> o segmento `ai-coach`, `AiCoachChat`, o módulo `ai`. É endereço, não nome — trocar
> rota quebra link salvo, e trocar símbolo espalha diff sem ninguém ver diferença.

**Proposta**:
O que o assistente apresenta ao specialist para aprovação — de periodização, de treinos,
de plano alimentar. Fica guardada no servidor até ser aprovada ou substituída; o cartão
na tela é uma vista dela, nunca a fonte.
_Avoid_: sugestão, rascunho, preview

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

**Sugestão do assistente**:
O que o assistente de nutrição oferece **ao aluno** — uma refeição que cabe no que falta
do dia, ou os itens de uma resposta da conversa. Não passa por aprovação e não é guardada
no servidor: aceita, vira item extra do MealLog com a origem `assistente`. Não confundir
com a Proposta, que vai ao specialist e espera aprovação.
_Avoid_: recomendação, dica, proposta

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
Medida pelo especialista, com fita.
_Avoid_: medição

**Anamnese**:
Questionário respondido pelo próprio aluno sobre histórico, rotina e objetivo.
É declaração, não medição.
_Avoid_: avaliação, questionário

**Body scan**:
Estimativa de composição corporal a partir de foto, sempre calibrada por uma
Escala. O valor está na diferença entre dois scans, não no número absoluto de um
só. A imagem nunca é guardada — só o resultado derivado.
_Avoid_: análise de foto, scan corporal

**Escala**:
A altura e o peso que calibram um Body scan — sem eles a estimativa seria chute.
Vem da Assessment quando existe; da Anamnese quando não. O scan registra qual
das duas usou.
_Avoid_: régua, referência, calibração

**Enquadramento**:
As marcas na tela que fixam a posição do aluno na foto, para que dois scans sejam
comparáveis.
_Avoid_: silhueta, guia, moldura

**Análise de Técnica**:
Leitura da execução de um exercício ao longo do tempo, quadro a quadro, que conta
Repetições e emite um Veredito para cada uma. Diferente do Body scan em duas
coisas: olha movimento e não forma, e nada dela é guardado. Não usar "Execução",
que já é a WorkoutSession.
_Avoid_: execução, correção de exercício, análise de movimento

**Repetição**:
Um ciclo completo do movimento, do início ao retorno à posição de partida. É a
unidade que a Análise de Técnica conta e sobre a qual o Veredito é emitido.
_Avoid_: rep, ciclo

**Veredito**:
O julgamento de uma única Repetição contra um Critério — no agachamento, "fundo"
ou "faltou". Sai do ponto mais extremo da Repetição, não do instante em que ela
termina.
_Avoid_: nota, resultado, avaliação

**Critério**:
A regra geométrica que decide o Veredito de um exercício, com o limiar que a
separa. No agachamento: o quadril passar da linha do joelho. Cada exercício tem o
seu, e cada um precisa do próprio limiar calibrado.
_Avoid_: regra, métrica, parâmetro
