# Apps de musculação e de dados de saúde: o que fazem para quem treina sem personal

Status: concluído em 03/10/2026; lacunas restantes: 20 (ver seção 11). Apps cobertos: Fitbod, Hevy, Strong, JEFIT, Future, Ladder, Caliber, SensAI, WHOOP, Oura (Zepp Coach em `zepp-coach.md`). A síntese com a nutrição está em `apps-praticante-sintese.md`.

> Pesquisa feita em 02/10/2026 para decisões de produto do Eleva Pro, com foco no Praticante (ADR-0028). Fontes primárias (site oficial, central de ajuda, blog do próprio app, App Store, entrevista com fundador) aparecem como **[Fn]**. Fontes secundárias (imprensa, reviews, bancos de telas) aparecem como **[Sn]** e nunca sustentam sozinhas um fato central. Onde nenhuma fonte primária confirma, está escrito **não confirmado**.
>
> Ressalvas de método:
> - As centrais de ajuda do Fitbod e do Hevy, e todo o domínio do WHOOP, responderam 403 à leitura direta. Quando um fato veio só do trecho que o buscador mostrou dessas páginas, a referência traz "(trecho de busca)".
> - Revisão de 03/10/2026: as centrais do Fitbod e do Hevy foram lidas pela API pública do Zendesk (`/api/v2/help_center/en-us/articles/<id>.json`), e as do Oura e do Strong abriram direto. O WHOOP (site, blog e suporte) continua bloqueado por Cloudflare e por renderização no cliente; os fatos dele foram reconfirmados, quando possível, pelas descrições da App Store e do Google Play e pelo comunicado na Business Wire.
> - Preços são da App Store dos EUA e do Brasil lidas em 02/10/2026, salvo indicação. A App Store lista às vezes dois preços para o mesmo plano (teste A/B, preço antigo ou região), e eles aparecem como faixa.
> - "Pede cartão no teste" em app de loja quer dizer "pede para assinar pela App Store/Play". A loja guarda o meio de pagamento, e a cobrança só vem no fim do teste. Só Ladder e SensAI dizem explicitamente que não cobram nem pedem pagamento.
> - Zepp Coach não é repetido aqui: ver [`zepp-coach.md`](zepp-coach.md).

---

## 1. Resumo: os 10 achados mais úteis

1. **Progressão sem chat é regra simples e publicada.** O Hevy Trainer sobe a carga quando a pessoa bate o topo da faixa de repetições em todas as séries; se não bate, a página promete só "lembretes para forçar quando a progressão empaca", sem regra de redução publicada. O próprio Hevy diz que o programa sai de um algoritmo e não de IA [F13][F14]. O Fitbod estima o 1RM por fórmula (Epley) e semeia a carga de exercício novo com dados agregados de usuários parecidos [F1].
2. **A recuperação por músculo é o "motor visível" do Fitbod.** Cada grupo muscular tem uma porcentagem de 0 a 100%, chega a 100% em até 7 dias e aparece num mapa de calor. A escolha dos exercícios prioriza os músculos mais recuperados, e a pessoa pode corrigir a porcentagem à mão [F1][F2][F4].
3. **Dia perdido não gera dívida.** O Fitbod "recalibra" os próximos treinos sem pedir reposição [F3] e reduz a carga sugerida depois de uma pausa [F4]. O JEFIT organiza o plano em blocos de 4 semanas que terminam em deload com metade do volume [F25].
4. **No registro, o que reduz atrito é igual em todos:** valor anterior ao lado da série, timer de descanso que dispara sozinho ao concluir a série (padrão de 2:00 no Strong), timer na tela bloqueada (Live Activity ou Dynamic Island) e relógio [F18][F23][F20][F31]. A diferença está no detalhe. O Hevy avisa o recorde pessoal na hora [F10], e o Ladder conduz o ritmo por áudio no fone [F29][F30].
5. **Existem dois modelos de preço opostos, e os dois funcionam.** O Fitbod dá 7 dias de teste, exige escolher o plano na loja para começar e, sem assinatura, não deixa registrar treino novo [F8]. O Hevy e o Strong deixam o registro ilimitado de graça para sempre e cobram por rotinas, histórico e gráficos [F15][F22]. O Hevy chegou a 2 milhões de downloads com US$ 15 mil em anúncio, cobrando menos que os concorrentes [F19].
6. **No Brasil o Hevy custa R$ 12,90/mês, o Strong de R$ 12,90 a R$ 18,90, o Fitbod de R$ 29,90 a R$ 69,90 e o JEFIT R$ 64,90/mês** [F12][F55][F7][F54]. O Starter de R$ 19 e o Pro de R$ 39 do Eleva ficam entre os dois. A comparação com o Fitbod é a que favorece.
7. **Teste sem cartão é argumento de venda explícito** no Ladder ("NO PAYMENT collected during trial") e no SensAI [F29][F33]. O WHOOP faz o contrário: o teste de 1 mês [F57] vira anuidade automática, e a devolução fora do prazo custa taxa [F38 (trecho de busca)].
8. **O streak que retém é semanal e perdoa.** O streak do Hevy conta semanas com pelo menos um treino. Registrar depois um treino da semana esquecida recupera a sequência [F17]. O Oura tem "Modo Descanso", que pausa metas e pontuação de atividade quando a pessoa está doente ou machucada [F47].
9. **Score diário funciona quando vira uma cor e uma ação.** O WHOOP usa Recuperação de 1 a 99% em verde, amarelo ou vermelho: "no verde, você está pronto para esforço; no amarelo ou vermelho, talvez queira reavaliar o treino" [F57]. Os cortes 67–99 / 34–66 / 1–33% vêm só de trecho de busca [F35 (trecho de busca)]. O Oura usa Prontidão 0–100, com coroa a partir de 85 [F43]. O redesenho do Oura de 2025 passou a abrir o app pela "uma coisa importante" do dia [F45], a mesma direção do ADR-0033.
10. **Retrospectiva e relatório compartilhável são padrão.** O Hevy tem relatório mensal e retrospectiva anual em cartões para Instagram [F16][F10]. Oura e WHOOP têm "Year in Review" com elegibilidade mínima de 60 noites ou recuperações [F48][F40]. O Fitbod manda o relatório semanal às segundas [F4]. Do outro lado, a Future cancelou em junho de 2026 o coach por IA gratuito para voltar ao treinador humano [S1].

---

## 2. Onboarding

| App | Passos e perguntas | Quando mostra o plano | Paywall e teste |
|---|---|---|---|
| **Fitbod** | Objetivo, experiência, equipamento e divisão de treino [F3]. Os bancos de telas contam 14 [S11] e 15 passos [S4]; a escolha de equipamento é detalhada por máquina, e a projeção de ganho de força aparece antes do cadastro [S11]. | O primeiro treino sai pronto, com o mapa de recuperação [F3]. Logo antes do paywall, uma projeção de 3 meses montada a partir das respostas [S3]. | Os bancos de telas divergem: 2 telas de paywall logo depois do onboarding [S4], ou o 1º paywall depois que o primeiro treino é gerado e antes de começá-lo (anual com "50%" de desconto e mensal), e um 2º depois do resumo do treino, com projeção de 90 dias [S11]. Teste de 7 dias que exige escolher um plano mensal ou anual pela loja; vira assinatura paga se não for cancelado até 24 h antes do fim [F8]. Os "3 treinos grátis" aparecem só em reviews de 2026 e não estão mais na central de ajuda [S7]. |
| **Hevy** | Registro sem avaliação obrigatória [S6]. Os bancos de telas contam 26 [S5] e 10 passos [S11]; a diferença deve ser o que cada um conta como passo. O Hevy Trainer pergunta experiência, objetivo, equipamento, frequência, duração e foco muscular [F13]. | O registro livre funciona de imediato; o Trainer é Pro [F13]. | Paywall logo depois do cadastro, com mensal, anual ("economize 33%") e vitalício, depoimentos e tabela de recursos [S5][S11]. Duração do teste Pro **não confirmada** em fonte primária: nem a central de ajuda nem a loja citam teste [F15][F12], e o banco de telas registra "sem teste grátis" [S11]. |
| **Strong** | Quase nenhum: o app abre direto no registro. O slogan é "Think less. Lift more" [F21]. O banco de telas conta 2 passos [S11]. | Não gera plano [F21]. | Grátis para sempre com 3 rotinas; PRO desbloqueia o resto [F20][F22]. |
| **JEFIT** | O Adaptive Plan diz "configuração em 2 minutos" [F25]: objetivo, nível, dias por semana, equipamento e lesões [F24]. | Gera um mesociclo completo [F25]. | Elite pago; o grátis tem anúncios [S6]. Teste de 7 dias para novos assinantes Elite [F54]. |
| **Future** | Questionário "Find Your Coach" de 1 minuto: agenda, equipamento, experiência, lesões, objetivos [F26]. | Um treinador humano monta o plano [F26]. | US$ 50 no 1º mês e depois US$ 199/mês, com reembolso em 30 dias [F26]. |
| **Ladder** | Quiz que escolhe a "equipe", ou seja, o treinador e o estilo, pelos objetivos e estilos preferidos [F30]. O banco de telas conta 4 passos, com filtro por objetivo e equipamento [S11]. | Plano semanal do treinador, com nova semana publicada domingo às 9h [F29]. | 7 dias grátis "sem pagamento coletado durante o teste" [F29]. A oferta aparece no onboarding com uma linha do tempo do que acontece no teste, em vez de preço em destaque [S11]. |
| **Caliber** | Avaliação inicial no plano com coach [F27]. | O plano Plus dá acesso a 120+ planos prontos [F27]. | O app grátis registra treinos ilimitados [F27]. |
| **SensAI** | Experiência, objetivos, equipamento, agenda, duração, dias, dores e lesões [S6]; a primária só lista "metas, agenda e equipamento" [F31]. | Gera o programa do zero [F33]. | 7 dias com acesso total e sem cartão [F33]. |
| **WHOOP** | Exige o aparelho. | A Recuperação aparece depois da 1ª noite; a avaliação semanal, depois de 7 recuperações [F42 (trecho de busca)]. | 30 dias com o aparelho, convertendo em anuidade Peak de US$ 239; devolução fora do prazo tem taxa de US$ 110 [F38 (trecho de busca)]. |
| **Oura** | Exige o anel. | Os scores começam na 1ª noite; o equilíbrio usa média de 14 dias contra 2 meses [F43]. | 1 mês de assinatura grátis que começa ao parear o anel e não pode ser pausado. Sem assinatura ficam as três notas diárias (Prontidão, Atividade e Sono), bateria, perfil e conteúdo Explore [F46]. |

