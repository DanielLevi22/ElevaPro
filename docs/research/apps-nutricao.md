# Apps de nutrição para quem faz dieta sem nutricionista: pesquisa de produto

Status: concluído em 03/10/2026; lacunas restantes: 41 marcas de "não confirmado"/"trecho de busca", cerca de 25 lacunas distintas, porque a tabela 9 repete as das seções 2, 4 e 5 (ver seção "Lacunas restantes"). Das 79 marcas da versão de 02/10/2026, 40 foram resolvidas. Apps cobertos: MacroFactor, Carbon, Cal AI, MyFitnessPal, Lose It!, Noom, Yazio, Lifesum, Nutrola, Fitia, Tecnonutri, FatSecret, Dieta e Saúde.

> Pesquisa feita em 02/10/2026 para decisões de produto do Eleva Pro (modo Praticante, ADR-0028). Fontes primárias (site oficial, central de ajuda, blog do próprio app, páginas da App Store, comunicados de imprensa da empresa, legislação) aparecem como **[Fn]**. Fontes secundárias (reviews, imprensa, estudos de caso de UX, teardowns de onboarding) aparecem como **[Sn]** e não sustentam sozinhas um fato central. Onde nenhuma fonte primária confirma, está escrito **não confirmado**. Todas as fontes foram acessadas em 02/10/2026.
>
> Ressalvas de método:
> - Várias centrais de ajuda (MyFitnessPal, Noom, Yazio, Lose It!) devolveram 403 ou bloquearam a leitura automática. Quando um fato veio só do trecho que o buscador mostrou dessas páginas, está marcado como **(trecho de busca)**.
> - Revisão de 03/10/2026: as centrais em Zendesk (MyFitnessPal, Yazio, Lose It!) foram lidas pela API pública de artigos (`/api/v2/help_center/<idioma>/articles/<id>.json`), que devolve o texto integral do artigo mesmo quando a página HTML dá 403. Fatos confirmados assim perderam a marca "(trecho de busca)" e citam a URL pública do artigo. Fontes novas desta revisão foram acessadas em 03/10/2026.
> - Preços da App Store mudam por país, por teste A/B e com o tempo. Os valores em R$ são da App Store Brasil e os valores em US$ são da App Store EUA ou do site, sempre na data de acesso. A App Store mostra uma **faixa** de compras dentro do app, não o plano que cada pessoa vê.
> - Vários "reviews" encontrados (nutrola.app/blog, nutriscan.app/blog, calzy-app.com, bentobunny.app) são de **concorrentes** que escrevem sobre os outros. Foram usados só para pistas e nunca como fonte de fato.
> - Não instalei os apps. A descrição das telas vem de material oficial e de teardowns publicados [S5][S6][S9].

---

## 1. Resumo executivo: os 10 achados mais úteis

1. **"Seu plano está pronto" antes do paywall é o padrão de quem mais fatura.** O Noom faz um quiz de até 113 telas (10 a 15 min) que termina num gráfico de projeção de peso com data ("você terá X kg em 22 de maio") e só então cobra [S6][S7]. O Cal AI faz cerca de 28 passos, mostra o plano e oferece 3 dias de teste que viram plano anual [S5]. O Yazio monta o plano e abre o paywall logo em seguida [S9].
2. **A meta inicial é sempre uma fórmula determinística, e os melhores apps admitem que ela erra.** Agora com fonte primária para quase todos: Yazio usa Mifflin-St Jeor × fator de atividade (1,25 a 1,65) com déficit padrão moderado de 375 kcal/dia [F35]; Noom usa Harris-Benedict e entrega uma **faixa**, não um número [F65]; Carbon usa uma "equação de Müller modificada" com massa magra e põe a proteína pela massa magra [F72]; MyFitnessPal usa o gasto estimado com os níveis de atividade do IOM [F29][F51]; Lose It! usa TMB × PAL em quatro níveis [F57]. O MacroFactor diz que a fórmula "facilmente erra mais de 500 kcal/dia para algumas pessoas" e por isso a recalibra com os dados reais [F3][F4]. Isso valida o desenho do ADR-0020: a conta faz a meta e a IA escolhe os alimentos.
3. **Adaptar sem chat se faz com um check-in semanal de cerca de 1 minuto.** No Carbon são três toques: escolher como foi o registro da semana, informar o peso e revisar. O relatório sai na hora, com o ajuste de calorias e macros [F15]. No MacroFactor, o check-in semanal recalcula as metas a partir do gasto estimado [F2][F6].
4. **"Neutro em relação à aderência" é o diferencial conceitual do MacroFactor.** O gasto é calculado pelo que a pessoa *de fato* comeu e pelo que o peso fez, não pelo quanto ela cumpriu a meta. Assim, uma semana ruim não "quebra" o algoritmo e não gera bronca [F2][F7][F14]. O V3 tolera cerca de 3× mais dias sem registro e só pausa a atualização acima de 3 dias faltando por semana [F1].
5. **O Carbon resolve a aderência baixa com uma pergunta honesta.** As opções são: "registrei tudo", "registrei só algumas refeições" (e aí ele **mantém** a meta), "não registrei, mas cumpri" e "registrei em outro app". Uma semana não conforme faz a avaliação voltar ao método simples de peso inicial × final [F15][F16].
6. **Foto com IA virou item obrigatório, e a forma certa é mapear para um banco de alimentos e deixar editar.** O MacroFactor decompõe o prato em ingredientes reais do banco ("dados analisados em laboratório"), mostra tudo de forma editável e evita "interface de chat" [F11]. O Cal AI declara cerca de 80% de acerto na identificação e usa o sensor de profundidade para estimar volume [F24].
7. **O registro básico está migrando para trás do paywall, e isso custa reputação.** O MyFitnessPal passou o leitor de código de barras para o Premium em 01/10/2022, houve reação forte [S1][S2], e em 2026 ele segue pago, junto com voz e Meal Scan [F27][F52]. O Lose It! está fazendo o mesmo em 2026: a central diz que o leitor de código e o de rótulo "estão passando para o Premium" [F59]. O Yazio lançou a foto com IA de graça e depois a passou para o Pro [F94]. O Lifesum cobra por definir a própria meta de calorias e por criar alimentos e favoritos [F85][F87]. E a IA de registro dos líderes **não funciona em português**: Meal Scan e voz do MyFitnessPal e Snap It, Scan It e Say It do Lose It! exigem o app em inglês [F31][F54][F60]. O que segue grátis no MyFitnessPal é o "adicionar calorias rápido" só de calorias e o copiar ou repetir refeição [F55][F30]. O MacroFactor mede o próprio atrito e publica o resultado: 26 ações no índice de velocidade de registro, contra 32 do 2º colocado, e 4 toques no "adicionar calorias rápido" [F9].
8. **Dark patterns de paywall agora têm custo concreto.** A Apple tirou o Cal AI da App Store em abril de 2026, depois que viralizou uma folha de pagamento com aparência nativa feita sobre Stripe. O app voltou cerca de um dia depois [S3]. O Noom usa um teste com "escolha seu preço" e o argumento de que o teste "nos custa X"; o próprio blog do Noom confirma: o teste de 7 dias "nos custa cerca de US$ 10", com opções como US$ 0,50, 3, 10 ou 18 [F67][S6][S7].
9. **Cardápio pronto é recurso premium, e o mercado brasileiro o vende assim.** O Premium+ do MyFitnessPal (US$ 99,99/ano) traz o Meal Planner com lista de compras [F25][F27], mas só é vendido em EUA, Reino Unido, Canadá, Irlanda, Nova Zelândia e Austrália, **não no Brasil** [F53]. No outro extremo, o Carbon recusa cardápio por princípio ("não ensina hábitos") [F74]. O Fitia cobra pelo "planejamento automático de refeições", com receitas e lista de compras [F46]. O Tecnonutri vende "cardápios criados por nutricionistas" [F44]. O Eleva Pro já tem plano do dia, troca por equivalência e lista de compras com preço, que é exatamente o que esses apps cobram.
10. **A proteção regulatória dos líderes é rasa e desigual. Um app brasileiro precisa ir além.** O MyFitnessPal tem piso de 1.200 kcal (mulheres) e 1.500 kcal (homens) [F29][F51]; no Lose It! o mesmo número é só um **aviso**, que recomenda sem obrigar um ritmo mais lento [F58]; o Noom eleva a TMB calculada a 1.200/1.500 quando ela fica abaixo [F66]. MacroFactor e Carbon têm piso calórico, o do Carbon baseado em massa magra [F4][F18]; o do MacroFactor é 1.200 kcal no "padrão", individual no "baixo", e a pessoa pode **desligá-lo** [F69]. O Noom pergunta sobre transtorno alimentar no onboarding [S7] e é 18+ [F40], enquanto o Cal AI é classificado 9+ [F22]. No Brasil, a prescrição dietética para pessoa doente é atividade privativa do nutricionista (Lei 8.234/1991, art. 3º, VIII) [F49], e o CFN atualizou o código de ética em abril de 2026 com regras sobre IA [S15][S16].

---

## 2. Onboarding

### 2.1 Comparação

| App | Tamanho | O que pergunta | Quando mostra a meta/plano | Paywall e teste | Fonte |
|---|---|---|---|---|---|
| **Noom** | Até 113 telas; 10–15 min (o blog oficial fala em "cerca de 15 minutos" de perguntas no site sobre peso atual, peso-meta e histórico de dietas, seguidas de um plano de ~16 semanas com faixa diária de calorias e a perda "mapeada" a 0,5–1 kg/sem) [F67] | Objetivo; sexo, gênero, gravidez; faixa etária; condições de saúde (múltipla escolha); **"Você tem diagnóstico ativo de transtorno alimentar?"**; quiz comportamental de 10 itens com controle deslizante; afirmações sobre hábitos e barreiras | Gráfico de projeção animado ("seu plano está sendo montado") com data-alvo ligada a um evento que a pessoa informou; a data **encurta** conforme ela responde | "Seu plano personalizado está pronto" → teste de 7 ou 14 dias com **escolha do preço** e o texto "custa-nos cerca de US$ 10 oferecer este teste" (exemplos oficiais: US$ 0,50, 3, 10, 18); ao fim do teste cobra o plano escolhido, sempre adiantado [F67] | [S6][S7][F67] |
| **Cal AI** | ~28–29 passos de quiz | Objetivo, atividade, peso, preferências alimentares | Plano personalizado no fim do quiz, antes do paywall | Paywall "duro": sem assinar, o app não é usável [F23]; o FAQ oficial confirma que tocar no "+" para registrar comida "abre a tela de paywall" [F24]; teste de 3 dias que vira anual; preços em teste A/B; exige meio de pagamento e renova sozinho | [S5][S21][F24] |
| **Yazio** | ~78 passos (teardown) | Quiz extenso; mascote dá incentivo ao longo do fluxo | Plano personalizado → paywall imediato | 1º paywall com 12 e 3 meses **sem** teste; ao fechar, aparece uma **roleta** com chance de 75% de desconto. A central de ajuda diz que o teste de 7 dias do PRO é oferecido "ocasionalmente" e **só no site**, não dentro do app [F36] | [S9][F36] |
| **MacroFactor** | Assistente ("wizard") curto; número de telas **não confirmado** | Dados demográficos, antropométricos e de estilo de vida; meta e ritmo; estilo de programa (Coached, Collaborative, Manual). Na criação do programa Coached, em sequência: tipo de dieta (balanceada, pouca gordura, pouco carbo, cetogênica), piso calórico, tipo de treino, distribuição de calorias na semana ("calorie shifting") e nível de proteína; "get program" mostra os macros antes de "start program", com seta de voltar para mudar respostas [F69] | Meta inicial no fim do assistente; a página avisa que a estimativa "pode ser imprecisa" e sugere importar 3–4 semanas de histórico | 7 dias grátis; sem plano gratuito | [F6][F2][F14] |
| **Carbon** | 10 passos documentados: (1) meta; (2) sexo e data de nascimento; (3) peso atual, peso-meta (só visual, não muda o ajuste) e % de gordura, com imagens de referência para quem não sabe; (4) "sabe sua manutenção?" (se sim, pula 5 e 6); (5–6) estilo de vida e exercício; (7) ritmo semanal, com faixa recomendada pelo coach; (8) preferência de dieta; (9) revisão, sem volta depois de criar; (10) ajustar macros [F71] | Meta (perder, ganhar, manter, *reverse diet*); preferência de dieta (balanceada, menos carbo, pouca gordura, vegetal, cetogênica, alta proteína) [F17][F72] | Macros na tela final do assistente, com botão "adjust macros" logo abaixo [F71] | O site de preços não mostra teste [F19]; teste **não confirmado** | [F17][F20][F71][F72] |
| **Lifesum** | **Não confirmado** | Perguntas sobre objetivo, preferências e interesses de dieta em tom de conversa | Plano "curado" no fim | **Não confirmado** | [S13] |
| **MyFitnessPal** | Número de telas **não confirmado** | Idade, altura, peso, sexo, nível de atividade diária (sem exercício), ritmo semanal de perda ou ganho, peso-meta (só para relatório; não entra na conta) e meta semanal de exercício [F51] | Metas iniciais calculadas a partir do gasto de manutenção, menos ou mais o ritmo escolhido [F51] | Free real; Premium e Premium+ pagos. O Premium+ nasce num onboarding próprio na aba Plan, que termina em "Start your 7-day Free Trial" e pede meio de pagamento [F53] | [F27][F51][F53] |

