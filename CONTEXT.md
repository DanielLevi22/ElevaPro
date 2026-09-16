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
Pessoa que treina na plataforma. Tem sempre uma Guidance, e é ela que decide quem
monta os planos e quem paga. Na interface aparece como "Aluno" ou "Praticante",
conforme a Guidance.
_Avoid_: member, cliente, paciente, user, aluno autônomo

**Guidance**:
Quem orienta o Student neste momento. `specialist` quando há vínculo ativo com um
Specialist: ele prescreve e paga pelo Student ("Aluno"). `self_guided` quando não há:
o Assistente propõe, o próprio Student aprova e paga a própria assinatura
("Praticante"). É estado do vínculo, não escolha de cadastro — contratar ou encerrar
um Specialist troca a Guidance sem trocar de conta. `self_guided` é o modo principal
do produto.
_Avoid_: modo, tipo de aluno, member, B2C/B2B como nome de pessoa

**Admin**:
Operador da plataforma, com acesso administrativo que atravessa contas.
_Avoid_: root, superuser

> O código ainda grava `member` como `account_type`. A troca por Student com Guidance
> `self_guided` está no [ADR-0028](docs/adr/0028-o-praticante-vem-primeiro.md).

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
O que um aluno fez numa data: a execução de um Workout, ou um Cardio livre. É o que
foi feito, em oposição ao Workout, que é o que foi prescrito.
_Avoid_: treino realizado, sessão de treino

**Cardio livre**:
WorkoutSession de cardio que o próprio Student iniciou, sem prescrição por trás. Vale
tanto quanto a prescrita, e é o caso normal com Guidance `self_guided`.
_Avoid_: treino avulso, sessão extra

**WorkoutSessionItem**:
Um exercício dentro de uma WorkoutSession, com a carga e as repetições reais.

**Ranking**:
A competição semanal entre Students, de segunda a domingo no horário de Brasília. O
placar global é de quem entrou (opt-in); o do especialista são os alunos dele.
_Avoid_: leaderboard (na UI), competição, liga

**Pontos**:
O que uma WorkoutSession concluída vale no Ranking: 100, até duas por dia. Só treino
pontua.
_Avoid_: XP, score, pontuação (na UI)

### Avaliação

**Assessment**:
Avaliação física de um aluno numa data: peso, medidas e composição corporal.
Tem duas origens, e uma série nunca mistura as duas (ADR-0030):
- **do especialista** — medida com fita; imutável, o remédio para erro é medir de novo.
- **declarada** — digitada pelo próprio Praticante, que corrige e apaga. Só quem não
  tem especialista ativo declara: com especialista, quem mede é ele.
_Avoid_: medição

**Nota do especialista**:
O que o profissional escreve sobre o progresso do Aluno, numa data. Registro
dele: o Aluno lê no relatório do período, e não escreve nem apaga. O Praticante
não tem nenhuma.
_Avoid_: observação, comentário, feedback

**Anamnese**:
Questionário respondido pelo próprio aluno sobre histórico, rotina e objetivo.
É declaração, não medição.
_Avoid_: avaliação, questionário

**Body scan**:
Estimativa de composição corporal a partir de foto, sempre calibrada por uma
Escala. O valor está na diferença entre dois scans, não no número absoluto de um
só. A imagem nunca é guardada — só o resultado derivado.
_Avoid_: análise de foto, scan corporal

**Relatório do período**:
Os últimos 90 dias do Student num lugar só: treinos, aderência, cardio, medidas,
recordes de carga, sequência e a última Nota do especialista. Não calcula nada
por conta própria — repete o que cada tela já mostra — e pode virar PDF no
aparelho.
_Avoid_: resumo, dashboard, extrato

**Escala**:
A altura e o peso que calibram um Body scan — sem eles a estimativa seria chute.
Vem da Assessment do especialista quando existe; da declarada quando não; da
Anamnese por último. O scan registra qual das três usou.
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