**Padrões:**
- **Perguntas que todos fazem:** objetivo, experiência, equipamento, dias por semana e duração. Lesão aparece em JEFIT, Future, SensAI e Hevy Trainer [F25][F26][F13].
- **"Valor antes do paywall":** o Fitbod mostra o que você vai ganhar antes de cobrar [S3]. A RevenueCat (secundária) registra que onboardings longos, de 45 a 50 telas em apps como o Me+, aumentaram a taxa de início de teste [S3].
- **Equipamento:** o Fitbod lista tudo marcado e a pessoa desmarca o que não tem. Mudar a lista muda os treinos na hora [F3].

---

## 3. Geração e adaptação do treino sem chat

### 3.1 Fitbod: o mais completo sem chat
- **Duas peças:** o *Exercise Selector* escolhe o exercício; o *Capability Recommender* escolhe séries, repetições e carga [F1].
- **Recuperação muscular:** 0–100% por grupo, calculada pelo volume e intensidade das séries e pelos dias de descanso. "Músculo treinado precisa de 48–72 h" e chega a 100% em até 7 dias [F1][F2]. Atividade de Apple Health, Health Connect, Fitbit e Strava também fadiga os músculos [F1][F2]. O próprio Fitbod diz: "não existe número mágico" na porcentagem [F2].
- **Carga:** 1RM dinâmico por equação de predição (Epley). Exercício novo começa com a carga de usuários de perfil parecido [F1].
- **Faixas por objetivo:** força com 1–6 repetições a ~85–100% do 1RM e 3–5 min de descanso; hipertrofia com 6–12 repetições e 10–20 séries por músculo por semana [F1].
- **Escolha de exercício:** pontua 800+ exercícios por recuperação, objetivo e nível, histórico de preferência, divisão (Push/Pull/Legs ou focada em recuperação) e equipamento. Iniciante recebe progressões adequadas; avançado não fica preso a máquinas [F1].
- **"Max Effort Day":** de tempos em tempos, 1 ou 2 exercícios pedem o máximo de repetições na última série. Isso dá ao algoritmo um sinal direto para recalibrar o 1RM [F1].
- **Dia perdido e pausa:** recalibra sem reposição [F3]; reduz carga depois de pausa e sinaliza platô com volume estagnado ou 1RM parado [F4].
- **Troca:** "Recomendar menos" e "Nunca mais" ensinam o algoritmo [F3][F5].

### 3.2 Hevy Trainer: regra de dupla progressão
- O programa é gerado por "um algoritmo sofisticado", não por IA: "nossos programas são gerados por um algoritmo e não dependem de IA" [F13][F14]. O questionário tem 11 itens e termina com um aviso de saúde que a pessoa precisa aceitar [F14].
- **Regra publicada:** a carga sobe quando a pessoa bate "o topo da faixa de repetições com a carga em todas as séries prescritas" [F13]. Quando não bate, a primária fala só em "ajustes automáticos de carga pelo desempenho" e "lembretes para forçar quando a progressão empaca" [F13]; nem a página nem a central de ajuda descrevem redução ou deload [F14]. Redução de carga: **não confirmada**. O Trainer tem ainda um relatório de progresso exclusivo [F14].
- Troca de exercício permanente ou só na sessão; lesões ajustam o programa; três modos de variedade (blocos focados, contínuo ou com variação semanal) [F13].
- Recurso Pro [F13].

### 3.3 JEFIT Adaptive Plan: periodização em blocos
- Mesociclo de 4 semanas que se repete: **On-Ramp** (achar a carga), **Acumulação** (carga sobe e repetições caem), **Intensificação** (semana mais pesada, perto da falha) e **Deload** (metade do volume) [F25].
- "Progress Index Engine" avalia toda semana força, volume e equilíbrio de movimentos, ponderados pelo objetivo, e decide se avança ou faz uma "semana ponte" [F25].
- Em 2026 a periodização passou a valer para planos montados pela própria pessoa, e há preferência de "cardio finisher" [F24][S6].

### 3.4 Ladder e Future: humano no lugar do algoritmo
- **Ladder:** o treinador publica um programa novo de 7 dias para a equipe inteira, com sobrecarga progressiva [F29][F30]. A personalização individual que a loja documenta é pequena: o app estima o 1RM, avisa quando a pessoa parece estar em platô num movimento (alerta que pode ser silenciado, desde a versão 4.10.1) e permite trocar o exercício [F29][F60]. Prescrição de carga por pessoa continua **não confirmada**; o treinador ajusta o plano da equipe pelo retorno no chat [F29].
- **Future:** um treinador humano escreve e ajusta o plano toda semana [F26]. Em fevereiro de 2026 a empresa abriu um beta gratuito com IA. Em junho escreveu à lista de espera que "decidimos não seguir com o lançamento" e que vai apostar nos treinadores [S1]. A matéria cita o relatório Les Mills 2026: só 10% dos consumidores preferem orientação de IA a um treinador humano [S1].

### 3.5 SensAI: adaptação por prontidão, mas com chat no centro
- Regenera o treino toda semana usando tendência de VFC, sono, desvio da FC de repouso, carga recente e a sensação que a pessoa relata [F33].
- Cuidado declarado: "uma leitura baixa isolada deve levar a checar o contexto, não a uma conclusão automática" [F33].
- "Smart Swap" e "Smart Modify" trocam e ajustam o treino no meio da sessão em linguagem natural [F31]. Aqui o chat é a interface principal, que é o oposto do que o Eleva quer.

### 3.6 WHOOP e Oura: dizem quanto, não o quê
- **WHOOP:** Strain de 0 a 21, que mede esforço cardiovascular e muscular, e o **Strain Target** recomenda a faixa ideal do dia a partir da Recuperação [F57]. A escala logarítmica inspirada em Borg e a atualização ao longo do dia vêm de trecho de busca [F36 (trecho de busca)][F34]. O **Strength Trainer** soma carga muscular ao Strain, que passa a medir esforço "cardiovascular e muscular" [F57][F59]. A conta usa exercício, repetições e carga mais acelerômetro e giroscópio, com perfil por exercício, desde abril de 2023 [S9]. Em fevereiro de 2026 a IA do WHOOP passou a montar treinos de força com séries, faixas de repetição e carga sugerida pelo histórico, e a baixar a intensidade em dia de recuperação ruim [S10][F39 (trecho de busca)].
- **Oura:** Prontidão de 0 a 100 com faixas Ótimo (85–100), Bom (70–84), Regular (60–69) e Atenção (0–59). Os contribuintes de equilíbrio usam média ponderada de 14 dias contra a média de 2 meses [F43]. O **Modo Descanso** desliga a meta de atividade, a nota de Atividade e todos os contribuintes de atividade, e ajusta as mensagens de Prontidão e Sono para priorizar recuperação. Ao desligar, as métricas voltam ao normal aos poucos, por um período igual ao do descanso ou de até 7 dias. O Oura sugere ligá-lo quando a temperatura sobe muito, descontando a variação do ciclo menstrual [F47].