### 2.2 O que se aprende

- **A personalização é o produto que se vende no paywall.** Os três apps que mais monetizam com quiz (Noom, Cal AI, Yazio) põem o plano pronto *imediatamente antes* da cobrança [S5][S6][S9]. O Noom acrescenta a **visualização do futuro**: uma curva de peso com data, comparada com o "efeito sanfona" da dieta restritiva [S6].
- **O quiz longo é também triagem.** As perguntas de gravidez, condições de saúde e transtorno alimentar do Noom estão no mesmo fluxo de conversão [S6][S7]. A crítica comportamental aponta que o quiz de 30 min "não mostra nada do app" e filtra quem tem pouca motivação [S7].
- **Contraponto honesto.** O MacroFactor não monta espetáculo. Ele diz no próprio material de boas-vindas que a estimativa inicial erra e mostra como acelerar a calibração [F6][F3]. Para um público "do iniciante ao avançado", dá para fazer os dois: projeção visual para o iniciante, com uma nota "vamos recalibrar com seus dados em 2–4 semanas".

---

## 3. Cálculo da meta e adaptação semanal sem chat

### 3.1 Meta inicial

| App | Método publicado | Ritmo e limites | Fonte |
|---|---|---|---|
| **Yazio** | Mifflin-St Jeor (H: 10·kg + 6,25·cm − 5·idade + 5; M: … − 161) × fator de atividade + diferença energética. Fatores: baixo 1,25; moderado 1,38; alto 1,52; muito alto 1,65. Quem acabou de entrar recebe entre baixo e moderado: 1,33 (mulher) e 1,36 (homem). Não usa ajuste de Broca para IMC ≥ 30; sugere calcular por Harris-Benedict e ajustar à mão | Ritmo padrão de ±0,5 kg/semana ≈ 375 kcal/dia; 1 kg/semana = 750 kcal/dia, de propósito abaixo dos "1.000 kcal" clássicos, para não ficar abaixo da TMB. Recomenda sempre cobrir a TMB | [F35] |
| **MacroFactor** | "Fórmula padrão" com dados demográficos e antropométricos do onboarding, que "facilmente erra mais de 500 kcal/dia" para algumas pessoas; aceita estimativa manual sem prejudicar o algoritmo [F3]. Proteína escala com a massa magra estimada (peso × categoria de composição corporal), o tipo de treino e o nível escolhido [F70] | Ritmo definido em **% do peso por semana**, então o déficit absoluto cai conforme a pessoa emagrece [F70]; o handbook recomenda 0,25–1%/sem para a maioria [F68]. **Piso calórico** opcional: "padrão" de 1.200 kcal, "baixo" individual (mínimos de proteína, gordura e carbo para funções básicas) ou nenhum, com alerta [F69]. Gordura nunca abaixo de um mínimo fisiológico [F70] | [F3][F4][F6][F68][F69][F70] |
| **Carbon** | "Equação de Müller modificada" com peso, % de gordura (massa magra), estilo de vida e exercício, meta, ritmo e preferência de dieta. Proteína pela **massa magra**, não pelo peso total; carbo e gordura dividem o resto pela razão da dieta escolhida [F72] | **Piso calórico baseado em massa magra**; ao bater no piso, o coach sugere manter as metas e talvez mudar para *reverse diet* [F18]. Proteína tem piso e teto no ajuste manual [F72]. Ritmo escolhido dentro de uma faixa recomendada [F71] | [F18][F71][F72] |
| **Lose It!** | TMB (peso, altura, idade, sexo; a equação não é nomeada) × PAL em quatro níveis (Not, Somewhat, Highly, Extremely Active) − déficit. O "1,45" citado por terceiros [S12] **não** aparece na fonte primária | Quatro ritmos: 0,5 lb/sem (−250 kcal/dia), 1 lb (−500), 1,5 lb (−750), 2 lb (−1.000). **Não é piso rígido:** se a média semanal do orçamento fica abaixo de 1.200 (mulher) / 1.500 (homem), aparece um "Low Budget Warning" que recomenda, sem obrigar, um ritmo mais lento | [F57][F58] |
| **MyFitnessPal** | Gasto estimado (EER) com os níveis de atividade (PAL) do Institute of Medicine, menos ou mais o ritmo semanal; meta em calorias **líquidas** (comida − exercício registrado), então exercício aumenta a meta do dia. Macros padrão: 50% carbo, 20% proteína, 30% gordura; avisa quando o carbo fica abaixo de 130 g ou de 35% | "Não recomendamos menos de 1.200 kcal/dia para mulheres ou 1.500 para homens", com base no NIH; quem tem orientação de médico ou nutricionista pode personalizar | [F29][F51] |
| **Noom** | **Harris-Benedict** (sexo, idade, altura, peso inicial) gera uma **faixa** ("weight loss zone"), não um número: comer no piso da faixa dá ~0,5–1 kg/sem (1–2 lb), no teto ~0,25 kg/sem (0,5 lb) [F65]. Com "Dynamic Calorie Goals" (parte dos usuários, em inglês): fator de atividade 1,2 / 1,5 / 1,7, composição corporal do body scan, metade das calorias do treino acima de um limiar e 0,05 kcal por passo somadas à faixa [F66] | Se a TMB calculada fica abaixo de 1.200 (mulher ou não binário) ou 1.500 (homem), é elevada a esse mínimo [F66]. Cores por densidade calórica (kcal/g): sólidos < 1,0 verde, 1,0–2,4 amarelo, > 2,4 laranja; bebidas < 0,4 / 0,4–0,5 / > 0,5; sopas, molhos e pastas < 0,5 / 0,5–1,0 / > 1,0; integrais e laticínio desnatado descem uma cor, refrigerante e álcool sobem uma, adoçado artificialmente é amarelo; "o objetivo não é evitar laranja" [F41] | [F41][F65][F66] |

### 3.2 Adaptação

**MacroFactor: gasto observado pelo balanço energético.**
- O app "calcula seu gasto energético pela equação do balanço energético" e adapta as recomendações "sem exigir aderência perfeita" [F2]. As metas novas saem no **check-in semanal** [F6].
- Ele é "neutro em relação à aderência": encontra a pessoa onde ela está, "sem vergonha, julgamento nem a exigência de cumprir as metas à perfeição" [F7]. Na App Store: "sem avisos nem mensagens de culpa" [F14].
- **V3 (out/2024):** capta tendências 1–5 dias mais cedo; reduz em cerca de 35% a flutuação diária; filtra melhor a água retida; tolera cerca de 3× mais dados faltando; só pausa com mais de 3 dias sem registro na semana; estima a ingestão dos dias sem registro com erro de 15–20%; é cerca de 10% mais preciso [F1].
- Registro parcial: pular o creme do café de todo dia não atrapalha; deixar de registrar o jantar de vez em quando atrapalha [F5].
- Precisa de 2–4 semanas de registro *consistente* para uma estimativa boa; dá para importar histórico para acelerar [F6][F4].
- **Estilos de programa:** Coached (o app decide), Collaborative (o app ajusta o total semanal, a pessoa distribui), Manual (para quem tem treinador de fora) [F6].
- **Manutenção dinâmica:** ajustes automáticos mantêm o peso perto da meta [F10].
- **Compensar excessos:** o recurso existe, mas o app **recomenda não usar** em geral, porque pode alimentar padrões rígidos ou pouco saudáveis com comida [F13].
- **Suavização e sem "recuperar atraso":** o ajuste semanal não acompanha 1:1 a variação do gasto; num platô de 3 semanas que sugere −500 kcal, a meta cai só 200–300 kcal ("apostar dos dois lados"). E cada semana é uma unidade: se a pessoa está atrás do cronograma, o app **não** aumenta o déficit para compensar [F70].
- A fórmula completa do V3 **não é publicada**. Só o princípio e as métricas de desempenho são públicos [F1].

**Carbon: check-in guiado pela pergunta de aderência.**
- Toda semana ele revisa a ingestão registrada contra a meta, avalia o ritmo e recalibra calorias e macros. Os macros sobem ou descem na proporção da divisão escolhida [F15].
- **Quatro opções no check-in:** (1) registrei tudo → ajuste pela resposta metabólica; (2) registrei só algumas refeições → **mantém** a meta, porque dado parcial não sustenta ajuste; (3) não registrei, mas cumpri → trata como conforme e avalia pelo peso; (4) registrei em outro app → informar totais ou médias [F15].
- **A avaliação amadurece com a constância:** 1ª semana, peso inicial × final; após 2 semanas conformes, média semanal × média semanal; após 3 ou mais, média móvel de todo o histórico. **Uma semana não conforme volta ao método inicial** [F16].
- Dá para fazer o check-in antes ou depois do dia e mudar o dia fixo [F15]. O planejador de calorias só funciona em blocos de 7 dias [F18].
- Filosofia: "a aderência é a ciência" (*compliance is the science*); escolher a dieta mais fácil *para você* [F17].
- **Não pune quem comeu menos:** se a pessoa comeu abaixo da meta e perdeu mais que o ritmo, o resultado "faz sentido" e a meta não muda. Se perdeu mais rápido que o ritmo comendo a meta, as calorias **sobem**. Pede para não sobrescrever a meta à mão com frequência e para não pular check-in para fugir de ajuste; sugere uma semana de manutenção quando a meta fica baixa demais [F73].
- **Sem cardápio, por princípio:** o Carbon diz que não oferece plano de refeições porque "dieta flexível" não combina com cardápio fixo [F74].

**Fitia** anuncia "ajustes dinâmicos de calorias" automáticos conforme o peso [F47]. O algoritmo **não é publicado**.

**MyFitnessPal** (2026) trocou o caminho: o **AI Coach** (Premium, iOS) responde "o que comer" até o alimento e a porção, a partir do histórico de registros [F25]. É chat, e é exatamente o que o Eleva Pro quer evitar como caminho principal.

### 3.3 Cardápio pronto ou só metas

| Abordagem | Apps | Observação |
|---|---|---|
| **Só metas de macros** (registro flexível) | MacroFactor, Carbon | Público mais avançado; "dieta flexível" [F17][F2]. O Carbon recusa cardápio explicitamente: "não permite flexibilidade" e "não ensina hábitos" [F74] |
| **Metas + cardápio gerado** | MyFitnessPal Premium+ (Meal Planner, 1.500+ receitas, modo preparo, lista de compras com Instacart) [F27][F26]; Fitia Premium (planejamento automático, 2 a 5 refeições/dia, receitas, lista) [F46][F47]; Yazio PRO (planos de refeição) [F34]; Lifesum (planos de 7–21 dias, até 5 ingredientes, lista de compras) [F37] | Cardápio pronto é o principal "pago" dos apps que miram iniciantes |
| **Cardápio feito por nutricionista** | Tecnonutri (50+ programas; cardápio diário de nutricionistas) [F44]; FatSecret Premium (planos de nutricionista por preferência: cetogênica, mediterrânea, jejum etc.) [F45]; Dieta e Saúde (método de pontos, com cardápio e acesso a nutricionista no premium) [S17] | O argumento de autoridade é o profissional |
| **Densidade calórica / pontos** | Noom (cores) [F41]; Dieta e Saúde (pontos) [S17] | Simplifica para quem não quer contar macros |

---

## 4. Registro de refeição com pouco atrito

| App | Foto IA | Código de barras | Voz / texto | Repetir / copiar | Favoritos / receitas | Calorias rápidas | Banco BR | Fonte |
|---|---|---|---|---|---|---|---|---|
| **MacroFactor** | Sim (abr/2025): decompõe em ingredientes do banco e é editável; "Snap" (foto rápida) e "Describe" (uma ou várias fotos e/ou texto, inclusive cardápio de restaurante e instruções como porção e exclusões) refeitos na versão 5.5.7, de 10/05/2026 [F100] | Sim | Voz/texto ("Describe"); também no Apple Watch | Copiar e colar item, vários itens ou o dia inteiro para outra data ou vários dias; linha do tempo por minuto | Favoritos (2025); salvar refeição como receita; importar receita por link ou foto de livro; "explodir" receita | 4 toques; registrar por caloria ou macro e o app calcula a porção | Banco "verificado" próprio + **Open Food Facts** (licença ODbL) para código de barras, o que cobre produtos embalados brasileiros cadastrados lá; o app só existe em inglês e japonês. TACO **não** citada [F14] | [F2][F9][F10][F11][F12][F100] |
| **Carbon** | "Smart Logger": aba "Meal" (foto) e "Describe" (texto ou voz pelo ditado do teclado); casa com o banco verificado, tudo editável, nada salva sem o toque final; "cerca de 10 segundos" [F75] | Sim, e leitor de rótulo que cria o alimento quando o código não está no banco [F76] | "Describe" com ditado [F75] | Copiar o dia inteiro ou várias refeições para um ou vários dias no calendário [F77]; deslizar para a direita num item recente adiciona sem abrir [F78] | Favoritos, receitas | "Quick add" por macros (calcula as calorias) e "Quick Add Alcohol" por teor e volume [F78] | **Não confirmado** | [F75][F76][F77][F78] |
| **Cal AI** | Sim; ~80% de acerto declarado; sensor de profundidade | Sim | Texto: "descreva sua refeição" [F24]; voz **não confirmada** | **Não confirmado** | Alimentos e receitas próprios | Ajuste manual de macros | **Não confirmado**; integrado ao banco do MyFitnessPal após a compra | [F22][F24][S-acq] |
| **MyFitnessPal** | Meal Scan (Premium; só com o app em inglês): sugere alimentos do banco verificado, a pessoa escolhe e ajusta porção, "Add more" busca o que a câmera não viu [F54]; "Photo Upload" para registrar depois (iOS, 2026) | **Premium** desde 01/10/2022 [F52] | Voz (Premium; só em inglês): várias comidas numa frase, cada uma vira item editável; não aceita alimentos próprios, receitas, Quick Add, exercício, peso ou água [F31] | **Grátis:** deslizar para a direita sob o nome da refeição repete o que foi registrado nela da última vez; copiar uma refeição para outra refeição ou dia (não item avulso nem dia inteiro) [F30] | Aba Plan (todos): salvar refeições, registrar receita com 1 toque; receitas por URL ou colando ingredientes (grátis) [F56] | Sim: só calorias é grátis; com macros é Premium [F55] | 22 mi itens públicos [F30] | [F26][F25][F27][F30][F31][F52][F54][F55][S1] |
| **Lose It!** | Snap It (Premium; só com o aparelho em inglês): lista os alimentos achados com porção estimada, botões "Swap" e "Edit" antes de salvar [F61] | "Scan It": **passando para o Premium** em 2026; só em inglês [F59] | "Say It" (voz), só em inglês [F60] | Aba "Meals" com as refeições das últimas semanas, filtrada pelo período da refeição [F62] | Receitas; "My Foods" | **Não confirmado** | 50 mi+ itens [F63]; "Verified Foods" com selo verde [F60] | [F32][F59][F60][F61][F62][F63] |
| **Yazio** | Foto com IA: detecta ingredientes, estima porção, tudo editável ("adjust details") e salvável como refeição-modelo. **Foi grátis para todos no lançamento e passou para o Pro** [F94] | Sim (grátis) | **Não confirmado** | "Smart Adding" sugere salvar como refeição as combinações frequentes [S9]; copiar itens ou a refeição inteira para outro dia e outra refeição [F95] | 3.000+ receitas no Pro [F96] | "Quick Add" com descrição, calorias e macros opcionais; não aparece na lista do Pro [F97][F96] | 4 mi+ itens; app em português; banco por país, escolhido em "Food Database Country" (249 países e territórios), separado do idioma [F98] | [F34][S9][F94][F95][F96][F97][F98] |
| **Lifesum** | "AI Tracking" (**Premium**): o "+" abre uma **interface de chat** onde a pessoa digita ou fala a refeição, com atalhos para Recentes, Favoritos, "Quick Track" e busca no banco [F86] | Sim (grátis) [F87] | Voz e texto, dentro do AI Tracking (Premium) [F86] | **Grátis:** "Same as Yesterday" repete a refeição do dia anterior com um "+"; "Recent" re-registra itens [F87] | Favoritos, criar alimento, refeição e receita são **Premium**; 1.000+ receitas (Premium) [F85][F87] | "Quick Track" com calorias e macros [F87] | Seis fontes: USDA, MyNetDiary, UK FSA, Bundeslebensmittelschlüssel (Alemanha), Livsmedelsverket (Suécia) e usuários. **Nenhuma brasileira**, embora o app esteja em português [F88][F39] | [F38][F39][F85][F86][F87][F88] |
| **Fitia** | Foto e voz (Premium) | Sim (grátis) | Texto (grátis), voz (Premium) | **Não confirmado** | Receitas personalizadas | **Não confirmado** | 10 mi+ itens, vários países; o Brasil não aparece na lista citada. A App Store brasileira lista só inglês e espanhol como idiomas do app [F48] | [F46][F47][F48] |
| **Nutrola** | Sim, **Premium**; o próprio app alega reconhecer pratos com vários itens e estimar volume | Sim, **Premium** [F83] | Sim ("diga o que comeu") [F84] | **Não confirmado** | Receitas "em português" com um toque para registrar [F83] | **Não confirmado** | ~1,8 mi itens "verificados por nutricionista" (secundária, auto-declarado). A App Store lista português, mas o texto da loja brasileira é em português de Portugal ("regista", "tira uma foto") [F83] | [F42][F43][F83][F84][S20] |
| **FatSecret** | Reconhecimento de imagem de alimentos, refeições e produtos; álbum de fotos [F45] | Sim, com autocompletar [F45] | "Smart Assistant" para ditar ou digitar a refeição, no Premium (trecho de busca) [F92] | **Não confirmado** | Planos no Premium | **Não confirmado** | **Banco brasileiro próprio** em fatsecret.com.br: genéricos ("Feijão Carioca Cozido", 76 kcal/100 g) e marcas nacionais (Camil, Kicaldo); a página cita "fatsecret Platform API" como origem, e o valor coincide com o da TACO, mas o uso da TACO **não é declarado** [F91]. App em português (a descrição da loja brasileira está em português de Portugal) [F45] | [F45][F91][F92] |

**Banco brasileiro (TACO).** Nenhum dos líderes globais declara usar a TACO na fonte primária lida. Ela aparece em apps brasileiros de consulta ("Macros da Tabela Taco", "Taco App", com TACO, Tucunduva, IBGE e USDA) [S-taco], que são tabelas e não coaches. O que a revisão de 03/10/2026 achou: o **FatSecret** tem banco brasileiro próprio, com genéricos e marcas nacionais, e o valor do feijão carioca cozido coincide com o da TACO, sem que a fonte seja declarada [F91]; o **Yazio** separa idioma e "país do banco", com 249 países [F98]; o **MacroFactor** usa Open Food Facts no código de barras, mas o app só existe em inglês e japonês [F14]; o **Lifesum** usa USDA, MyNetDiary e tabelas do Reino Unido, Alemanha e Suécia, nenhuma brasileira [F88]; o **Fitia** e o **Carbon** não listam português entre os idiomas da loja [F48][F80]; o **Nutrola** está em português de Portugal [F83]. **Não confirmado** que Tecnonutri use TACO. Para um app brasileiro, a lacuna é real: comida brasileira com fonte declarada, IA de registro em português e interface em português do Brasil.

**Lição de interface do MacroFactor:** medir o registro em **número de ações** por caso de uso (busca, multi-add, código de barras, calorias rápidas) e otimizar contra os concorrentes. O argumento deles é que quem registra com disciplina usa esses fluxos "15+ vezes por dia" [F9].

---

## 5. Monetização

### 5.1 Preços (acesso em 02/10/2026)