---

## 4. Registro do treino com pouco atrito

| Recurso | Fitbod | Hevy | Strong | JEFIT | SensAI | Ladder |
|---|---|---|---|---|---|---|
| Valor anterior ao lado da série | Carga e repetições prescritas [F1] | Sim, coluna PREVIOUS; a pessoa escolhe entre "Any workout" e "Same routine" [F18][F51] | Coluna anterior (**não confirmado** em primária; nem a central de ajuda nem a App Store descrevem) | Carga e repetições sugeridas por IA [F24] | Planejado × feito [F33] | Registro de repetições e carga [F30] |
| Timer de descanso automático | Sim [F9] | Sim, ao concluir a série [F10] | Sim, padrão de 2:00 que dispara ao concluir; tempo diferente para aquecimento e série válida [F23] | Sim [F24] | Sim [F31] | Ritmo conduzido por áudio [F30] |
| Tela bloqueada / Dynamic Island | Live Activity na tela bloqueada e no Dynamic Island com exercício atual, timer, duração e progresso de séries; widget da tela inicial com treinos da semana × meta [F61] | Live Activity no iOS e widget na tela bloqueada do Android: próxima atividade, séries feitas, carga e repetições prescritas, duração; conclui a série e ajusta o timer em ±15 s sem desbloquear [F18][F52] | Live Activity e Dynamic Island (versão 6.5.0) [F20] | Contagem de séries e timer na tela bloqueada, e widget que abre o treino do dia [F24] | Tela bloqueada e Dynamic Island; ao fim do descanso leva à próxima série [F31] | **não confirmado** (a loja não cita) |
| Relógio | Apple Watch registra séries, ajusta carga e repetições, mostra timer com vibração e som e FC ao vivo; iniciar, trocar exercício e salvar exigem o iPhone, e sem Always On o timer pausa quando a tela apaga. No Wear OS, a série registrada no relógio **não** dispara o timer, e o treino só é salvo pelo celular [F9] | Apple Watch e Wear OS com sincronização ao vivo e complicações [F11][F18] | App independente no Apple Watch [F20] | Apple Watch com sincronização ao vivo [F24] | Apple Watch, Coroa Digital e botão Action do Ultra [F31] | Apple Watch [F29] |
| PSE / RIR | RIR de 0 a 4+ pedido depois de cada exercício (no fim do grupo em superset); RIR alto repetido sobe carga ou repetições [F4][F62] | RPE [F10] | RPE [F21] | **não confirmado** | Sensação relatada [F33] | **não confirmado** (a loja não cita) |
| Recorde ao vivo | Registro de recordes após o treino [F5] | Faixa (banner) ao marcar a série com PR: 1RM, maior carga, volume da série, repetições, duração; liga e desliga nas preferências [F10][F53] | Recordes e 1RM [F20] | 1RM automático; cartões de compartilhar com marcos e recordes de 1RM [F24] | **não confirmado** (a loja não cita recorde) | Alertas de PR [F30] |
| Atalhos | — | Calculadora de aquecimento e de anilhas; tipos de série (aquecimento, drop, falha, superset) [F10][F11] | Calculadoras de aquecimento e de anilhas (PRO) [F22] | Supersets [F24] | Troca em linguagem natural [F31] | Áudio no fone [F30] |

**Observações:**
- O Strong separa o timer de aquecimento do timer de série válida [F23]. Para o iniciante, é a mesma ideia de "o app decide por você".
- No Strong, o histórico **nunca** fica preso atrás do PRO: "você nunca será impedido de usar a versão gratuita para registrar treinos" [F22]. No Hevy grátis, os gráficos mostram só 3 meses [S6]. A primária do Hevy confirma: 4 rotinas, 7 exercícios próprios e 3 meses de histórico no grátis; Pro libera tudo, contagem de séries por músculo, calculadora de aquecimento e o Trainer [F15].

---

## 5. Monetização

| App | Preço EUA (App Store, 02/10/2026) | Preço Brasil | Teste | O que fica grátis | Onde aparece o paywall |
|---|---|---|---|---|---|
| **Fitbod** | US$ 12,99–15,99/mês; US$ 79,99–95,99/ano [F6]. O banco de telas mostra US$ 7,99/49,99 em outra vitrine [S4] | R$ 29,90–69,90/mês; R$ 199,90–209,90/ano [F7] | 7 dias escolhendo plano na loja, com renovação automática [F8]; "3 treinos grátis" só em review [S7] | Nada: sem assinatura a pessoa vê os treinos antigos mas "não pode registrar novos" [F8] | Depois do 1º treino gerado e antes de começá-lo, e de novo após o resumo do treino [S11]; ou ao fim do onboarding [S4] |
| **Hevy** | US$ 2,99–3,99/mês; US$ 23,99/ano; US$ 74,99 vitalício [F11] | R$ 12,90–20,90/mês; R$ 99,90/ano; R$ 429,90 vitalício [F12] | **não confirmado** ("sem teste grátis" segundo [S11]) | Registro ilimitado, timer, biblioteca, relatório mensal [F16]; limites de 4 rotinas, 7 exercícios próprios e 3 meses de histórico [F15] | Ao bater o limite; o Trainer é Pro [F13] |
| **Strong** | US$ 4,99/mês; US$ 19,99/6 meses; US$ 29,99/ano; US$ 99,99 vitalício [F20] | R$ 12,90–18,90/mês; R$ 64,90/6 meses; R$ 77,90–117,90/ano; R$ 499,90–599,90 vitalício [F55] | **não confirmado**: a App Store dos EUA cita "período de teste" só na cláusula de renovação, sem duração [F20]; a BR não cita teste [F55]; o banco de telas registra "sem teste grátis" [S11] | Treinos ilimitados com 3 rotinas [F20][F22] | Ao bater o limite de rotinas, ao abrir gráficos e calculadoras [F22] |
| **JEFIT** | US$ 12,99/mês; US$ 69,99/ano [F24] | Elite R$ 64,90/mês; R$ 174,90–399,90/ano; preços antigos de R$ 22,90–27,90 e R$ 157,90 ainda listados [F54] | 7 dias para novos assinantes Elite [F54] | Registro com anúncios [S6] | No Adaptive Plan: o grátis pode testá-lo por 7 dias [F24] |
| **Future** | US$ 50 no 1º mês, depois US$ 199/mês [F26]. A imprensa cita novos níveis de US$ 129 e US$ 399 em junho de 2026 [S1], mas o site, relido em 03/10/2026, ainda mostra só "US$ 50 no 1º mês, depois US$ 199/mês" e reembolso em 30 dias [F26]. Vale o site. | — | Reembolso em 30 dias [F26] | Nada | Antes do treinador |
| **Ladder** | PRO US$ 29,99/mês ou 179,99/ano; níveis até ELITE+ US$ 49,99/mês [F29] | PRO R$ 79,99/mês ou R$ 479,90/ano; anuais de PRO+ R$ 1.799,90, ELITE R$ 2.299,90 e ELITE+ R$ 2.499,90. Só iPhone e Apple Watch [F60] | 7 dias sem pagamento [F29] | Nada depois do teste | Depois do quiz |
| **Caliber** | Plus US$ 6–12/mês ou US$ 36–72/ano; "Supporter" US$ 3/mês [F27] | — | **não confirmado** | Treinos ilimitados, 800+ exercícios, "círculos" de treino com amigos em que o recorde pessoal é compartilhado com o grupo, envio dos dados ao ChatGPT e ao Claude [F27] | No plano pronto (120+), no Strength Score, no equilíbrio de força, nas metas de nutrição, em exercício próprio, superset e troca de exercício [F27]. No iOS, só iPhone; também há app Android [F27][F65] |
| **SensAI** | US$ 6,99/mês; US$ 69,99/ano [F31][F63] | — | 7 dias com acesso total, "sem assinatura para começar" [F33][F63] | **não confirmado** (a loja só descreve o teste) | Fim do teste [F33] |
| **WHOOP** | One US$ 199/ano; Peak US$ 239; Life US$ 359, aparelho incluso [F37][F58] | — | 1 mês com aparelho e app ("termos e condições se aplicam") [F57][F59]; conversão para Peak [F38 (trecho de busca)] | Nada sem assinatura | Na compra |
| **Oura** | US$ 5,99/mês ou US$ 69,99/ano (5,99 €/69,99 € na UE), além do anel [F46] | — | 1 mês ao parear [F46] | Sono, Prontidão e Atividade [F46] | Detalhe, tendência e recursos avançados [F46] |

**Leitura:**
- **Grátis generoso + preço baixo** (Hevy, Strong, Caliber) cresce por boca a boca. O fundador do Hevy diz que o crescimento veio da comunidade e de cobrar menos que os concorrentes [F19].
- **Paywall rígido com projeção** (Fitbod) converte no onboarding, mas não deixa nada grátis [F8][S3].
- **O que se cobra em comum:** quantidade de rotinas ou planos, histórico e gráficos longos, plano gerado ou adaptativo, métricas avançadas. O registro básico quase nunca é cobrado, com a exceção do Fitbod.

---

## 6. Retenção

| Mecanismo | Quem faz | Detalhe |
|---|---|---|
| **Streak semanal tolerante** | Hevy | Conta semanas seguidas com ≥ 1 treino; o contador aparece ao concluir o 1º treino da semana e a pessoa escolhe o dia em que a semana começa. Treino registrado depois, com a data mudada na tela de salvar, recupera a semana, e vale até uma caminhada. "Alguns usuários têm streaks bem acima de 100 semanas" [F17] |
| Streak (sem detalhe) | Fitbod (Android) | Recurso de streaks e recordes [F5] |
| **Modo pausa sem punição** | Oura (Modo Descanso) | Pausa meta, nota e contribuintes de atividade; volta gradual em até 7 dias; sugerido quando a temperatura sobe [F47] |
| **Relatório semanal/mensal** | Fitbod, Hevy, WHOOP | Fitbod: resumo semanal às segundas e mensal às terças [F4]. Hevy: relatório mensal grátis com treinos, volume, PRs, calendário e distribuição muscular, comparado ao mês anterior, e só visível durante o mês seguinte [F16]. WHOOP: avaliação semanal toda segunda depois de 7 recuperações; em 2025 as avaliações passaram a chegar por e-mail [F42 (trecho de busca; mudança **não confirmada** em página lida)] |
| **Retrospectiva anual** | Hevy, Oura, WHOOP, Fitbod | Hevy: melhor mês, PRs, streak, "maiores apoiadores", compartilhável [S5][F10]. Oura: "tipo de personalidade" Terra (resiliência), Água (sono) ou Fogo (atividade), ilustrações da artista Maria Medem, botão de compartilhar com convite e desconto para amigos; exige ≥ 60 dias de dados e conta ativada até 1º de outubro; também há relatórios trimestrais (≥ 30 noites) e de aniversário a cada 6 meses [F48]. WHOOP: exige ≥ 60 recuperações, fica disponível só até 12/01 [F40 (trecho de busca)]. Fitbod: os gráficos do "Year in Review" ficaram permanentes no app [F5] |
| **Recordes pessoais** | Todos os de força | O Hevy notifica ao vivo [F10]. O Fitbod diz que o usuário médio bate o 1º PR em até 5 treinos [F4] (dado do próprio Fitbod) |
| **Score de força com níveis** | Caliber, Fitbod | Caliber: Strength Score de 100 a 600 em 5 níveis (Iniciante a Elite), com subnotas de pernas, peito, costas, ombros e braços, recalculado toda semana por 1RM estimado, peso, idade e sexo [F28]. Fitbod: Strength Score e mStrength por músculo, que detecta desequilíbrio como "peito ~20% mais que costas" [F4] |
| **Social** | Hevy, Ladder, Caliber, JEFIT | Hevy: feed com curtida e comentário, perfis, comparação, rankings, copiar rotina [F10]. Ladder: equipe com chat, vídeo diário do treinador e botão "cheers" durante o treino [F29]. Caliber: "círculos" de treino [F27]. JEFIT: rankings [F24] |
| **Diário de hábitos × score** | WHOOP | 300+ comportamentos segundo o blog [F41 (trecho de busca)], "160+" segundo a descrição da loja [F57]; com ≥ 5 "sim" e ≥ 5 "não" em 90 dias mostra associação com a Recuperação, "sem estabelecer causalidade" [F41 (trecho de busca)] |
| **Conteúdo semanal novo** | Ladder | Plano novo domingo às 9h (antes era às 20h) [F29] |
| **Integração externa** | Hevy, WHOOP | Hevy envia o treino ao ChatGPT ou ao Claude na tela de fim [F11]. Strava passou a mostrar mapa muscular automático nos treinos de força vindos de 14 parceiros, entre eles WHOOP, Fitbod, Hevy, JEFIT e Caliber, em 21/05/2026 [F50 (trecho de busca)][S8] |

---

## 7. Design diferenciado

O que as fontes primárias permitem afirmar sobre a interface. Tipografia e paleta exatas **não estão documentadas** por nenhum dos apps. Algumas microinterações (check animado, comemoração no fim do treino) só aparecem em banco de telas [S11] e estão marcadas assim. Os exemplos abaixo são das telas descritas pelos próprios fabricantes.

### WHOOP: três mostradores e uma cor
- **Tela inicial:** três mostradores (Sono, Recuperação, Strain) mostram o dia de relance. Cada um abre um detalhe com o que contribuiu para a nota. A tela foi redesenhada duas vezes desde 2023 [F34 (trecho de busca)].
- **Cor é o dado:** a Recuperação aparece em verde, amarelo ou vermelho. A pessoa lê a cor antes do número [F35].
- **Escala não linear:** cada ponto de Strain é mais difícil que o anterior [F34][F36]. Isso faz o "21" parecer conquista.
- **Alvo no anel:** o Strain Target mostra se você está abaixo do alvo, no alvo ou passando dele ao longo do dia [F34]. A comunidade pede faixas baixo/médio/alto no anel, o que indica que hoje o alvo é um número só (secundária, fórum).

### Oura: "uma coisa importante" e a coroa
- **Redesenho de out/2024:** cinco abas viram três (Hoje, Sinais vitais, Minha saúde). Na aba Hoje, uma linha do tempo do dia permite marcar atividades [F44]. Motivo dado pela gerente de produto: as pessoas "precisavam peneirar vários dados para achar o que importa" [F44].
- **Redesenho de nov/2025:** a aba Hoje destaca "uma coisa importante", a nota ou o alerta que mais importa no momento. A cor passa a sinalizar o estado do corpo em relação à linha de base pessoal. Uma seção "Hábitos e rotinas" liga comportamento a resultado [F45].
- **Coroa** ao lado de Prontidão, Sono ou Atividade quando a nota passa de 85 [F43]: uma microrrecompensa que não exige streak. O blog só descreve a faixa "Ótimo" de 85+ [F49].
- **Estados nomeados em vez de número** no estresse diurno: Estressado, Engajado, Relaxado e Restaurado, num gráfico colorido que atualiza a cada 15 minutos em repouso, contra a linha de base pessoal e não contra limiar fixo [F56].
- **Retrospectiva com identidade:** "tipo de personalidade" Terra, Água ou Fogo [F48]. É compartilhável sem expor números.

### Fitbod: o corpo como painel
- **Mapa de calor muscular:** porcentagem de recuperação por músculo sobre a silhueta do corpo, para comparar e decidir o que treinar [F2][F4].
- **Projeção antes do paywall:** gráfico de 3 meses calculado a partir das respostas [S3].
- **Vídeos de vários ângulos** em 1.000+ exercícios [F6]. O app recebeu "Editor's Choice" da Apple [F6].
- **Sessão e fim de treino:** a avaliação de esforço (RIR) aparece na própria sessão [F62], o resumo final tem animação de comemoração, e dicas contextuais explicam a interface durante o 1º treino em vez de num tour inicial [S11].
- **Na tela bloqueada:** Live Activity com exercício, timer, duração e progresso; widget da tela inicial com treinos da semana contra a meta [F61].

### Hevy: o treino vira objeto social
- **Cartões compartilháveis** gerados sozinhos ao fim de cada treino, além do mês e do ano: recordes, volume, gráfico de distribuição muscular e "comparações" do peso total levantado. Fundo claro, escuro ou transparente, este para sobrepor a selfie ou o vídeo do treino; vão direto para o story do Instagram com a marca @hevyapp [F16][F64].
- **PR ao vivo** durante a série [F10].
- **Live Activity** mostra a próxima série e a carga com o celular bloqueado [F18].
- **Gráfico de distribuição muscular** e mapa corporal (Pro) [F10][F15].
- **Microinterações:** a série concluída ganha um check animado; a biblioteca mostra o exercício num modelo 3D em loop [S11]. O calendário pinta de azul os dias com treino [F17].