| App | Grátis? | Preço (fonte e data) | Teste | O que fica atrás do paywall | Fonte |
|---|---|---|---|---|---|
| **MacroFactor** | Não | US$ 11,99/mês · US$ 47,99/6 meses · US$ 71,99/ano | 7 dias | Tudo | [F2][F14] |
| **Carbon** | Não | US$ 11,99/mês · US$ 59,99/6 meses · US$ 99,99/ano (confirmado também na central de ajuda [F79]). BR: R$ 79,90/mês · R$ 399,90/6 meses · R$ 599,90/ano; app só em inglês [F80] | Não mostrado na página de preços | Tudo | [F19][F79] |
| **Cal AI** | Paywall duro na prática | EUA: compras de US$ 2,99 a US$ 29,99, mais **restauração de sequência a US$ 0,99**. BR: R$ 14,90 a R$ 199,90. Valores em A/B | 3 dias com cartão, renovação automática | Uso do app | [F22][F23][F24][S21] |
| **MyFitnessPal** | Sim | Premium US$ 79,99/ano; Premium+ US$ 99,99/ano (Premium+ só em EUA, Reino Unido, Canadá, Irlanda, NZ e Austrália [F53]). BR: R$ 31,90 a R$ 329,90 | Premium+: 7 dias, com meio de pagamento [F53]. Premium: o passo a passo oficial de upgrade não cita teste (escolher mensal ou anual e assinar) [F93] | Premium: código de barras, Meal Scan, voz, metas personalizadas de macro, sem anúncio, AI Coach. Premium+: Meal Planner, receitas, lista de compras | [F25][F27][F28] |
| **Lose It!** | Sim | Tabela da central: Premium US$ 79,99/ano; vitalício US$ 299,99 (US$ 229,99 para quem já é Premium) [F63]. Na prática, desconto quase sempre: "a maioria dos usuários recebe ofertas com desconto" conforme época e uso [F64]; a App Store mostra compras de US$ 9,99 a US$ 39,99 e vitalício de US$ 49,99 a US$ 59,99 [F32]. BR: compras de R$ 31,90 a R$ 309,90 [F81] | 7 dias para quem nunca teve Premium [F64] | Metas de água, sono e nutrientes; sincronização com relógios; planejar refeições; código de barras; foto e voz [F63] | [F32][F63][F64] |
| **Yazio** | Sim | BR: PRO mensal R$ 47,90–64,90; anual R$ 89,90–214,90 | 7 dias, só "ocasionalmente" e só pelo site [F36]; no app, 1º paywall sem teste + roleta de 75% de desconto [S9] | IA, planos de refeição, integrações, micronutrientes | [F34][F36][S9] |
| **Lifesum** | Sim | EUA: US$ 7,49/mês · US$ 49,99/ano. BR (03/10/2026): 1 mês R$ 21,99–69,90; 3 meses R$ 54,90–199,90; 1 ano R$ 144,90–499,90 [F39] | **Não confirmado** | AI Tracking, **definir a própria meta de calorias**, ajustar macros, planos de refeição feitos por nutricionistas (3 semanas de perda, jejum, "sugar detox", vegano), criar alimentos e receitas, nutrientes detalhados, todas as receitas [F85] | [F38][F39][F85] |
| **Noom** | Não | Noom Weight: tudo cobrado adiantado, de US$ 70 (mensal) a US$ 209 (anual, US$ 17,50/mês); a maioria começa no plano de 4 meses (US$ 169) [F67]. Noom Med a partir de US$ 69/mês [F40]. BR: "Noom Program" de R$ 144,90 a R$ 999,90 [F82] | 7 ou 14 dias com "escolha seu preço" [F67] | Tudo | [F40][F67][S6][S7] |
| **Fitia** | Sim | BR: R$ 23,90/mês a R$ 249,00 (anual família) | 3 dias, **só no plano anual**, oferecido no fim do onboarding (ou pela aba Plan); lembrete um dia antes; vira anual automaticamente; uma vez por conta [F89] | Plano automático, foto/voz, Coach, ajustes dinâmicos, jejum | [F46][F48] |
| **Tecnonutri** | Sim | BR: R$ 25,90–39,90/mês; trimestral R$ 31,90–89,90; anual R$ 239,90 [F44] | **Não confirmado**; a loja só diz "download grátis para experimentar sem compromisso" [F44] | Cardápio personalizado, listas de compras semanais, chat com nutricionistas em dias úteis (a loja não separa grátis e pago) [F44] | [F44] |
| **FatSecret** | Sim | BR: R$ 37,90–234,90 (mensal, trimestral e anual) [F45] | **Não confirmado** | Planos de dietista por preferência (cetogênica, balanceada, mediterrânea, jejum, alta proteína), planejamento antecipado de refeições, seis tipos extras de refeição e **contador de água** [F90] | [F45][F90] |
| **Nutrola** | Grátis limitado | EUA: "Unlimited Access" US$ 9,99–39,99, "Premium" US$ 24,99, vitalício US$ 199,99–299,99 [F84]. BR: R$ 59,90–199,90, vitalício R$ 1.299,90–1.999,90 [F83]. Vende também **"Gems"** avulsas (R$ 12,90 a R$ 129,90), moeda dentro do app [F83] | **Não confirmado** | Foto com IA, código de barras, Diet Assistant [F83] | [F43][F83][F84] |

**Referência para o Eleva Pro:** o Starter (R$ 19/mês) fica abaixo do Yazio PRO mensal, do Tecnonutri e do Fitia mensal no Brasil. O Pro (R$ 39/mês) fica no meio da faixa. Os concorrentes empurram o **anual**: MacroFactor e Carbon cobram cerca de 50% e 30% menos por mês no anual [F2][F19].

### 5.2 Padrões de paywall

- **O plano pronto como gancho** (Noom, Cal AI, Yazio) [S5][S6][S9].
- **Recurso de atrito atrás do paywall** (código de barras, foto, voz no MyFitnessPal) [F27]. O caso do código de barras gerou reação forte [S1][S2].
- **O cardápio como degrau superior** (MyFitnessPal Premium+, Fitia, Tecnonutri) [F27][F46][F44].
- **Recuperação de quem fechou o paywall:** a roleta de desconto do Yazio [S9] e a "segunda oferta" do Cal AI, que foi um dos pontos levantados na remoção (secundária) [S4].
- **Monetizar a sequência:** o Cal AI vende "restaurar sequência" por US$ 0,99 [F22].

---

## 6. Retenção

| App | Mecanismos | Fonte |
|---|---|---|
| **MacroFactor** | Check-in semanal com anel de meta e contagem de dias até o próximo (pode adiantar até 2 dias ou mudar o dia); calendário de esforço de registro com sequências de hábito e visão anual; insights em 3, 7, 14, 30 e 90 dias; tom sem culpa | [F7][F8] |
| **Carbon** | Check-in semanal de 1 min com relatório imediato | [F15] |
| **Cal AI** | Sequências (restauráveis por compra), "Health score", medalhas animadas por registrar refeição e água, aba "Milestones" que funciona como sala de troféus | [F22][S5] |
| **MyFitnessPal** | Aba "Today" (2026) com sequências, seção de hábitos (água, exercício, passos); aba Progress com resumo semanal de aderência, tendência de peso e macros (dicas no Premium); comunidade. A troca da aba Diário pela Today gerou reclamações de "mais toques" | [F25][F27][F30][S18] |
| **Lose It!** | Sequências de registro, marcos de peso, grupos e desafios, feed social; medalhas por dias seguidos (3 dias, 2, 4 e 8 semanas). Ao tocar "I'm Done Logging", mostra a **data projetada** para a meta calculada pelo déficit médio real da sequência atual (a aba Goals mostra a data "planejada"); **esconde** a projeção se o ritmo real for mais de 6× mais rápido que o planejado, "para incentivar perda segura" | [F32][S11][F99] |
| **Noom** | "Daily Lessons" de **5 a 15 min** para começar o dia, com TCC, DBT e manejo de estresse, cobrindo também sono e autocuidado; coach que faz check-in **semanal** (ou mais, se a pessoa quiser) e recebe mensagem 24/7 no app [F67] | [F67] |
| **Yazio** | Micro-feedback gamificado ("Vitamin Boost!", "Protein Power!"); mascote; lembretes de água | [S9][F34] |
| **Lifesum** | Life Score **semanal** ("o que foi bem e como melhorar"); notas de alimento, refeição e dia | [F37] |
| **Tecnonutri** | Pontos (XP) por preencher diário de alimentação, de exercício e de água, trocados no app da Vitat por conteúdo e descontos em medicamentos e exames; grupos da comunidade com a equipe nutricional | [F44] |
| **Fitia** | Desafios em equipe | [F48] |

**Lição:** os mecanismos que valem *para dieta* combinam um ritual semanal com relatório (MacroFactor, Carbon, Lifesum) e reforço positivo imediato no registro (Yazio, Cal AI). Sequência diária funciona, mas pode virar obrigação ou ser monetizada. Para quem tem relação difícil com comida, é um risco (ver seção 8).

---

## 7. Design diferenciado

| App | O que torna a interface memorável | Exemplo concreto | Fonte |
|---|---|---|---|
| **MacroFactor** | Gráficos grandes "de ponta a ponta", com pinça e arrasto; peso de tendência que separa sinal de ruído; gráficos que interpretam em vez de só mostrar; empresa contratou um **animador** em 2025 | **Tendência de peso** vs. pesagem diária; **gráfico em cascata** do progresso semanal rumo à meta; **mostrador** em manutenção que "vira" para "Abaixo" se a tendência cair 1,5 lb abaixo da meta; widget de **balanço energético** de 30 dias; barras empilhadas (calorias, proteína, gordura, carbo) por dia; anel de meta no check-in | [F7][F8][F12] |
| **Cal AI** | Minimalismo: um anel de calorias + "chips" de macros, água e peso numa tela; deslizar para fibra e sódio; claro e escuro | Tela inicial com anel grande; medalhas animadas | [F24][S5] |
| **Noom** | Semáforo de alimentos (verde, amarelo, laranja) que simplifica a decisão; **gráfico de projeção animado** que se desenha "enquanto monta seu programa" | Curva Noom × efeito sanfona com data-alvo | [F41][S6] |
| **Yazio** | Mascote, micro-feedback com nome ("Protein Power!"), linha do jejum com janelas visuais | Linha do tempo do jejum 16:8 | [S9] |
| **Lifesum** | Cor com significado, ilustração, animações suaves, cartões; Editors' Choice; primeiro app de saúde com widget no iOS 14 | Nota da refeição e do dia; Life Score semanal | [F38][F37][S13][S14] |
| **MyFitnessPal** | Redesenho de 2026 com tela "Today" e aba Progress semanal; parte dos usuários acha pior para tarefas básicas | Today: calorias consumidas e restantes e macros no topo (grátis vê só o % de cada macro; Premium alterna gramas consumidas, restantes e %); refeições com botão "Log"; seção "Healthy Habits" com água, exercício e passos; último peso no rodapé; seletor de dias da semana no topo [F30] | [F25][F30][S18] |
| **Carbon** | Painel de gráficos sem enfeite, focado em corpo e nutrição | Aba "me" com gráficos de peso, % de gordura, massa magra, **calorias de manutenção**, calorias e cada macro, com botão para ver como lista [F101]; "Coach Trend Weight" (experimental) recalcula o peso de tendência de todos os dias a cada nova pesagem e alimenta check-in, aba Coach e gráficos [F102] | [F101][F102] |

**Leitura para o kit de vidro do Eleva Pro:**
- O vidro diferencia **superfícies**, mas o gráfico pede fundo sólido e contraste. O MacroFactor mostra que o "uau" vem do **gráfico que interpreta** (tendência, cascata, mostrador, balanço), não de enfeite.
- O verde-lima casa com o semáforo do Noom. Cuidado: cor não pode ser o único sinal (acessibilidade) e não deve rotular alimento como "ruim".
- Microinteração com nome (Yazio) e anel único (Cal AI) são baratos e dão personalidade.

---

## 8. Cuidados regulatórios observados