### Strong: minimalismo como marca
- "Think less. Lift more"; o app "sai do seu caminho" [F21]. Mapa de calor muscular também existe aqui [F21].
- Personalização como vantagem paga: ícone do app e temas personalizados são PRO [F22].

### Ladder: o treino é conduzido, não preenchido
- **Treinador no fone** com ritmo embutido nas séries e repetições [F30].
- **Botão "cheers"** para apoiar colegas de equipe durante o treino [F29]. A microinteração social acontece dentro da sessão.
- **Fim de treino:** colagem de selfies de outras pessoas que fizeram o mesmo treino, prova social assíncrona [S11]. Opção de piscar a tela quando o movimento está acabando [F60].

### Caliber: um número com níveis de jogo
- Strength Score com faixas Iniciante, Intermediário, Avançado, Pro e Elite. O cartão abre a nota por grupo muscular [F28].

### SensAI: o relógio como controle
- Começar e ajustar o treino pela Coroa Digital; timer no Dynamic Island [F31]. Ilustração do grupo muscular em cada série [F33].

---

## 8. Tabela comparativa

| App | Onboarding | Adaptação sem chat | Registro | Preço / teste (EUA) | Retenção | Destaque de design |
|---|---|---|---|---|---|---|
| **Fitbod** | ~15 passos; objetivo, nível, equipamento, divisão; projeção de 3 meses antes do paywall [F3][S3][S4] | Recuperação por músculo, 1RM por Epley, Max Effort Day, recalibra dia perdido [F1][F3] | Prescrição pronta, timer, Apple Watch e Wear OS [F9] | US$ 12,99–15,99/mês; 7 dias via loja com renovação automática [F6][F8] | Relatório semanal, PR, streak, Strength Score [F4][F5] | Mapa de calor muscular [F2] |
| **Hevy** | Registro imediato; Trainer pergunta 6 itens [F13][S6] | Dupla progressão: topo da faixa em todas as séries → sobe [F13] | Valor anterior, timer, Live Activity, PR ao vivo, Apple Watch e Wear OS [F10][F18] | US$ 2,99/mês; grátis ilimitado com limites [F11][S6] | Streak semanal tolerante, relatório mensal, retrospectiva, feed [F16][F17] | Cartões compartilháveis [F16] |
| **Strong** | Nenhum: abre no registro [F21] | Não adapta [F21] | Timer automático de 2:00, Live Activity, relógio independente [F20][F23] | US$ 4,99/mês; grátis com 3 rotinas [F20] | Recordes, gráficos (PRO) [F22] | Minimalismo; temas e ícones pagos [F21][F22] |
| **JEFIT** | "2 minutos": objetivo, nível, dias, equipamento, lesões [F24][F25] | Mesociclo de 4 semanas com deload de 50% [F25] | Sugestão de carga, Apple Watch, séries e timer na tela bloqueada [F24] | US$ 12,99/mês; grátis com anúncios; Adaptive Plan com 7 dias grátis [F24][S6] | Rankings, comunidade [F24] | Cartões de compartilhar com marcos e recordes de 1RM; animação na tela de fim de treino [F24] |
| **Future** | Quiz de 1 min + treinador [F26] | Humano semanal [F26] | Apple Watch, voz [F26] | US$ 199/mês, US$ 50 no 1º mês [F26] | O próprio treinador | Abandonou a IA [S1] |
| **Ladder** | Quiz de equipe [F30] | Plano semanal do treinador [F29] | Áudio com ritmo [F30] | US$ 29,99/mês; 7 dias sem pagamento [F29] | Equipe, chat, "cheers", plano de domingo [F29] | Treinador no fone [F30] |
| **Caliber** | Avaliação [F27] | Planos prontos (Plus) [F27] | Registro ilimitado grátis [F27] | US$ 6–12/mês [F27] | Strength Score semanal, círculos [F27][F28] | Score com níveis de jogo [F28] |
| **SensAI** | Metas, agenda, equipamento, lesões [F31][S6] | Semanal por VFC, sono e FC de repouso, mas com chat no centro [F33] | Dynamic Island, Coroa Digital [F31] | US$ 6,99/mês; 7 dias sem cartão [F31][F33] | Resumo diário de recuperação [F33] | Relógio como controle [F31] |
| **WHOOP** | Aparelho | Strain Target pela Recuperação [F34][F36] | Strength Trainer com carga muscular [F39] | US$ 199–359/ano; 30 dias [F37][F38] | Avaliação semanal, Journal, retrospectiva [F40][F41][F42] | Três mostradores, cor [F34][F35] |
| **Oura** | Anel | Prontidão, Modo Descanso [F43][F47] | — | US$ 5,99/mês; 1 mês [F46] | Coroa, relatórios, retrospectiva [F43][F48] | "Uma coisa importante" [F45] |

---

## 9. O que o Eleva Pro deve copiar, adaptar ou evitar

Esta seção cruza os achados com o que o Eleva já tem: motor de regras determinístico (PSE × minutos, médias de 42 e 7 dias, aderência), Prontidão versionada (ADR-0029), IA que propõe e a pessoa aprova (ADR-0020), home com uma ação (ADR-0033), ranking só de treino e opt-in (ADR-0032), billing depois do primeiro valor (ADR-0036) e kit de vidro verde-lima. É recomendação, não decisão: cada item vira issue pelo `/to-spec`, e o que toca dado de saúde passa pelo `/lgpd-check`.

### Agora

1. **Copiar: onboarding curto que termina com o primeiro treino pronto para aprovar.**
   - Seis perguntas comuns a todos: objetivo, experiência, dias por semana, duração, equipamento e limitação [F3][F13][F25].
   - Equipamento vem com predefinições (academia completa, casa, peso corporal) que a pessoa só desmarca [F3].
   - O motor gera o treino e o Assistente explica em uma frase. A tela tem um botão "Aprovar" e um "Ajustar", sem campo de chat (ADR-0020).
   - Cuidado: o tamanho ideal do onboarding não está resolvido. Telas longas aumentam o início do teste [S3], e o Hevy cresceu deixando registrar em 90 segundos [S6]. Medir.
2. **Copiar: progressão por dupla progressão, com a regra visível.**
   - A regra do Hevy (topo da faixa em todas as séries → sobe; senão mantém e incentiva) é determinística, explicável e cabe no motor [F13].
   - Somar a "recalibração após pausa" do Fitbod [F4]: o motor já calcula aderência e já pode baixar a carga depois de dias sem treino. Isso equivale ao "regime de destreino" do Zepp (ver `zepp-coach.md`).
   - A IA só verbaliza ("subiu 2,5 kg porque você fez 12 repetições nas 3 séries").
3. **Copiar: os quatro redutores de atrito no registro.**
   - Valor anterior na linha da série [F18].
   - Timer que dispara ao concluir, com tempo próprio para aquecimento [F23].
   - Timer na tela bloqueada: Live Activity no iOS e notificação contínua no Android [F18][F20].
   - PSE com um toque ao fim do exercício ou da sessão. A PSE alimenta o motor de carga (PSE × minutos), então aqui ela serve à adaptação e não é enfeite. O Fitbod faz o mesmo por exercício, com RIR de 0 a 4+ e prompt único no fim de um superset, e usa o valor para subir carga ou repetições [F62]; vale copiar o prompt por exercício com 5 opções nomeadas.
4. **Copiar: streak semanal e tolerante, não diário** [F17].
   - Meta em "semanas com N treinos", com recuperação ao registrar um treino retroativo.
   - Somar um **Modo Descanso** no estilo do Oura [F47]: congela o streak e a meta quando a pessoa marca doença ou lesão. O motor de regras já sabe tratar queda de aderência. Copiar também a volta gradual: o Oura leva até 7 dias para voltar ao normal depois do descanso [F47], o que no Eleva vira carga reduzida nas primeiras sessões.
5. **Adaptar: a Prontidão como cor + ação, não como painel.**
   - Seguir o Oura de 2025 ("uma coisa importante") [F45] e não os três mostradores do WHOOP [F34]. Isso bate com o ADR-0033.
   - Um anel de vidro com a cor do estado e a ação do dia por baixo ("Treino A, carga mantida: prontidão baixa").
   - A faixa de cor precisa ser definida pela regra versionada (ADR-0029). Não copiar os números de corte de WHOOP ou Oura, que dependem de VFC e temperatura que o Eleva nem sempre recebe.
6. **Adaptar ao ADR-0036: o paywall entra depois do primeiro treino concluído, e o teste não pede cartão.**
   - Ladder e SensAI usam "sem cartão" como argumento [F29][F33].
   - Paywall depois do valor, com uma projeção do Fitbod honesta e baseada no motor [S3]: "em 8 semanas, nesta progressão, seu supino estimado vai de X a Y".
7. **Adaptar o preço ao mercado.**
   - Na App Store BR, Hevy e Strong cobram de R$ 12,90 a R$ 20,90/mês, o Fitbod de R$ 29,90 a R$ 69,90 e o JEFIT R$ 64,90 [F12][F55][F7][F54]. Os registradores sem plano adaptativo ficam abaixo do Starter de R$ 19; os que geram plano ficam acima do Pro de R$ 39.
   - O Free precisa registrar treino sem limite. Registro pago é o caso isolado do Fitbod, e Hevy e Strong crescem justamente por não cobrar por isso [F19][F22].
   - O Starter de R$ 19 cobra o plano adaptativo. O Pro de R$ 39 cobra a Prontidão com relógio, o escaneamento e os relatórios longos.
   - Referência de teto: o Ladder, com treinador humano por equipe, cobra R$ 79,99/mês no Brasil [F60]. Plano gerado por regra a R$ 19–39 fica bem abaixo do humano e perto dos registradores.
   - Nunca esconder dado histórico atrás do pagamento [F22]. O ADR-0036 já proíbe gate sobre os próprios dados.

### Em seguida

8. **Copiar com a cara do vidro: mapa muscular.**
   - O mapa de calor do Fitbod [F2] e o mapa muscular no Strava e no WHOOP [F50] viraram linguagem comum.
   - No Eleva ele pode mostrar o volume semanal por músculo, que é derivado das séries já gravadas. Evitar "recuperação %" com cara de medida, já que o próprio Fitbod diz que não há número mágico [F2].
   - Silhueta em SVG com tokens do design system e luz ambiente verde-lima nos músculos trabalhados. Serve também para o cartão de fim de treino.
9. **Copiar: PR ao vivo como microinteração** [F10]. Vibração mais um selo de vidro no momento da série, e o PR entra no resumo da sessão.
10. **Copiar: relatório mensal compartilhável** [F16].
    - Cartão vertical no formato story, com treinos, volume, PRs e calendário de consistência.
    - O Hevy gera vários cartões sozinho ao fim de **cada** treino e oferece fundo transparente para sobrepor a selfie ou o vídeo [F64]. O cartão por treino é mais barato de fazer que o mensal e já testa o formato.
    - LGPD: o cartão só leva treino, que é o mesmo recorte do ranking (ADR-0032), nunca dieta, peso nem prontidão.
11. **Adaptar: "Max Effort Day" como teste periódico opcional** [F1]. Uma série AMRAP marcada pelo motor a cada bloco recalibra o 1RM estimado sem formulário.
12. **Adaptar: periodização visível em blocos** [F25]. O Eleva já tem periodização. O ganho é mostrar a fase ("Semana 3 de 4: Intensificação"), com o deload de 50% anunciado antes, para o avançado reconhecer o método.
13. **Copiar: troca de exercício que ensina** [F3]. "Trocar só hoje", "Trocar sempre" e "Recomendar menos", com alternativas filtradas pelo equipamento do perfil.

### Depois

14. **Retrospectiva anual com elegibilidade mínima**, no formato de Oura e WHOOP com ≥ 60 dias [F40][F48]. Uma identidade compartilhável no estilo da "personalidade" do Oura funciona melhor que números.
15. **Score de força com níveis** (Caliber 100–600, Fitbod Strength Score) [F28][F4]. É forte para o iniciante ver progresso, mas usa peso, idade e sexo. Passar pelo `/lgpd-check` e definir a fórmula num ADR.
16. **Diário de hábitos × Prontidão** no estilo do WHOOP, com limiar de 5 "sim" e 5 "não" e aviso de "associação, não causa" [F41]. Toca dado sensível, então vem só depois do `/lgpd-check`.
17. **Social leve antes de feed.** Círculos de amigos (Caliber) ou "cheers" durante o treino (Ladder) [F27][F29] antes de um feed público como o do Hevy [F10]. Manter o opt-in recíproco do ADR-0032.
18. **App de relógio** (Apple Watch e Wear OS) para registrar a série. Todos os concorrentes de força têm. A lição do Fitbod no Wear OS é que a série registrada no relógio precisa disparar o timer [F9].

### Evitar

- **Chat como interface do plano** (SensAI) [F31]. A Future, com orçamento e base de usuários, desistiu do coach por IA [S1]. O Eleva deve vender "regra explicada", não "converse com a IA".
- **Bloqueio total do registro sem assinatura** (Fitbod) [F8]. Conflita com o ADR-0036 e com a sensibilidade de preço no Brasil.
- **Score opaco vendido como verdade fisiológica.** WHOOP e Oura comparam com linhas de base de 14 a 30 dias e com sensores que o Eleva nem sempre tem [F35][F43]. O SensAI avisa que uma leitura isolada não deve decidir o treino [F33]. O Eleva já grava a versão da regra (ADR-0029). Mostrar isso ("como calculamos") é diferencial.
- **Relatório que expira** (o mensal do Hevy só fica visível durante o mês seguinte [F16]; a retrospectiva do WHOOP sai do ar em janeiro [F40]). Dá urgência, mas frustra quem chega atrasado. Preferir arquivo permanente, como o Fitbod fez com o "Year in Review" [F5].
- **Teste que vira anuidade com multa** (WHOOP) [F38]. A conversão e a taxa de US$ 110 vêm só de trecho de busca; a loja confirma o teste de 1 mês com "termos e condições" [F57].

---

## 10. Fontes

Data de acesso: 02/10/2026, salvo indicação. As fontes F51 em diante e S7 em diante foram lidas em 03/10/2026, e as entradas anteriores relidas nessa data dizem isso.

### Primárias