| Tema | O que os apps fazem | Fonte |
|---|---|---|
| **Piso calórico** | MyFitnessPal: 1.200 (M) / 1.500 (H) kcal; Lose It!: aviso (não bloqueio) abaixo de 1.200/1.500 pela média semanal [F58]; MacroFactor: 1.200 kcal ("padrão"), individual ("baixo") ou desligado, à escolha da pessoa [F69]; Carbon: piso por massa magra, e ao atingi-lo sugere manter as metas ou fazer *reverse diet*; Yazio: sempre cobrir a TMB, e déficit padrão moderado (375 kcal/dia) | [F29][F58][F69][F18][F35] |
| **Ritmo de perda** | MacroFactor: "a maioria deve mirar 0,25–1% do peso por semana"; perder mais rápido aumenta o risco de perder músculo e de fadiga da dieta [F68]. Yazio: padrão de 0,5 kg/sem [F35]. Lose It!: até 2 lb/sem [F57] | [F68][F35][F57] |
| **Transtorno alimentar** | Noom pergunta sobre diagnóstico ativo no onboarding [S7]. O Noom Med exclui TA ativo, gestantes, menores e IMC < 18,5 (secundária) [S10]. MacroFactor evita a "compensação" de excessos por risco de rigidez [F13]. Relatos sobre o MyFitnessPal falam em restringir contas com meta muito baixa, de forma inconsistente (secundária) [S-mfp-ed] | [S7][S10][F13] |
| **Idade** | Noom 18+; Lose It! 18+; MyFitnessPal 12+ (BR) / 16+ (EUA); Lifesum 13+; Yazio 12+; Fitia 12+; **Cal AI 9+** | [F40][F32][F28][F27][F38][F34][F48][F22] |
| **Aviso médico** | Cal AI: "não oferecemos aconselhamento médico… consulte um profissional" | [F22][F23] |
| **GLP-1** | MyFitnessPal (EUA/Canadá) registra medicação, refeições e efeitos colaterais; Lose It! registra GLP-1; Noom Med prescreve | [F25][F32][F40] |
| **Prática de app de compra** | Remoção temporária do Cal AI pela Apple (abr/2026), com relato de folha de pagamento que imitava a nativa | [S3][S4] |

**Brasil (não é parecer jurídico; levar a `/lgpd-check` e a assessoria):**
- **Lei 8.234/1991, art. 3º:** são privativas do nutricionista a "assistência e educação nutricional a coletividades ou indivíduos, sadios ou enfermos" (VII) e a "assistência dietoterápica… prescrição… de dietas para enfermos" (VIII) [F49]. Isso reforça desenhar o Praticante para **pessoa saudável**, com triagem de condição clínica que **encaminha** em vez de gerar dieta, e com linguagem de "plano alimentar sugerido / educação", não de "prescrição".
- **CFN, código de ética (abril/2026; fontes divergem entre 25 e 28/04):** exige declarar o uso de IA nos materiais, proíbe simular resultado clínico ou pessoas reais com IA (o "antes e depois" inclusive) e diz que a IA não substitui a interação direta com o paciente [S15][S16]. Vale para o **nutricionista** (por exemplo, o especialista vinculado no Eleva Pro), mas sinaliza a direção do regulador: nada de projeção visual do corpo gerada por IA.
- **LGPD:** dado de alimentação ligado a peso e saúde é dado pessoal sensível (art. 5º, II; art. 11) [F50]. Foto do prato enviada a um modelo de IA de terceiro exige transparência sobre o operador e sobre transferência internacional (art. 33).

---

## 9. Tabela comparativa

| App | Onboarding | Adaptação | Registro | Preço/teste | Retenção | Destaque de design |
|---|---|---|---|---|---|---|
| **MacroFactor** | Assistente curto; avisa que a estimativa erra | Check-in semanal; gasto por balanço energético; neutro em aderência; V3 tolera falta de dados | Mais rápido medido (26 ações); foto mapeada ao banco; copiar o dia; voz | US$ 71,99/ano; 7 dias; sem plano grátis | Calendário de registro; insights 3–90 d | Tendência, cascata, mostrador, balanço energético |
| **Carbon** | 10 passos; meta, % de gordura, manutenção conhecida, ritmo, dieta | Müller modificada; check-in de 1 min com 4 opções de registro; média móvel após 3 semanas conformes; piso por massa magra; sem cardápio | Foto e texto mapeados ao banco; copiar o dia; quick add por macros | US$ 99,99/ano; teste não mostrado | Relatório do check-in | Aba "me" com gráfico de manutenção e massa magra; peso de tendência experimental |
| **Cal AI** | ~28 passos → plano → paywall duro | **Não confirmado** | Foto com profundidade; código de barras | 3 dias com cartão; preços em A/B; R$ 14,90–199,90 | Sequência (vende restauração), medalhas, Health score | Anel único + chips, minimalista |
| **MyFitnessPal** | Idade, altura, peso, sexo, atividade, ritmo; EER (PAL do IOM) ± ritmo; piso 1.200/1.500 | AI Coach por chat (Premium) | Código de barras, voz e Meal Scan pagos; 20 mi+ itens | US$ 79,99 / 99,99/ano | Today + sequências; Progress semanal; comunidade | Redesenho de 2026 polêmico |
| **Lose It!** | **Não confirmado** | TMB × PAL (4 níveis) − 250 a 1.000 kcal; aviso abaixo de 1.200/1.500 | Snap It, voz e código de barras pagos e só em inglês | US$ 79,99/ano de tabela, quase sempre com desconto; 7 dias; vitalício | Medalhas, desafios, grupos | Medalhas |
| **Noom** | Até 113 telas; projeção com data; triagem de TA | Harris-Benedict → faixa de calorias; cores por densidade; coach humano | Banco de 1 mi+; registro com IA | A partir de US$ 17/mês; teste "escolha o preço" | Lições diárias de TCC | Semáforo; gráfico de projeção animado |
| **Yazio** | ~78 passos; mascote; paywall imediato + roleta | Mifflin-St Jeor × NAP (sem adaptação confirmada) | Código de barras grátis; IA no PRO; Smart Adding | BR R$ 47,90–64,90/mês | Micro-feedback, jejum | Mascote, feedback com nome |
| **Lifesum** | Tom de conversa | Planos de 7–21 dias; meta própria só no Premium | Foto/voz/texto em chat (Premium); código de barras e "Same as Yesterday" grátis; banco sem fonte brasileira | US$ 49,99/ano; BR desde R$ 10,99/mês | Life Score semanal; notas | Cor, ilustração; Editors' Choice |
| **Fitia** | Paywall no fim do onboarding, com teste de 3 dias só no anual [F89] | "Ajustes dinâmicos" (algoritmo não publicado) | Foto/voz pagos; texto e código de barras grátis | BR desde R$ 23,90/mês; app sem português na loja | Desafios em equipe | **Não confirmado** |
| **Nutrola** | **Não confirmado** | **Não confirmado** | Foto com vários itens (auto-declarado) | **Não confirmado** | **Não confirmado** | **Não confirmado** |
| **Tecnonutri** | **Não confirmado** | Cardápio de nutricionista; chat com nutricionistas | Diário | BR R$ 25,90–39,90/mês | Pontos XP trocados na Vitat | App sem atualização desde 07/02/2024 [F44] |
| **FatSecret** | **Não confirmado** | Planos de nutricionista (Premium) | Imagem, código de barras; banco brasileiro com marcas nacionais | BR R$ 37,90–234,90 | Comunidade; compartilhar o diário com o profissional (fatsecret Professional, grátis para ele) [F90] | **Não confirmado** |
| **Dieta e Saúde** | **Não confirmado** | Método de pontos | Diário de pontos | **Não confirmado** | Alertas, evolução | **Não confirmado**. Em 03/10/2026 o app não aparece na busca da App Store brasileira e o domínio dietaesaude.com.br não respondeu: pode ter saído do ar |

---

## 10. O que o Eleva Pro deve copiar, adaptar ou evitar

Considera o que já existe: plano do dia, troca por equivalência, foto do prato com IA, lista de compras com preço, aderência da semana e registro de água. Também considera as decisões do ADR-0020 (meta por conta determinística, IA escolhe alimentos e explica, pessoa aprova) e do ADR-0028 (Praticante como modo principal). E o pedido central: **a dieta não pode depender de chat.**

### Agora

1. **COPIAR — "Assistente sem chat": questionário → meta → plano pronto → aprovar.** Tirar o nascimento da dieta do chat. Fluxo: um questionário curto (objetivo, sexo, idade, altura, peso, atividade, ritmo, preferências, nº de refeições, alimentos que não come, orçamento). A **meta** sai de Mifflin-St Jeor × fator de atividade [F35] com piso. A IA monta o **plano do dia** sobre a meta, e a pessoa **aprova com um toque**, troca item (equivalência já existe) ou pede "outro plano". O chat vira opção secundária ("perguntar ao Assistente"). Base: o padrão de Noom, Cal AI e Yazio [S5][S6][S9] e o cardápio automático do Fitia, que não usa chat [F46].
2. **COPIAR — "Seu plano está pronto" antes do paywall, com honestidade.** Mostrar meta, macros, um dia de exemplo e a **curva de projeção com data** (Noom [S6]), com a nota "vamos recalibrar com seus dados em 2–4 semanas" (MacroFactor [F6]). O paywall aparece *depois* do valor.
3. **EVITAR — dark patterns no paywall.** Nada de preço semanal em destaque escondendo o cobrado, nada de folha de pagamento que imita a nativa, nada de segunda oferta insistente nem roleta de desconto (Cal AI, Yazio) [S3][S4][S9]. Mostrar o preço cobrado, a data da cobrança e como cancelar. A remoção do Cal AI mostra que isso tem custo real.
4. **ADAPTAR — triagem clínica e de segurança no questionário.** Perguntar sobre gravidez e amamentação, condições clínicas (diabetes, doença renal, etc.), transtorno alimentar (atual ou passado) e idade, como o Noom faz no onboarding [S7]. Regras: menor de 18 não recebe déficit; IMC < 18,5 não recebe meta de perda; TA, gestação ou condição clínica → **sem plano gerado**, com encaminhamento a nutricionista (e a oportunidade de vincular um especialista no próprio Eleva Pro). Piso calórico rígido (no mínimo a TMB, e não abaixo de 1.200/1.500 [F29][F35]) e ritmo máximo de cerca de 1% do peso por semana. Isso conversa com a Lei 8.234/1991, art. 3º, VIII [F49]. Passar por `/lgpd-check`.
5. **COPIAR — foto com IA mapeada para alimentos do banco, editável.** Se a foto do prato hoje devolve um número opaco, mudar para o modelo do MacroFactor: decompor em ingredientes do banco, mostrar porções editáveis e só então registrar [F11]. Isso também alimenta a troca por equivalência.
6. **EVITAR — pôr o registro básico atrás do paywall.** Busca, código de barras, "repetir refeição", "calorias rápidas", criar alimento, definir a própria meta e água ficam no Free. A lição é o MyFitnessPal [S1][S2], e o movimento agora é geral (Lose It! [F59], Yazio [F94], Lifesum [F85], FatSecret cobra até o contador de água [F90]): registro grátis e em português vira diferencial. Monetizar o que *gera* valor: plano gerado, adaptação semanal e foto com IA ilimitada.

### Em seguida

7. **COPIAR — check-in semanal de 1 minuto (Carbon) com algoritmo neutro em aderência (MacroFactor).** Toda semana: "como foi o registro?" (tudo / parte / não registrei mas segui o plano / não segui), peso e um resumo. Ajuste: só recalcular o gasto com semana bem registrada; semana parcial **mantém** a meta [F15][F16]. O gasto observado sai do balanço energético (ingestão registrada − variação energética do peso de tendência) [F2]. A fórmula do MacroFactor não é pública [F1]: a nossa deve ser determinística, documentada em ADR e testada. Três regras públicas para copiar: **suavizar** o ajuste (num platô de 3 semanas que sugere −500 kcal, mexer só 200–300) e **não cobrar atraso** do cronograma (cada semana é uma unidade) [F70]; **não punir** quem comeu menos e perdeu mais, e **subir** calorias quando a perda passa do ritmo [F73]; ritmo em % do peso por semana, 0,25–1% [F68][F70]. A IA só *explica* o ajuste (ADR-0020).
8. **COPIAR — atalhos de registro medidos em toques.** Repetir refeição, copiar o dia, favoritos com porção salva, "adicionar calorias rápido" (meta: ≤ 4 toques) e "registrar o plano do dia como foi" com um toque. Medir como o MacroFactor faz [F9].
9. **ADAPTAR — banco brasileiro (TACO) como diferencial.** Nenhum líder global declara TACO em fonte primária, e os apps brasileiros com TACO são tabelas, não coaches [S-taco]. O FatSecret é o único global com banco brasileiro de marcas nacionais [F91]; os líderes de IA de registro só funcionam em inglês [F31][F54][F60]. Pratos brasileiros (arroz e feijão, PF, tapioca, cuscuz) na foto com IA e nas trocas. Conferir a licença de uso da TACO antes.
10. **COPIAR — gráfico de tendência de peso como tela-assinatura.** Pesagem diária em pontos e tendência suavizada em linha; cascata semanal rumo à meta; mostrador em manutenção [F8]. No kit de vidro: cartão de vidro com o gráfico em área sólida, linha em verde-lima e animação de entrada. É onde o "design diferenciado" se paga.
11. **ADAPTAR — sequência e reforço sem culpa.** Sequência de *registro* (não de "dia dentro da meta"), feedback com nome no registro ("Proteína em dia!", à la Yazio [S9]), tom neutro do MacroFactor [F7][F14]. **Evitar** vender restauração de sequência (Cal AI [F22]) e mensagens de punição.

### Depois

12. **ADAPTAR — relatório semanal com nota ("Life Score" do Lifesum [F37]).** Combinar aderência da semana (já existe), proteína, água e variedade numa nota com "o que foi bem e o que melhorar". Sem rotular alimento como proibido.
13. **ADAPTAR — modo "sem contar" para iniciantes.** Semáforo por densidade calórica (Noom [F41]) ou porções visuais como alternativa à contagem de macros. Serve para o Praticante iniciante e para quem não deve contar calorias.
14. **ADAPTAR — estilos de programa (MacroFactor [F6]).** "Automático" (o app ajusta), "Colaborativo" (o app dá o total semanal, a pessoa distribui) e "Manual" (avançado, ou com especialista vinculado). Atende do iniciante ao avançado sem duas UIs.
15. **ADAPTAR — conteúdo educativo curto.** Lições de 5–15 min (Noom [F67]; o nosso pode ser mais curto), revisadas por nutricionista e ligadas ao momento do plano. Declarar o uso de IA no conteúdo, na direção do código do CFN [S15].
16. **AVALIAR — GLP-1.** MyFitnessPal, Lose It! e Noom já registram medicação e efeitos [F25][F32][F40]. No Brasil isso toca dado sensível e prescrição médica: só com `/lgpd-check` e decisão explícita.

### Não fazer

- Chat como único caminho para nascer ou ajustar a dieta (é o rumo do AI Coach do MyFitnessPal [F25], não o do Eleva Pro).
- Compensação automática de excessos ("pagar" o fim de semana na segunda): o MacroFactor desaconselha [F13].
- Imagens de "antes e depois" ou projeção do corpo geradas por IA [S15][S16].
- Classificação etária baixa (como o 9+ do Cal AI [F22]) para um app que gera déficit calórico.

---

## 11. Fontes

### Primárias