- **[F1]** Fitbod, "How Fitbod Generates Your Personalized Workouts: Meet The Fitbod Algorithm", 05/08/2022, modificado em 09/06/2026. https://fitbod.me/blog/fitbod-algorithm/
- **[F2]** Fitbod, "Fitbod's Muscle Recovery: How It Impacts Your Next Workout", 05/08/2022, modificado em 06/02/2026. https://fitbod.me/blog/muscle-recovery/
- **[F3]** Fitbod, "How Fitbod Builds Personalized Strength Programs Without A Trainer", 08/12/2025. https://fitbod.me/blog/how-fitbod-builds-personalized-strength-programs-without-a-trainers/
- **[F4]** Fitbod, "Fitbod Insights Feature: 9 Data-Driven Features [...]", 17/09/2026. https://fitbod.me/blog/fitbod-insights-feature/
- **[F5]** Fitbod, "The Past Year's Improvements: Fitbod's 2023 Feature Round-Up". https://fitbod.me/blog/fitbods-2023-product-recap/
- **[F6]** App Store (EUA), "Fitbod: Gym & Fitness Planner", versão 8.35.0. https://apps.apple.com/us/app/fitbod-gym-fitness-planner/id1041517543
- **[F7]** App Store (Brasil), "Fitbod: Treinos e Fitness". https://apps.apple.com/br/app/fitbod-gym-fitness-planner/id1041517543
- **[F8]** Fitbod Help Center, "How the Trial Works" e "How to Subscribe to Fitbod" (página com 403; texto lido pela API pública do Zendesk, `help.fitbod.me/api/v2/help_center/en-us/articles/<id>.json`, em 03/10/2026). https://help.fitbod.me/hc/en-us/articles/30542136101527-How-the-Trial-Works · https://help.fitbod.me/hc/en-us/articles/360004904714-How-to-Subscribe-to-Fitbod
- **[F9]** Fitbod Help Center, "Apple Watch" e "WearOS on Android" (lido pela API do Zendesk em 03/10/2026). https://help.fitbod.me/hc/en-us/articles/360006499194-Apple-Watch · https://help.fitbod.me/hc/en-us/articles/4406074415383-WearOS-on-Android
- **[F10]** Hevy, "Hevy App Feature List". https://www.hevyapp.com/features/
- **[F11]** App Store (EUA), "Hevy - Workout Tracker Gym Log", versão 3.1.16. https://apps.apple.com/us/app/hevy-workout-tracker-gym-log/id1458862350
- **[F12]** App Store (Brasil), "Hevy - Treino de Academia Gym". https://apps.apple.com/br/app/hevy-workout-tracker-gym-log/id1458862350
- **[F13]** Hevy, "Hevy Trainer: Adaptive Strength Programming System". https://www.hevyapp.com/features/workout-plan-generator/
- **[F14]** Hevy Help Center, "Hevy Trainer Explained: How It Builds Your Workout Program" (lido pela API do Zendesk em 03/10/2026). https://help.hevyapp.com/hc/en-us/articles/38385724273047-Hevy-Trainer-Explained-How-It-Builds-Your-Workout-Program
- **[F15]** Hevy Help Center, "Hevy Pro Subscription: How to get Pro and What Does It Include" (lido pela API do Zendesk em 03/10/2026). https://help.hevyapp.com/hc/en-us/articles/35119778922263-Hevy-Pro-Subscription-How-to-get-Pro-and-What-Does-It-Include
- **[F16]** Hevy, "Hevy Monthly Report". https://www.hevyapp.com/features/monthly-report/
- **[F17]** Hevy Help Center, "Track Your Workout Consistency with the Calendar and Streak Features" e "How to Get Your Weekly Streak Back" (lidos pela API do Zendesk em 03/10/2026). https://help.hevyapp.com/hc/en-us/articles/35380117933207 · https://help.hevyapp.com/hc/en-us/articles/34467766576279
- **[F18]** Hevy, "Previous Workout Values" e "How Live Activity Improves Workout Logging" (detalhe confirmado em [F51] e [F52]). https://www.hevyapp.com/features/track-exercises/ · https://www.hevyapp.com/features/live-activity/
- **[F19]** RevenueCat, entrevista com Guillem Ros (cofundador do Hevy), "Hevy: Two Million Downloads, No Paid Marketing", 28/06/2023, atualizada em 06/06/2024. https://www.revenuecat.com/blog/growth/guillem-ros-hevy-podcast
- **[F20]** App Store (EUA), "Strong Workout Tracker Gym Log", versão 6.5.0. https://apps.apple.com/us/app/strong-workout-tracker-gym-log/id464254577
- **[F21]** Strong, site oficial. https://www.strong.app/
- **[F22]** Strong Help Center, "What is Strong PRO?" (lido em 03/10/2026). https://help.strongapp.io/article/132-strong-pro
- **[F23]** Strong Help Center, "About Rest Timer" (lido em 03/10/2026). https://help.strongapp.io/article/231-rest-timer
- **[F24]** App Store (EUA), "JEFIT Workout Plan Gym Tracker", versão 17.2.5. https://apps.apple.com/us/app/jefit-gym-workout-plan-tracker/id449810000
- **[F25]** JEFIT, "Adaptive Plan — AI-Powered Training That Evolves With You". https://www.jefit.com/ai-workout-tracker/adaptive-plan
- **[F26]** Future, site oficial (Future Pro); relido em 03/10/2026. https://www.future.co/
- **[F27]** App Store (EUA), "Caliber: Strength Training". https://apps.apple.com/app/id1482405410
- **[F28]** Caliber, "Introducing Strength Score". https://caliberstrong.com/blog/introducing-strength-score/
- **[F29]** App Store (EUA), "LADDER Strength Training Plans", versão 4.13.1. https://apps.apple.com/us/app/ladder-strength-training-plans/id1502936453
- **[F30]** Ladder, site oficial. https://www.joinladder.com/
- **[F31]** App Store (EUA), "SensAI: Fitness Sensei", versão 1.1.6. https://apps.apple.com/us/app/sensai-fitness-sensei/id6738963099
- **[F32]** SensAI, site oficial. https://www.sensai.fit/
- **[F33]** SensAI, "SensAI Review 2026" (blog do próprio app, sobre o próprio app), 12/07/2026. https://www.sensai.fit/blog/sensai-review-2026
- **[F34]** WHOOP, "WHOOP Home screen: what's on it and how to customize it" (trecho de busca; domínio com 403). https://www.whoop.com/us/en/thelocker/the-all-new-whoop-home-screen/
- **[F35]** WHOOP, "How Does WHOOP Recovery Work?" (trecho de busca). https://www.whoop.com/us/en/thelocker/how-does-whoop-recovery-work-101/
- **[F36]** WHOOP Support, "Strain Target", e WHOOP, "How Does WHOOP Strain Work?" (trecho de busca). https://support.whoop.com/s/article/Strain-Coach?language=en_US · https://www.whoop.com/us/en/thelocker/how-does-whoop-strain-work-101/
- **[F37]** WHOOP, "Introducing WHOOP 5.0 and WHOOP MG", 08/05/2025 (página com 403; preços confirmados no comunicado [F58]). https://www.whoop.com/us/en/thelocker/introducing-whoop-5-0-and-whoop-mg/
- **[F38]** WHOOP Support, "Free Trial FAQ" (trecho de busca). https://support.whoop.com/s/article/Free-Trial-FAQ?language=en_US
- **[F39]** WHOOP, "Strength Trainer by WHOOP", "Muscular Load Explained" e "2026 What's New at WHOOP" (trecho de busca). https://www.whoop.com/us/en/thelocker/introducing-strength-trainer-a-new-way-to-quantify-the-impact-of-your-strength-training/ · https://www.whoop.com/us/en/thelocker/how-whoop-measures-muscular-load/ · https://www.whoop.com/us/en/thelocker/2026-whats-new/
- **[F40]** WHOOP Support, "Year in Review 2025" (trecho de busca). https://support.whoop.com/s/article/Year-in-Review-2025?language=en_US
- **[F41]** WHOOP, "WHOOP Journal: Customize Behaviors, Get Insights" (trecho de busca). https://www.whoop.com/us/en/thelocker/the-whoop-journal/
- **[F42]** WHOOP, "App Feature: The Weekly Performance Assessment" (trecho de busca). https://www.whoop.com/us/en/thelocker/new-feature-weekly-performance-assessment/
- **[F43]** Oura Support, "Readiness Score". https://support.ouraring.com/hc/en-us/articles/360025589793-Readiness-Score
- **[F44]** Oura, "Introducing the New Oura App Design", 03/10/2024. https://ouraring.com/blog/new-oura-app-experience/
- **[F45]** Oura, "A New Look for the Oura App: See the Bigger Picture of Your Long-Term Health", 05/11/2025. https://ouraring.com/blog/new-app-design/
- **[F46]** Oura Support, "Oura Membership" (lido em 03/10/2026). https://support.ouraring.com/hc/en-us/articles/4409086524819-Oura-Membership
- **[F47]** Oura Support, "Rest Mode" (lido em 03/10/2026). https://support.ouraring.com/hc/en-us/articles/360057065433-Rest-Mode
- **[F48]** Oura, "Celebrate Your 2024 Health Journey With Oura's Year in Review" e Oura Support, "Oura Reports" (lidos em 03/10/2026). https://ouraring.com/blog/2024-year-in-review/ · https://support.ouraring.com/hc/en-us/articles/360046061373-Oura-Reports
- **[F49]** Oura, "Your Oura Readiness Score & How To Measure It" (lido em 03/10/2026: fala da faixa 85+ mas não da coroa; a coroa está em [F43]). https://ouraring.com/blog/readiness-score/
- **[F50]** WHOOP Press Center, "Strava Overhauls Strength Experience with Expanded Partner Ecosystem, New Workout Log and Muscle Maps" (trecho de busca). https://www.whoop.com/us/en/press-center/strava-overhauls-strength-experience-with-expanded-partner-ecosystem-new-workout-log-and-muscle-maps/
- **[F51]** Hevy Help Center, "Previous Workout Values Vs. Routine Values: How to Adjust in Settings?" (id 34105442929943) e "Workout Settings Preferences" (id 33882110558743), via API do Zendesk, acesso em 03/10/2026. https://help.hevyapp.com/hc/en-us/articles/34105442929943
- **[F52]** Hevy Help Center, "How to Use Hevy's Live Activity on iOS and Android" (id 35649846517399), via API do Zendesk, acesso em 03/10/2026. https://help.hevyapp.com/hc/en-us/articles/35649846517399
- **[F53]** Hevy Help Center, "Hevy Live PR Notifications: Get Instant Updates on Your Best Lifts" (id 36012016405655), via API do Zendesk, acesso em 03/10/2026. https://help.hevyapp.com/hc/en-us/articles/36012016405655
- **[F54]** App Store (Brasil), "JEFIT Workout Plan Gym Tracker", compras dentro do app, acesso em 03/10/2026. https://apps.apple.com/br/app/jefit-gym-workout-plan-tracker/id449810000
- **[F55]** App Store (Brasil), "Strong Workout Tracker Gym Log", compras dentro do app, acesso em 03/10/2026. https://apps.apple.com/br/app/strong-workout-tracker-gym-log/id464254577
- **[F56]** Oura Support, "Daytime Stress", acesso em 03/10/2026. https://support.ouraring.com/hc/en-us/articles/21205822135315-Daytime-Stress
- **[F57]** Google Play, "WHOOP", descrição da loja atualizada em 25/09/2026 (lida por download direto da página), acesso em 03/10/2026. https://play.google.com/store/apps/details?id=com.whoop.android&hl=en_US
- **[F58]** WHOOP, comunicado à imprensa via Business Wire, "WHOOP Unveils WHOOP 5.0 and WHOOP MG [...]", 08/05/2025, acesso em 03/10/2026. https://www.businesswire.com/news/home/20250508546933/en
- **[F59]** App Store (EUA), "WHOOP", acesso em 03/10/2026. https://apps.apple.com/us/app/whoop/id933944389
- **[F60]** App Store (Brasil), "LADDER Strength Training Plans", compras dentro do app e notas das versões 4.10.1–4.11.0, acesso em 03/10/2026. https://apps.apple.com/br/app/id1502936453
- **[F61]** Fitbod Help Center, "iOS Widget" (id 360058341233), via API do Zendesk, acesso em 03/10/2026. https://help.fitbod.me/hc/en-us/articles/360058341233
- **[F62]** Fitbod Help Center, "Reps in Reserve (RiR) - Formerly Exertion Rating/RPE" (id 360033133174), via API do Zendesk, acesso em 03/10/2026. https://help.fitbod.me/hc/en-us/articles/360033133174
- **[F63]** App Store (EUA), "SensAI: Fitness Sensei", descrição e compras dentro do app, acesso em 03/10/2026. https://apps.apple.com/us/app/sensai-fitness-sensei/id6738963099
- **[F64]** Hevy, "Social Media Shareables", acesso em 03/10/2026. https://www.hevyapp.com/features/shareable/
- **[F65]** Google Play, "Caliber Strength Training", acesso em 03/10/2026. https://play.google.com/store/apps/details?id=com.caliberfitness.app&hl=en_US