- **[F1]** MacroFactor, "An In-Depth Look at MacroFactor's New V3 Expenditure Algorithm" (atualizado em 08/10/2024). https://macrofactor.com/expenditure-v3/
- **[F2]** MacroFactor, página do app (recursos, estilos de programa, preços). https://macrofactor.com/macrofactor/
- **[F3]** MacroFactor Help, "Set a Manual Initial Expenditure Estimate" (texto integral lido em 03/10/2026). https://help.macrofactorapp.com/en/articles/70-set-a-manual-initial-expenditure-estimate
- **[F4]** MacroFactor Help, "What Should I Do if My Initial Expenditure or Recommended Energy Intake Seems Too High or Too Low". https://help.macrofactorapp.com/en/articles/206-what-should-i-do-if-my-initial-expenditure-or-recommended-energy-intake-seems-too-high-or-too-low
- **[F5]** MacroFactor Help, "Do I Need to Log Everything I Eat and Drink…". https://help.macrofactorapp.com/en/articles/140-do-i-need-to-log-everything-i-eat-and-drink-to-have-an-accurate-expenditure-and-use-macrofactor-s-coaching-features
- **[F6]** MacroFactor, "Welcome To MacroFactor". https://macrofactor.com/welcome/
- **[F7]** MacroFactor, "MacroFactor Delivers on the Next-Generation Macro Tracking & Nutrition Coaching Experience". https://macrofactor.com/dashboard-revamp/
- **[F8]** MacroFactor Help, "Get to Know Your Dashboard". https://help.macrofactorapp.com/en/articles/22-get-to-know-your-dashboard
- **[F9]** MacroFactor, "What is the Fastest Food Logger? We Designed a System to Find Out". https://macrofactor.com/fastest-food-logger/
- **[F10]** MacroFactor, "10 MacroFactor Features You Might Have Missed". https://macrofactor.com/10-macrofactor-features/
- **[F11]** MacroFactor, "AI-Powered Food Logging Comes to MacroFactor". https://macrofactor.com/ai-food-logging/
- **[F12]** MacroFactor, "The 2025 MacroFactor Annual Report". https://macrofactor.com/annual-report-2025/
- **[F13]** MacroFactor Help, "How to adjust calorie targets to account for overages or to roll over unused calories". https://help.macrofactorapp.com/en/articles/108-how-to-adjust-calorie-targets-to-account-for-overages-or-to-roll-over-unused-calories
- **[F14]** App Store (EUA), "MacroFactor – Macro Tracker" (descrição relida em 03/10/2026 pela API de consulta do iTunes: Open Food Facts/ODbL, idiomas EN e JA, teste de 7 dias). https://apps.apple.com/us/app/macrofactor-macro-tracker/id1553503471
- **[F15]** Carbon Help, "Weekly Check-In in Carbon: How It Works and What to Expect". https://help.joincarbon.com/en/articles/6004812-weekly-check-in-in-carbon-how-it-works-and-what-to-expect
- **[F16]** Carbon Help, "How Carbon Evaluates Your Progress at Your Check-In". https://help.joincarbon.com/en/articles/10338862-how-carbon-evaluates-your-progress-at-your-check-in
- **[F17]** Carbon Help, "Understanding the Carbon Dieting Methods". https://help.joincarbon.com/en/articles/6004516-understanding-the-carbon-dieting-methods
- **[F18]** Carbon Help, "Why won't the calorie planner adjust?". https://help.joincarbon.com/en/articles/6059935-why-won-t-the-calorie-planner-adjust
- **[F19]** Carbon, página de preços. https://www.joincarbon.com/pricing
- **[F20]** Carbon, página inicial. https://www.joincarbon.com/
- **[F21]** MyFitnessPal (blog corporativo), "MyFitnessPal Expands its Position… with Cal AI Acquisition", 02/03/2026. https://news.myfitnesspal.com/myfitnesspal-expands-its-position-as-the-leading-player-in-digital-nutrition-tracking-with-cal-ai-acquisition/
- **[F22]** App Store (EUA), "Cal AI – Calorie Tracker". https://apps.apple.com/us/app/cal-ai-calorie-tracker/id6480417616
- **[F23]** App Store (Brasil), "Cal AI". https://apps.apple.com/br/app/cal-ai-contador-de-calorias/id6480417616
- **[F24]** Cal AI, site oficial. https://www.calai.app/
- **[F25]** MyFitnessPal / GlobeNewswire, "MyFitnessPal Announces Its 2026 Summer Release", 25/08/2026. https://www.globenewswire.com/news-release/2026/08/25/3350516/0/en/myfitnesspal-announces-its-2026-summer-release.html
- **[F26]** MyFitnessPal / GlobeNewswire, "MyFitnessPal Debuts Its 2026 Winter Release", 24/02/2026. https://www.globenewswire.com/news-release/2026/02/24/3243668/0/en/myfitnesspal-debuts-its-2026-winter-release.html
- **[F27]** App Store (EUA), "MyFitnessPal: Calorie Counter". https://apps.apple.com/us/app/myfitnesspal-calorie-counter/id341232718
- **[F28]** App Store (Brasil), "MyFitnessPal". https://apps.apple.com/br/app/myfitnesspal-contador-calorias/id341232718
- **[F29]** MyFitnessPal Support, "A Message about MyFitnessPal's updated nutrition goals" (atualizado em 17/09/2026; texto integral lido pela API do Zendesk em 03/10/2026, porque a página devolve 403). https://support.myfitnesspal.com/hc/en-us/articles/360032626031-A-Message-about-MyFitnessPal-s-updated-nutrition-goals
- **[F30]** MyFitnessPal Support, "Your Today tab" (atualizado em 02/10/2026; lido pela API do Zendesk em 03/10/2026). https://support.myfitnesspal.com/hc/en-us/articles/39985611667341-Introducing-the-brand-new-Today-tab
- **[F31]** MyFitnessPal Support, "How to log food with your voice" (atualizado em 21/09/2026; lido pela API do Zendesk em 03/10/2026). https://support.myfitnesspal.com/hc/en-us/articles/30332897072269-Voice-Logging
- **[F32]** App Store (EUA), "Lose It! – Calorie Counter". https://apps.apple.com/us/app/lose-it-calorie-counter/id297368629
- **[F33]** YAZIO, site oficial. https://www.yazio.com/en
- **[F34]** App Store (Brasil), "YAZIO: Contador de Calorias". https://apps.apple.com/br/app/yazio-contador-de-calorias/id946099227
- **[F35]** YAZIO Help, "How does Yazio calculate my calorie goal?" (atualizado em 03/10/2026) e "How many calories can I eat if I want to lose weight?" (atualizado em 02/10/2026); texto integral lido pela API do Zendesk em 03/10/2026. https://help.yazio.com/hc/en-us/articles/4410156873233-How-does-Yazio-calculate-my-calorie-goal · https://help.yazio.com/hc/en-us/articles/360013795878-How-many-calories-can-I-eat-if-I-want-to-lose-weight
- **[F36]** YAZIO Help, "What is our 7-Day Free Trial Subscription?" (atualizado em 22/09/2026; lido pela API do Zendesk em 03/10/2026). https://help.yazio.com/hc/en-us/articles/4436727821073-What-is-our-7-Day-Free-Trial-Subscription
- **[F37]** Lifesum, "Features". https://lifesum.com/features/
- **[F38]** App Store (EUA), "Lifesum: AI Calorie Counter". https://apps.apple.com/us/app/lifesum-ai-calorie-counter/id286906691
- **[F39]** App Store (Brasil), "Lifesum" (compras e descrição relidas em 03/10/2026). https://apps.apple.com/br/app/lifesum-dieta-e-calorias/id286906691
- **[F40]** App Store (EUA), "Noom: Weight Loss & Health". https://apps.apple.com/us/app/noom-weight-loss-health/id634598719
- **[F41]** Noom Support, "How Noom's Food Color System Works" (out/2025; texto integral lido em 03/10/2026 com requisição de navegador comum, depois do 403 na leitura automática de 02/10). https://www.noom.com/support/faqs/using-the-app/logging-and-tracking/food-and-water/2025/10/how-nooms-food-color-system-works/
- **[F42]** Nutrola, site oficial. https://nutrola.app/
- **[F43]** App Store, "Nutrola – Nutrition Tracker" (trecho de busca em 02/10; página e compras lidas em 03/10/2026, ver [F83][F84]). https://apps.apple.com/app/nutrola-nutrition-tracker/id6752298588
- **[F44]** App Store (Brasil), "Tecnonutri: Encontre sua dieta" (versão 5.1.3, de 07/02/2024). https://apps.apple.com/br/app/tecnonutri-encontre-sua-dieta/id574794938
- **[F45]** App Store (Brasil), "FatSecret". https://apps.apple.com/br/app/fatsecret-contador-calorias/id347184248
- **[F46]** Fitia Help, "Free vs Premium Features". https://fitia.app/help/articles/free-vs-premium-fitia/
- **[F47]** Fitia, "All Fitia Features". https://fitia.app/features/
- **[F48]** App Store (Brasil), "Fitia". https://apps.apple.com/br/app/fitia-contar-calor%C3%ADas-dietas/id1448277011
- **[F49]** Lei nº 8.234, de 17/09/1991 (profissão de nutricionista), art. 3º. https://www2.camara.leg.br/legin/fed/lei/1991/lei-8234-17-setembro-1991-363145-publicacaooriginal-1-pl.html (art. 3º conferido em 03/10/2026 no texto do Planalto: https://www.planalto.gov.br/ccivil_03/leis/1989_1994/l8234.htm ; PDF do CFN: https://www.cfn.org.br/wp-content/uploads/2016/02/lei_n_8_234_91_1.pdf)
- **[F50]** Lei nº 13.709/2018 (LGPD). https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2018/lei/l13709.htm
- **[F51]** MyFitnessPal Support, "How does MyFitnessPal calculate my initial goals?" (atualizado em 29/09/2026; acesso 03/10/2026). https://support.myfitnesspal.com/hc/en-us/articles/360032625391-How-does-MyFitnessPal-calculate-my-initial-goals
- **[F52]** MyFitnessPal Support, "The difference between Free, Premium, and Premium +" (atualizado em 20/09/2026; acesso 03/10/2026). https://support.myfitnesspal.com/hc/en-us/articles/34889191368077-The-difference-between-Free-Premium-and-Premium
- **[F53]** MyFitnessPal Support, "Premium+" (atualizado em 20/09/2026; acesso 03/10/2026). https://support.myfitnesspal.com/hc/en-us/articles/34347930588557-Premium
- **[F54]** MyFitnessPal Support, "How to use the Meal Scanner" (atualizado em 16/09/2026; acesso 03/10/2026). https://support.myfitnesspal.com/hc/en-us/articles/360045761612-How-to-use-the-Meal-Scanner
- **[F55]** MyFitnessPal Support, "Getting started with Quick Add" (atualizado em 25/09/2026; acesso 03/10/2026). https://support.myfitnesspal.com/hc/en-us/articles/360032621971-Getting-started-with-Quick-Add
- **[F56]** MyFitnessPal Support, "What is included in the free version?" (atualizado em 06/09/2026; acesso 03/10/2026). https://support.myfitnesspal.com/hc/en-us/articles/15457546881805-What-is-included-in-the-free-version
- **[F57]** Lose It! Help, "How the Calorie Budget is Calculated" (atualizado em 04/08/2026; acesso 03/10/2026). https://loseit.zendesk.com/hc/en-us/articles/47497714327060-How-the-Calorie-Budget-is-Calculated
- **[F58]** Lose It! Help, "Low Budget Warning" (atualizado em 04/06/2026; acesso 03/10/2026). https://loseit.zendesk.com/hc/en-us/articles/47345064673556-Low-Budget-Warning
- **[F59]** Lose It! Help, "Unlocking the Barcode Scanner/Scan It" (atualizado em 01/04/2026; acesso 03/10/2026). https://loseit.zendesk.com/hc/en-us/articles/47773984823700-Unlocking-the-Barcode-Scanner-Scan-It
- **[F60]** Lose It! Help, "How to Log Food in Lose It!" (atualizado em 25/08/2026; acesso 03/10/2026). https://loseit.zendesk.com/hc/en-us/articles/49210381551380-How-to-Log-Food-in-Lose-It
- **[F61]** Lose It! Help, "How to Use Snap It" (atualizado em 04/08/2026; acesso 03/10/2026). https://loseit.zendesk.com/hc/en-us/articles/47771695186580-How-to-Use-Snap-It
- **[F62]** Lose It! Help, "Previous Meals" (atualizado em 04/08/2026; acesso 03/10/2026). https://loseit.zendesk.com/hc/en-us/articles/49209714942996-Previous-Meals
- **[F63]** Lose It! Help, "Lose It! Membership Tiers & Pricing" (atualizado em 09/09/2026; acesso 03/10/2026). https://loseit.zendesk.com/hc/en-us/articles/51906561286804-Lose-It-Membership-Tiers-Pricing
- **[F64]** Lose It! Help, "What is Lose It! Premium?" (atualizado em 04/08/2026; acesso 03/10/2026). https://loseit.zendesk.com/hc/en-us/articles/47345136549652-What-is-Lose-It-Premium
- **[F65]** Noom Support, "How Noom Sets Your Weight Loss Zone and Tracks Your Progress" (acesso 03/10/2026). https://www.noom.com/support/faqs/question-topics/food-logging/2019/12/how-do-i-view-or-change-my-weight-loss-zone-ios/
- **[F66]** Noom Support, "How to Use Dynamic Calorie Goals" (out/2025; acesso 03/10/2026). https://www.noom.com/support/faqs/using-the-app/logging-and-tracking/food-and-water/2025/10/how-to-use-dynamic-calorie-goals/
- **[F67]** Noom (blog oficial), "How much does Noom Weight cost in 2026 (and what do you get)?" (atualizado em 03/06/2026; acesso 03/10/2026). https://www.noom.com/blog/how-much-does-noom-cost/
- **[F68]** MacroFactor, "The Fat Loss Handbook" (PDF, nov/2025; acesso 03/10/2026), folha-resumo da p. 1. https://macrofactor.com/wp-content/uploads/2025/11/MacroFactor-Fat-Loss-Handbook.pdf
- **[F69]** MacroFactor Help, "What Are the Different Program Options in Coached Mode?" (acesso 03/10/2026). https://help.macrofactorapp.com/en/articles/34-what-are-the-different-program-options-in-coached-mode
- **[F70]** MacroFactor Help, "How Does MacroFactor Make Adjustments For a Weight Gain or Weight Loss Goal?" (acesso 03/10/2026). https://help.macrofactorapp.com/en/articles/222-how-does-macrofactor-make-adjustments-for-a-weight-gain-or-weight-loss-goal
- **[F71]** Carbon Help, "How to Create your Initial goal" (acesso 03/10/2026). https://help.joincarbon.com/en/articles/6040890-how-to-create-your-initial-goal
- **[F72]** Carbon Help, "How Carbon Sets and Adjusts Your Macros" (acesso 03/10/2026). https://help.joincarbon.com/en/articles/14005628-how-carbon-sets-and-adjusts-your-macros
- **[F73]** Carbon Help, "Why Are My Carbon Calorie Targets So High or So Low?" (acesso 03/10/2026). https://help.joincarbon.com/en/articles/15826058-why-are-my-carbon-calorie-targets-so-high-or-so-low
- **[F74]** Carbon Help, "Does Carbon Offer Meal Plans?" (acesso 03/10/2026). https://help.joincarbon.com/en/articles/6044935-does-carbon-offer-meal-plans
- **[F75]** Carbon Help, "Log Meals Faster with Carbon's Smart Logger" (acesso 03/10/2026). https://help.joincarbon.com/en/articles/16182813-log-meals-faster-with-carbon-s-smart-logger
- **[F76]** Carbon Help, "Using the Label Scanner" (acesso 03/10/2026). https://help.joincarbon.com/en/articles/9573869-using-the-label-scanner
- **[F77]** Carbon Help, "Copying Meals" (acesso 03/10/2026). https://help.joincarbon.com/en/articles/6004825-copying-meals
- **[F78]** Carbon Help, "Quick Add" (acesso 03/10/2026). https://help.joincarbon.com/en/articles/6004822-quick-add
- **[F79]** Carbon Help, "Upgrading, downgrading, and canceling Your subscription" (acesso 03/10/2026). https://help.joincarbon.com/en/articles/6004862-upgrading-downgrading-and-canceling-your-subscription
- **[F80]** App Store (Brasil), "Carbon - Macro Coach & Tracker", compras dentro do app (acesso 03/10/2026). https://apps.apple.com/br/app/id1437820611
- **[F81]** App Store (Brasil), "Lose It!", compras dentro do app (acesso 03/10/2026). https://apps.apple.com/br/app/id297368629
- **[F82]** App Store (Brasil), "Noom", compras dentro do app (acesso 03/10/2026). https://apps.apple.com/br/app/id634598719
- **[F83]** App Store (Brasil), "Nutrola: Contador Calorias IA", descrição e compras dentro do app (acesso 03/10/2026). https://apps.apple.com/br/app/id6752298588
- **[F84]** App Store (EUA), "Nutrola: AI Calorie Counter", descrição e compras dentro do app (acesso 03/10/2026). https://apps.apple.com/us/app/id6752298588
- **[F85]** Lifesum Help, "What do I get when I buy Premium?" (atualizado em 28/05/2026; acesso 03/10/2026). https://help.lifesum.com/en/article/what-do-i-get-when-i-buy-premium-1vzq8pz/
- **[F86]** Lifesum Help, "AI Tracking - How does it work?" (acesso 03/10/2026). https://help.lifesum.com/en/article/ai-tracking-how-does-it-work-15sw7rk/
- **[F87]** Lifesum Help, "Traditional Food Tracking" (acesso 03/10/2026). https://help.lifesum.com/en/article/traditional-food-tracking-4nzcd7/
- **[F88]** Lifesum Help, "Lifesum's Food Database" (atualizado em 12/11/2025; acesso 03/10/2026). https://help.lifesum.com/en/article/lifesums-food-database-1twvves/
- **[F89]** Fitia Help, "Is There a Free Trial for Premium?" (acesso 03/10/2026). https://fitia.app/help/articles/is-there-a-free-trial-for-fitia-premium/
- **[F90]** App Store (EUA), "Calorie Counter by fatsecret", descrição (acesso 03/10/2026 pela API de consulta do iTunes). https://apps.apple.com/us/app/id347184248
- **[F91]** fatsecret Brasil, "Calorias em Feijão Carioca Cozido" (acesso 03/10/2026). https://www.fatsecret.com.br/calorias-nutri%C3%A7%C3%A3o/gen%C3%A9rico/feij%C3%A3o-carioca-cozido
- **[F92]** fatsecret, página "fatsecret premium" (só trecho de busca; a página devolveu 403 a leitura automática e direta em 03/10/2026). https://fatsecret.com/premium
- **[F93]** MyFitnessPal Support, "How to upgrade to MyFitnessPal Premium" (atualizado em 31/08/2026; acesso 03/10/2026). https://support.myfitnesspal.com/hc/en-us/articles/360032625771-How-to-upgrade-to-MyFitnessPal-Premium
- **[F94]** YAZIO Help, "What is the AI Calorie Tracking Feature, and how does it work?" (atualizado em 30/09/2026; acesso 03/10/2026). https://help.yazio.com/hc/en-us/articles/39137901903889-What-is-the-AI-Calorie-Tracking-Feature-and-how-does-it-work
- **[F95]** YAZIO Help, "How do I copy Diary entries to another day?" (atualizado em 01/10/2026; acesso 03/10/2026). https://help.yazio.com/hc/en-us/articles/360002401437-How-do-I-copy-Diary-entries-to-another-day
- **[F96]** YAZIO Help, "How does Yazio Pro support my goals?" (atualizado em 02/10/2026; acesso 03/10/2026). https://help.yazio.com/hc/en-us/articles/208847005-How-does-Yazio-Pro-support-my-goals
- **[F97]** YAZIO Help, "Can I log my meal calories without individual ingredients?" (atualizado em 30/09/2026; acesso 03/10/2026). https://help.yazio.com/hc/en-us/articles/360000530018-Can-I-log-my-meal-calories-without-individual-ingredients
- **[F98]** YAZIO Help, "How can I change the app language or food database?" (atualizado em 29/09/2026; acesso 03/10/2026). https://help.yazio.com/hc/en-us/articles/208126989-How-can-I-change-the-app-language-or-food-database
- **[F99]** Lose It! Help, "Understanding Goal and Streak Projection Dates" (atualizado em 18/07/2026; acesso 03/10/2026). https://loseit.zendesk.com/hc/en-us/articles/51382148864532-Understanding-Goal-and-Streak-Projection-Dates
- **[F100]** MacroFactor, "Version 5.5.7 Release Notes" (10/05/2026; acesso 03/10/2026). https://macrofactor.com/version-5-5-7/
- **[F101]** Carbon Help, "Progress and nutrition graphs" (03/05/2024; acesso 03/10/2026). https://help.joincarbon.com/en/articles/6029851-progress-and-nutrition-graphs
- **[F102]** Carbon Help, "Coach Trend Weight" (30/01/2025; acesso 03/10/2026). https://help.joincarbon.com/en/articles/6078877-coach-trend-weight