### Secundárias

- **[S1]** Athletech News, "Future Pulls the Plug on AI Personal Training, Commits to Human Coaches", jun/2026. Cita a nota da Future à lista de espera e o relatório Les Mills 2026. https://athletechnews.com/future-pulls-the-plug-on-ai-personal-training-commits-to-human-coaches/
- **[S2]** Athletech News, "In the Age of AI, Human Personal Trainers Might Become a Luxury" (Future e Caliber, fev/2026). https://athletechnews.com/age-of-ai-human-personal-trainers-might-become-a-luxury-future-caliber/
- **[S3]** RevenueCat, "Why your onboarding experience might be too short", 24/08/2023, atualizado em 03/09/2024 (análise de terceiros sobre o Fitbod). https://www.revenuecat.com/blog/growth/why-your-onboarding-experience-might-be-too-short
- **[S4]** Appllama, "Fitbod: Gym & Fitness Planner screens, onboarding and paywall" (banco de telas; conteúdo parcialmente bloqueado). https://appllama.io/apps/1041517543/fitbod-gym-fitness-planner
- **[S5]** Appllama, Hevy (banco de telas). https://appllama.io/apps/1458862350/hevy-workout-tracker-gym-log
- **[S6]** SensAI Blog, comparativos de preço e reviews de concorrentes ("Fitness App Pricing 2026", "Hevy Review 2026", "Hevy vs Strong vs Fitbod vs Jefit"). Escritos por um concorrente, então valem só como complemento. https://www.sensai.fit/blog/fitness-app-pricing-free-tier-comparison · https://www.sensai.fit/blog/hevy-review-2026 · https://www.sensai.fit/blog/hevy-vs-strong-vs-fitbod-vs-jefit
- **[S7]** Reviews de 2026 que citam "3 free workouts" no Fitbod: Hotelgyms e Autonomous.ai, acesso em 03/10/2026. https://www.hotelgyms.com/blog/review-of-fitbod-how-to-take-your-fitness-with-you · https://www.autonomous.ai/ourblog/fitbod-app-review
- **[S8]** 9to5Mac, "Strava adds dedicated strength training support for sets, reps, weight, and muscle groups", 21/05/2026, acesso em 03/10/2026. https://9to5mac.com/2026/05/21/strava-adds-dedicated-strength-training-support-for-sets-reps-weight-and-muscle-groups/
- **[S9]** Fit Tech Global, "Whoop adds Strength Trainer feature allowing members to measure muscular load", abr/2023, sobre o comunicado da WHOOP na Business Wire de 25/04/2023 (a página da Business Wire respondeu 403), acesso em 03/10/2026. https://www.fittechglobal.com/fit-tech-news/Whoop-adds-Strength-Trainer-feature-allowing-members-to-measure-muscular-load/351262 · https://www.businesswire.com/news/home/20230425005456/en
- **[S10]** Gadgets & Wearables, "Whoop expands AI with beta invites and smarter strength training", 22/02/2026, acesso em 03/10/2026. https://gadgetsandwearables.com/2026/02/22/whoop-ai-beta/
- **[S11]** ScreensDesign, vitrines de Fitbod, Hevy, Strong e Ladder (banco de telas com vídeo do app; contagem de passos, paywall e notas de UX), acesso em 03/10/2026. https://screensdesign.com/showcase/fitbod-gym-fitness-planner · https://screensdesign.com/showcase/hevy-workout-tracker-gym-log · https://screensdesign.com/showcase/strong-workout-tracker-gym-log · https://screensdesign.com/showcase/ladder-strength-training-plans

---

## 11. Lacunas restantes

Revisão de 03/10/2026. Marcas restantes: 13 "não confirmado" e 23 "(trecho de busca)" (8 delas nas entradas da seção 10), que correspondem a 20 lacunas distintas.

| Lacuna | O que foi tentado |
|---|---|
| Duração do teste do Hevy Pro | Central de ajuda (busca por "free trial" na API do Zendesk), App Store BR e EUA, Google Play BR, hevy.com/plans (renderiza no cliente). Nenhuma primária cita teste; o banco de telas diz "sem teste grátis" [S11]. |
| Redução de carga no Hevy Trainer | Página do Trainer e artigos "Hevy Trainer Explained" e busca "progressive overload" na central. Só há "lembretes para forçar quando a progressão empaca". |
| Carga individual no Ladder | App Store EUA e BR (notas de versão), site oficial. Só há alerta de platô e 1RM estimado; a central de ajuda (help.joinladder.com) não existe. |
| Ladder: tela bloqueada e PSE | App Store EUA e BR e site oficial: nenhuma menção. |
| Strong: coluna "anterior" e teste grátis | Busca na central (help.strongapp.io), site, App Store EUA e BR. A loja dos EUA cita "período de teste" só na cláusula de renovação. |
| JEFIT: PSE/RIR | App Store EUA e BR (descrição e notas de versão). O Google Play não retornou a página. |
| SensAI: PR ao vivo e o que fica grátis depois do teste | App Store EUA (descrição completa, notas de versão e compras dentro do app). O app não está no Google Play. |
| Caliber: teste do Plus | App Store EUA, Google Play, site (página de preços com 404). Reviews citam 7 dias para o antigo "Pro", não para o Plus. |
| WHOOP: cortes 67/34/1 da Recuperação, Borg, Strain Target ao longo do dia, tela inicial de três mostradores, conversão do teste para Peak com taxa de US$ 110, avaliação semanal após 7 recuperações e por e-mail, retrospectiva (≥ 60 recuperações, até 12/01), Journal (300+ comportamentos, limiar 5/5 em 90 dias) | whoop.com e support.whoop.com com WebFetch, curl com cabeçalho de navegador e leitor r.jina.ai: Cloudflare 403 no site e página Salesforce que só renderiza no cliente no suporte. archive.org bloqueado para a ferramenta. App Store e Google Play confirmam só cor, escala e teste de 1 mês; o comunicado do Strength Trainer na Business Wire respondeu 403. |
| WHOOP: IA que monta treino de força (2026) e Strava com mapa muscular | Páginas do WHOOP com 403; confirmado só por imprensa [S8][S10]. strava.com/strength não traz o texto, e o press.strava.com não respondeu. |