### Secundárias

- **[S1]** Droid Life, "MyFitnessPal Puts Barcode Scanner Behind Premium Paywall", 24/08/2022. https://www.droid-life.com/2022/08/24/myfitnesspal-puts-barcode-scanner-behind-premium-paywall/
- **[S2]** Pocket-lint, "MyFitnessPal put its popular barcode scanner feature behind a paywall". https://www.pocket-lint.com/apps/news/162386-wow-myfitnesspal-put-its-popular-barcode-scanner-feature-behind-a-paywall/
- **[S3]** PiunikaWeb, "Cal AI removed from App Store reportedly after viral payment sheet post [U: It's back]", 16/04/2026. https://piunikaweb.com/2026/04/16/cal-ai-removed-from-app-store-viral-payment-sheet-post/
- **[S4]** MWM, "Apple Executes Compliance Pull on Cal AI…" e Paddle, "What Cal AI really taught us about App2Web" (trechos de busca). https://mwm.ai/articles/apple-executes-compliance-pull-on-cal-ai-calorie-tracker-over-deceptive-billing-april-2026 · https://www.paddle.com/blog/what-cal-ai-taught-us-about-app2web
- **[S5]** ScreensDesign, "Cal AI – Calorie Tracker UI Breakdown". https://screensdesign.com/showcase/cal-ai-calorie-tracker
- **[S6]** RevenueCat, "Inside Noom's Web-to-App Onboarding Funnel: UX Teardown + Key Takeaways". https://www.revenuecat.com/blog/growth/web-to-app-onboarding-funnel
- **[S7]** The Behavioral Scientist, "Noom Product Critique: Onboarding". https://www.thebehavioralscientist.com/articles/noom-product-critique-onboarding
- **[S9]** ScreensDesign, "App Showcase: AI Calorie Tracker by Yazio". https://screensdesign.com/showcase/yazio-calorie-counter-diet
- **[S10]** Elegibilidade do Noom Med (18+, IMC, exclusão de TA, gestação), compilada de páginas de terceiros (CareFirst e outros; trecho de busca). https://www.carefirst.com/fedhmo/plan-information/noom-med-enhanced-weight-management-support.html
- **[S11]** "Lose It! Badges" (página de fã). http://www.mickeyhill.com/loseit/
- **[S12]** (o cálculo e o preço do Lose It! agora vêm de [F57][F58][F63]; o fator "1,45" desta fonte não se confirmou.) Preço e cálculo do Lose It! em agregadores (subger.com; nutriscan.app, que é concorrente) e tutorial "Set Your Personalized Weight Loss Plan" (trecho de busca). https://subger.com/en/service/loseit-premium · https://loseit.zendesk.com/hc/en-us/p/tutorial
- **[S13]** DesignRush, "Gorgeous App Design Inspiration: Lifesum". https://www.designrush.com/best-designs/apps/lifesum
- **[S14]** The Shorty Awards, "Lifesum, first digital health app to create and launch a health widget for iOS 14". https://shortyawards.com/13th/lifesum-draft
- **[S15]** Estado de Minas, "Nutricionistas ficam proibidos de usar IA para simular resultados e imagens", abr/2026. http://www.em.com.br/bem-viver/2026/04/7408427-nutricionistas-ficam-proibidos-de-usar-ia-para-simular-resultados-e-imagens.html
- **[S16]** Itatiaia, "Conselho Federal de Nutrição publica novas regras sobre uso de IA e redes sociais", abr/2026. https://www.itatiaia.com.br/saude/conselho-federal-de-nutricao-publica-novas-regras-sobre-uso-de-ia-e-redes-sociais/
- **[S17]** Tecnoblog, "5 apps que ajudam a fazer reeducação alimentar" (Dieta e Saúde, método de pontos; trecho de busca). https://tecnoblog.net/guias/5-apps-que-ajudam-a-fazer-reeducacao-alimentar/
- **[S18]** PiunikaWeb, "MyFitnessPal users complain new Today tab update makes the app harder to use", 24/04/2026. https://piunikaweb.com/2026/04/24/myfitnesspal-new-update-complaints/
- **[S20]** TrackerBenchmark, "Nutrola Review (2026)" (as alegações de precisão do Nutrola vêm do próprio fabricante). https://trackerbenchmark.com/reviews/nutrola/
- **[S21]** PaywallPro e eesel.ai sobre os preços em A/B e o teste do Cal AI (trechos de busca). https://www.paywallpro.app/apps/cal-ai-app · https://www.eesel.ai/blog/cal-ai-pricing
- **[S-acq]** The Next Web, "MyFitnessPal acquires Cal AI…" (integração ao banco do MyFitnessPal). https://thenextweb.com/news/myfitnesspal-acquires-cal-ai-the-viral-calorie-tracking-app-built-by-teens
- **[S-noom]** (substituída por [F67] na revisão de 03/10/2026, que corrigiu a duração das lições para 5–15 min.) Reviews do programa Noom (lições de 3–5 min com quiz, base em TCC, coach 1–2×/semana; trechos de busca), por exemplo Bento Bunny. https://www.bentobunny.app/reviews/noom-review
- **[S-tecno]** (substituída por [F44] na revisão de 03/10/2026.) Senhor Tanquinho, "Tecnonutri funciona?" (pontos por registro). https://www.senhortanquinho.com/tecnonutri-aplicativo-celular-low-carb-cetogenica/
- **[S-taco]** Apps brasileiros de consulta à TACO na App Store ("Macros da Tabela Taco", "Taco App: Tabela Nutricional"). Classificados como secundários porque não são objeto da pesquisa. https://apps.apple.com/br/app/tabela-de-alimentos-taco/id1462182870 · https://apps.apple.com/br/app/taco-app-tabela-nutricional/id1509943403
- **[S-mf]** (substituída por [F68] na revisão de 03/10/2026, que leu o handbook oficial.)
- **[S-mfp-ed]** The Mental Elf, "MyFitnessPal, eating disorders…" (relatos de usuários). https://www.nationalelfservice.net/mental-health/eating-disorders/myfitnesspal-eating-disorders/

---

## Lacunas restantes (revisão de 03/10/2026)

O que continua sem fonte primária e o que foi tentado:

| Lacuna | O que se tentou |
|---|---|
| **Número de telas do onboarding** de MacroFactor, MyFitnessPal, Lifesum e Lose It! | Centrais de ajuda (MacroFactor e Carbon por Intercom; MyFitnessPal e Lose It! pela API do Zendesk; Lifesum pelo Crisp). Nenhuma conta telas; só o Carbon documenta os passos [F71]. Contar exige instalar o app ou um teardown (ScreensDesign não tem MacroFactor nem MyFitnessPal). |
| **Paywall e teste do Lifesum** | Central do Lifesum (categoria "Subscriptions & Purchases"): nenhum artigo descreve teste. Os termos falam em "trial subscription" só por trecho de busca; lifesum.com/terms carrega por JavaScript e não pôde ser lido. |
| **Teste grátis de Tecnonutri, FatSecret e Nutrola** e do Premium do MyFitnessPal | App Store (descrição e compras, BR e EUA): nenhuma cita prazo de teste; a do Tecnonutri diz só "experimentar sem compromisso" [F44]. Página fatsecret.com/premium devolve 403 (Cloudflare) a WebFetch e a curl. No MyFitnessPal, o passo a passo do upgrade não cita teste [F93], mas isso não prova que não exista. |
| **Teste do Carbon** | Central do Carbon (artigos de assinatura e de erros de compra) e página de preços: nenhum cita teste. |
| **Voz e "repetir refeição" do Cal AI**; banco brasileiro do Cal AI | Site oficial e FAQ [F24], App Store BR e EUA. O site cita "descreva sua refeição", sem voz. O Google Play com "Cal AI" no nome (com.caloriesense.ai) é outro desenvolvedor e foi descartado. |
| **Voz no Yazio** | API da central do Yazio, buscas por "voice" e "AI": nenhum artigo. |
| **"Calorias rápidas" no Lose It!, Fitia, Nutrola e FatSecret**; "repetir refeição" no Fitia, Nutrola e FatSecret | Buscas na central do Lose It! (API do Zendesk), descrição das lojas e central do Fitia (fitia.app/help devolveu 429 no sitemap). |
| **Voz do FatSecret** | Só trecho de busca da página Premium ("Smart Assistant" para ditar ou digitar) [F92]; a página bloqueia leitura. |
| **Banco brasileiro do Carbon**; uso da TACO pelo FatSecret e pelo Tecnonutri | O FatSecret tem banco brasileiro, mas a página do alimento só cita "fatsecret Platform API" [F91]. O Tecnonutri não declara a fonte na loja [F44]. A central do Carbon não fala de país do banco. |
| **Cal AI: adaptação da meta** | Site, FAQ e App Store não descrevem ajuste semanal. |
| **Nutrola: onboarding, adaptação, retenção e design** | Loja BR e EUA [F83][F84]: só "responda algumas perguntas sobre sua rotina e receba seu plano". O site nutrola.app é do próprio concorrente que escreve reviews dos outros. |
| **Dieta e Saúde** (onboarding, preço, design) | Busca na App Store BR (não aparece em 03/10/2026) e domínio dietaesaude.com.br (não respondeu). O que existe vem de imprensa de 2012–2019 [S17]. |
| **Fontes secundárias com trecho de busca** [S10][S17] | Mantidas como secundárias; nenhum fato central depende só delas. |
