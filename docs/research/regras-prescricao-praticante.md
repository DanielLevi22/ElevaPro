# Em que basear as regras que decidem treino e dieta do Praticante

Status: concluído em 09/10/2026. Pesquisa para a issue #365 (onboarding do Praticante). Fontes primárias lidas: resumos oficiais dos artigos (via Europe PMC, que espelha o PubMed), o infográfico oficial do ACSM, a tabela da FAO, o texto das leis no planalto.gov.br e as páginas oficiais dos apps. Onde só houve trecho de busca ou repositório de terceiros, a fonte está marcada como **secundária**. Sete fontes de apps de nutrição já estavam em [`apps-nutricao.md`](apps-nutricao.md) e são citadas como **[N·Fn]**.

**Pergunta.** Para o aluno com especialista, o profissional fixa a divisão, as fases, o nível e a meta calórica, e a IA só escolhe exercícios e alimentos. No Praticante, quem toma essas decisões é o próprio sistema, com regras em funções puras. Que faixas a literatura sustenta para essas regras, onde o código atual (`shared/src/utils/energyTargets.ts`) diverge delas e o que a lei brasileira diz sobre um plano gerado por sistema para quem não tem profissional?

**Como ler.** Cada regra tem duas partes:

- **Faixa com evidência:** o que a fonte sustenta, com a citação.
- **Escolha que precisa de profissional:** onde a literatura dá uma faixa e alguém com registro precisa fixar o número exato. É CREF no treino e CRN na dieta.

Isto não é parecer jurídico nem prescrição. É o material para o profissional responsável fixar os valores e para o PRD citar.

---

## Resumo em 12 linhas

1. **Treino de força para saúde:** todos os grupos musculares grandes, **2 ou mais dias por semana** (OMS 2020, recomendação forte [F5]; ACSM 2026 [F3]). É o piso do Praticante em qualquer objetivo.
2. **O ACSM trocou o posicionamento de 2009 [F1] pelo de 2026 [F2].** Quase nenhuma variável muda muito o resultado. Força melhora com carga **≥ 80% de 1RM**, **2–3 séries**, amplitude completa e **≥ 2 sessões por semana**. Hipertrofia melhora com **≥ 10 séries por músculo por semana**. Ir até a falha, o tipo de equipamento e a periodização complexa não mudaram o resultado de forma consistente.
3. **Frequência:** treinar cada músculo **2×/semana** rende mais que 1× [F6]. Com volume igual, a frequência não importa para hipertrofia [F7] e importa pouco para força [F8][F11]. Por isso a divisão por número de dias é **convenção**, não evidência: qualquer divisão que dê 2×/semana por músculo serve.
4. **Volume:** quanto mais séries, mais ganho, com retorno decrescente [F9][F11]. Em homens jovens treinados, 12–20 séries/músculo/semana [F10]. A literatura não dá número para iniciante; esse número é escolha de CREF.
5. **Repetições:** a hipertrofia acontece numa faixa larga de cargas [F12][F13]. O 8–12RM para iniciante vem do ACSM 2009 [F1]. **Intervalo:** 60–120 s basta para quem não treina; acima de 2 min ajuda a força de quem treina [F15]; acima de 60–90 s não muda a hipertrofia [F17]. **Progressão:** sobe 2–10% de carga quando a pessoa faz 1–2 repetições acima da meta [F1]. É a mesma regra publicada pelo Hevy [F38].
6. **Mifflin-St Jeor:** o código bate com a fórmula simplificada do artigo original [F19]. Foi derivada de adultos de **19 a 78 anos**; é a equação mais confiável entre as quatro comparadas em [F20], mas com erro individual relevante.
7. **Fatores de atividade 1,2–1,9:** **não achei a fonte primária.** A FAO/OMS/UNU usa outras faixas: sedentário/leve vai de **1,40 a 1,69** [F21]. O 1,2 do código fica abaixo do piso da FAO.
8. **Divergência grave no código:** para o sedentário em cutting, a meta é 1,2 × 0,8 = **0,96 × TMB**. Isso viola a regra "nunca abaixo da TMB" que a issue já fixa.
9. **Ritmo e déficit:** o −20% do código está alinhado com a literatura. No estudo de Garthe [F22], um corte de 19% deu 0,7% do peso por semana e preservou massa magra, enquanto 30% e 1,4%/sem não preservaram. Helms recomenda 0,5–1%/sem [F23]. O +10% está na ponta baixa da faixa de 10–20% [F26].
10. **Proteína:** 1,8 e 2,0 g/kg estão dentro das faixas da ISSN e de Iraki [F24][F26]. O **2,2 g/kg do cutting por peso total** diverge num ponto: a faixa de 2,3–3,1 vale por kg de **massa magra** [F23][F25]. Em pessoa com obesidade, o peso total infla a meta. **Gordura** de 0,8–1,0 g/kg fica dentro de 0,5–1,5 g/kg [F26].
11. **Menor de 18 e IMC baixo:** o corte de **IMC 18,5 só vale para adulto.** Dos 5 aos 19 anos, a OMS usa IMC-para-idade abaixo de −2 desvios-padrão [F31][F32]. A Mifflin não foi validada abaixo de 19 anos [F19].
12. **Lei:** o art. 3º, **VII** da Lei 8.234/1991 torna privativa do nutricionista a "assistência e educação nutricional a coletividades ou indivíduos, **sadios** ou enfermos" [F44]. Não é só o inciso VIII (enfermos) que a issue cita. A Resolução CONFEF 542/2024 diz que "caracteriza exercício ilegal da profissão, mesmo em ambiente virtual, a orientação e/ou anúncio" por quem não tem registro [F46]. Nenhum texto lido trata de plano gerado por software sem profissional: **essa é a lacuna central.**

---

## 1. Treino de força

### 1.1 Recomendação mínima de saúde (o piso)

**Faixa com evidência.**

- **Adultos:** "atividades de fortalecimento muscular de intensidade moderada ou maior, que envolvam todos os grupos musculares grandes, em 2 ou mais dias por semana". É recomendação forte, com evidência de certeza moderada, e a OMS não achou relação dose-resposta com volumes maiores de força para os desfechos de saúde [F5]. Somam-se 150–300 min/semana de aeróbico moderado ou 75–150 min de vigoroso [F5].
- **Crianças e adolescentes:** média de 60 min/dia de atividade moderada a vigorosa, e atividades que fortaleçam músculo e osso "pelo menos 3 dias por semana" [F5].
- **Gestantes e puérperas sem contraindicação:** pelo menos 150 min/semana de aeróbico moderado, "incorporando uma variedade de atividades aeróbicas e de fortalecimento muscular" [F5].
- **ACSM 2011:** resistência para cada grupo muscular grande, 2–3 dias/semana [F4]. **ACSM 2026:** "treine todos os grupos musculares grandes pelo menos 2 dias por semana e evolua aos poucos". O maior salto de resultado é sair de nenhum treino para algum treino [F3].

**Escolha que precisa de profissional.** Nenhuma para o piso: 2 dias/semana cobrindo o corpo todo é o mínimo para qualquer objetivo, e o onboarding já começa em 2 dias.

### 1.2 Frequência por músculo e divisão conforme os dias

**Faixa com evidência.**

- **Hipertrofia:** com volume igual, treinar cada músculo 2×/semana deu efeito maior que 1× (0,49 contra 0,30). "Os grupos musculares grandes devem ser treinados pelo menos duas vezes por semana"; 3× ainda não se mostrou melhor que 2× [F6].
- **Atualização com 25 estudos:** sem diferença com volume igual; "a pessoa pode escolher a frequência semanal por grupo muscular conforme a preferência" [F7].
- **Força:** frequência maior dá mais força, mas o efeito "parece ser puxado pelo volume". Com volume igual, não houve efeito significativo [F8]. A meta-regressão de 2026 com 67 estudos achou efeito da frequência só na força, com retorno decrescente [F11].
- **ACSM 2009:** frequência de 2–3 dias/sem para iniciante, 3–4 para intermediário e 4–5 para avançado [F1]. O texto completo do ACSM 2009 fala de qual divisão usar em cada nível (corpo todo, superior/inferior, por grupo muscular), mas está atrás de paywall e **não foi lido** (ver Lacunas).

**Escolha que precisa de profissional.** A tabela de divisão por número de dias é convenção de mercado. A literatura só exige cerca de 2×/semana por músculo. Proposta para o CREF validar:

| Dias | Divisão candidata | Vezes por músculo/semana |
|---|---|---|
| 2 | Corpo todo A/B | 2 |
| 3 | Corpo todo A/B/C | 3 |
| 4 | Superior/Inferior ×2 | 2 |
| 5 | Superior/Inferior + Empurrar/Puxar/Pernas (ou corpo todo no 5º dia) | 2 |
| 6 | Empurrar/Puxar/Pernas ×2 | 2 |

Ao fixar a tabela, decidir também:

- se o iniciante com 5–6 dias deve ser limitado a 3–4 dias de força e o resto em aeróbico. O ACSM 2009 cita 2–3 dias para iniciante [F1].
- o que muda para quem está "voltando". Nenhuma fonte trata desse nível.

### 1.3 Volume semanal (séries por músculo)

**Faixa com evidência.**

- **Schoenfeld 2017:** cada série a mais por semana aumentou o ganho em 0,37%. Comparando menos de 5, de 5 a 9 e 10 ou mais séries por músculo, houve tendência a favor de mais volume (p = 0,074) [F9].
- **ACSM 2026:** a hipertrofia melhora com "volumes maiores (≥ 10 séries/semana)" [F2]; o infográfico fala em "~10 séries por grupo muscular" [F3].
- **Baz-Valle 2022:** 12–20 séries/músculo/semana como "recomendação padrão ótima" para homens jovens **treinados**, de 18 a 35 anos e com 1 ano ou mais de experiência [F10].
- **Pelland 2026:** o ganho cresce com o volume, com retorno decrescente, mais forte para força do que para hipertrofia. A série "indireta" (por exemplo, tríceps no supino) conta como meia série [F11].

**Escolha que precisa de profissional.** Nenhuma fonte separa o volume por nível. Proposta para o CREF:

- **Iniciante e voltando:** em torno de 6–10 séries/músculo/semana. O maior ganho vem de começar, e menos de 10 já funciona [F3][F9].
- **Intermediário:** 10–15.
- **Avançado:** 12–20 [F10].

Decidir também se a contagem usa a regra da meia série indireta [F11]. Ela muda quantas séries "diretas" a geração coloca.

### 1.4 Séries, repetições, intervalo e intensidade por nível

**Faixa com evidência.**

- **ACSM 2009 [F1]:**
  - **Iniciante:** cargas de **8–12RM**.
  - **Intermediário e avançado:** de 1 a 12RM em periodização, com ênfase em cargas pesadas (1–6RM) para força, intervalo de 3–5 min e velocidade moderada.
  - **Hipertrofia:** ênfase em 6–12RM, intervalo de **1–2 min** e várias séries.
  - **Resistência muscular:** 40–60% de 1RM, mais de 15 repetições, intervalo < 90 s.
  - **Ordem:** grupo grande antes do pequeno, multiarticular antes do monoarticular.
- **ACSM 2026 [F2]:** força melhora com ≥ 80% de 1RM, **2–3 séries**, amplitude completa, exercício no início da sessão e ≥ 2 sessões/sem. "Treinar até a falha muscular momentânea [...] não teve impacto consistente."
- **Faixa de carga:** a hipertrofia é parecida entre cargas baixas (≤ 60% de 1RM) e altas quando as séries vão até a falha; a força máxima é maior com carga alta [F12]. A proposta é um "contínuo" em que a hipertrofia acontece numa faixa larga de cargas [F13].
- **Intervalo:**
  - Para iniciantes, 60–120 s bastam para força; para treinados, acima de 2 min maximiza a força [F15].
  - Para hipertrofia, a evidência é mista [F14]. Em homens treinados, 3 min venceu 1 min em força e espessura muscular [F16].
  - A meta-análise bayesiana de 2024 vê pequeno benefício acima de 60 s e nenhuma diferença acima de 90 s [F17].
  - A revisão de 2009, que sugeria 30–60 s para hipertrofia por causa do hormônio do crescimento [F18], foi superada pelas de 2017–2024.

**Escolha que precisa de profissional.** Proposta de valores padrão para o CREF:

| Nível | Repetições | Intervalo | Margem até a falha |
|---|---|---|---|
| Iniciante e voltando | 8–12 nos compostos e 10–15 nos isolados | 60–120 s | 2–3 repetições (RIR 2–3) |
| Intermediário e avançado | Faixa mais larga, de 5 a 12 nos compostos | 2–3 min nos compostos e 60–90 s nos isolados | 1–2 repetições (RIR 1–2) |

A margem até a falha (RIR) é escolha de segurança: a falha não traz ganho consistente [F2].

### 1.5 Encaixar na duração da sessão (30/45/60/90 min)

**Faixa com evidência.** Nenhuma fonte lida converte minutos em número de exercícios. O Fitbod diz que "ajusta o número de exercícios ao tempo" escolhido, sem publicar a conta [F36]. Hevy e MacroFactor pedem a duração e não publicam a regra [F38][F40].

**Escolha que precisa de profissional.** É conta, não literatura. Uma série ocupa a execução (~30–60 s) mais o intervalo de 1.4, o que dá ~1,5–3 min por série, mais 5–10 min de aquecimento. Ordem de grandeza para o CREF validar:

| Duração | Séries de trabalho | Exercícios × séries |
|---|---|---|
| 30 min | 8–10 | 3–4 × 2–3 |
| 45 min | 12–15 | 4–5 × 3 |
| 60 min | 16–20 | 5–6 × 3 |
| 90 min | 24–30 | 7–9 × 3–4 |

**Conferir:** dias × séries da sessão precisam fechar com o volume semanal de 1.3. Por exemplo, 2 dias × 30 min dão ~18 séries por semana para o corpo inteiro, abaixo de 10 séries por músculo. Isso cumpre o mínimo de saúde [F5], mas não o volume de hipertrofia [F2]. O plano deve dizer isso à pessoa, em vez de fingir que não importa.

### 1.6 Periodização e progressão inicial

**Faixa com evidência.**

- **Progressão de carga:** "aumento de 2–10% na carga quando a pessoa consegue fazer 1 a 2 repetições acima do número desejado com a carga atual" [F1]. O Hevy publica a mesma lógica: sobe a carga quando a pessoa atinge o topo da faixa em todas as séries [F38].
- **Periodização:** no ACSM 2026, "periodização [...] não teve impacto consistente" em adultos saudáveis [F2]; o infográfico diz que "periodização complexa" é opcional [F3]. O ACSM 2009 recomendava periodizar para intermediário e avançado [F1].

**Escolha que precisa de profissional.**

- **Progressão:** dupla progressão (repetições primeiro, depois carga). Falta fixar o tamanho do degrau, entre 2 e 10%, e o arredondamento por equipamento: anilha de 1 ou 2 kg, halter de 2 kg.
- **Periodização:** para o Praticante, pode começar linear e sem bloco. Fases visíveis (o mesociclo de 4 semanas do JEFIT, com semana de descarga [F39]) são escolha de produto e de CREF, não exigência da evidência.
- **Regras sem fonte:** quando reduzir carga e como recalibrar depois de uma pausa. Nenhuma fonte lida publica regra para isso.

---

## 2. Meta de dieta

### 2.1 Gasto em repouso: Mifflin-St Jeor

**Faixa com evidência.**

- **Origem da fórmula:** derivada de 498 adultos saudáveis (247 mulheres, 251 homens) de **19 a 78 anos**, com peso normal ou obesidade, medidos por calorimetria indireta [F19]. Forma simplificada: homem = 10·kg + 6,25·cm − 5·idade + 5; mulher = 10·kg + 6,25·cm − 5·idade − 161 [F19]. No mesmo artigo, a Harris-Benedict superestimou o gasto medido em 5% [F19].
- **Validação:** a revisão sistemática da American Dietetic Association comparou Harris-Benedict, Mifflin-St Jeor, Owen e OMS/FAO/UNU. A Mifflin foi "a mais confiável": estima dentro de 10% do medido em mais pessoas, com e sem obesidade, e tem a menor faixa de erro. Mesmo assim, há "erros e limitações dignos de nota" no indivíduo, e idosos e minorias étnicas foram pouco representados [F20]. O percentual exato de acerto está no texto completo, que **não foi aberto**.

**Escolha que precisa de profissional.** Usar a Mifflin é escolha defensável e bate com o mercado (Yazio [N·F35]). Falta decidir:

- o que fazer abaixo de 19 anos, onde a equação não foi validada;
- se a meta mostra uma faixa, como o Noom faz [N·F65], ou um número com aviso de recalibração.

### 2.2 Fatores de atividade

**Faixa com evidência.**

- **Os cinco fatores do código (1,2/1,375/1,55/1,725/1,9) não têm fonte primária verificada.** A atribuição a um livro de fisiologia do exercício de McArdle et al. só apareceu em site comercial, sem confirmação.
- **FAO/OMS/UNU (2001, publicado em 2004), tabela 5.3** [F21]:
  - sedentário ou leve: **1,40–1,69**;
  - ativo ou moderado: **1,70–1,99**;
  - vigoroso: **2,00–2,40**;
  - "valores acima de 2,40 são difíceis de manter por muito tempo".
- O esquema dos EUA (IOM) começaria o sedentário em 1,0–1,39, segundo **fonte secundária**. Não foi verificado no original.

**Escolha que precisa de profissional.**

- **Que fator o sedentário recebe.** O 1,2 do código fica abaixo da faixa da FAO e, junto com o −20%, joga a meta abaixo da TMB (seção 4).
- **Como traduzir os campos do onboarding.** O onboarding pergunta dias de treino (2–6) e minutos por sessão, não "nível de atividade". A tradução desses campos em fator é escolha a fixar e a documentar. O Yazio, por exemplo, dá 1,33–1,36 a quem acabou de entrar [N·F35].

### 2.3 Déficit e superávit por objetivo, e ritmo

**Faixa com evidência.**

- **Perda: ritmo de 0,5–1% do peso por semana.** Helms et al.: "ingestão calórica que resulte em perda de cerca de 0,5 a 1% do peso por semana para maximizar a retenção de músculo" [F23].
- **Garthe et al. (atletas de elite, com 4 treinos de força por semana) [F22]:**
  - Grupo lento: alvo de 0,7%/sem, ingestão −19%, perda real de 0,7%/sem. A massa magra **subiu** 2,1%.
  - Grupo rápido: alvo de 1,4%/sem, ingestão −30%, perda real de 1,0%/sem. A massa magra ficou igual.
  - Conclusão dos autores: mirar 0,7%/semana.
- **ISSN:** a perda de gordura depende de déficit sustentado. "Quanto maior a gordura inicial, mais agressivo pode ser o déficit"; perda mais lenta preserva melhor a massa magra em quem é mais magro [F25].
- **Obesidade (AHA/ACC/TOS 2013):** uma das três formas de montar a dieta é um déficit de **500 ou 750 kcal/dia** [F30]. O valor vem do resumo oficial do ACC, que é **secundário**; o texto completo não foi aberto.
- **Mercado:** o MacroFactor recomenda 0,25–1%/sem [N·F68] e o Yazio usa 0,5 kg/sem como padrão [N·F35].
- **Ganho:** superávit de **~10–20%** e ganho de **~0,25–0,5% do peso por semana** para iniciante e intermediário; o avançado deve ser "mais conservador" [F26].

**Escolha que precisa de profissional.**

- **Ritmo-alvo de perda:** entre 0,5% e 1%/sem. A issue fixa ~1% como **máximo**, o que bate com [F23]. Falta fixar o **padrão**.
- **Formato da meta:** percentual do GET, como no código, ou ritmo em % do peso convertido em kcal, como no MacroFactor.
- **Superávit:** onde ficar entre 10% e 20%.
- **"Saúde e disposição" e "Desempenho":** o que recebem. A literatura lida não trata do "Desempenho no esporte" genérico; a posição conjunta ACSM/AND/DC manda encaminhar atleta a nutricionista para plano personalizado [F28].

### 2.4 Proteína e gordura em g/kg

**Faixa com evidência.**

- **Proteína, geral:** **1,4–2,0 g/kg/dia** "é suficiente para a maioria das pessoas que se exercitam" (ISSN [F24]). Acima de ~1,6 g/kg/dia (1,62), a suplementação não aumentou mais a massa magra (Morton 2018 [F27]).
- **Proteína em déficit, por kg de peso total:** 2,3–3,1 g/kg/dia "podem ser necessários" para manter a massa magra de quem já treina força (ISSN [F24]).
- **Proteína em déficit, por kg de massa magra:** a mesma faixa de 2,3–3,1 aparece **por kg de massa magra** em [F23] e [F25], para pessoas magras e treinadas.
- **Proteína em superávit:** 1,6–2,2 g/kg/dia [F26].
- **Gordura:**
  - 0,5–1,5 g/kg/dia em superávit [F26];
  - 15–30% das calorias em preparação para competição [F23];
  - 20–35% da energia para adultos, faixa de distribuição aceitável do IOM [F29]. As Academies revisitaram essa faixa em 2024; a conclusão **não foi lida**.

**Escolha que precisa de profissional.**

- **Base do g/kg.** As faixas mais altas são para quem treina força e é magro. Para pessoa com obesidade, o cálculo por peso total infla a proteína. O CRN precisa escolher a base: peso total, peso-alvo, peso ajustado ou massa magra estimada (o MacroFactor usa massa magra [N·F70]).
- **Valor para quem não treina força:** "Saúde e disposição" sem treino de força pode não precisar de 1,8 g/kg.
- **Piso de carboidrato e teto de gordura em % da energia:** precisam de valores, para o "resto" não virar zero (seção 4).

### 2.5 Piso, menores de 18, IMC baixo e gestação

**Faixa com evidência.**

- **Piso na TMB:** não há artigo primário entre os lidos que fixe "nunca abaixo da TMB". É uma regra prudente que o mercado usa: o Yazio "recomenda sempre cobrir a TMB" [N·F35], e o MyFitnessPal e o Noom usam pisos absolutos de 1.200/1.500 kcal [N·F29][N·F66]. A forma de dieta de 1.200–1.500 kcal (mulheres) da diretriz de obesidade vem do mesmo resumo **secundário** [F30].
- **IMC baixo:**
  - Adulto: magreza é IMC < 18,5 [F32].
  - Dos 5 aos 19 anos: magreza é "IMC-para-idade mais de dois desvios-padrão abaixo da mediana de referência" [F31]. **O corte de 18,5 não serve para menores de 18.**
- **Menores de 18:**
  - A Mifflin não foi derivada nem validada abaixo de 19 anos [F19].
  - A Academia Americana de Pediatria recomenda que a prevenção foque em "estilo de vida saudável, e não no peso", porque parte dos adolescentes que tentam emagrecer desenvolve transtorno alimentar [F34].
  - A OMS pede fortalecimento 3 dias/semana nessa faixa [F5].
- **Gestação:**
  - O ganho de peso recomendado vai de 5–9 kg (IMC ≥ 30) a 12,5–18 kg (IMC < 18,5) (IOM 2009 [F33], valores via **resumo secundário** da tabela).
  - A OMS recomenda manter atividade física na gestação [F5].
  - Nenhuma fonte lida sustenta déficit calórico gerado sem acompanhamento na gestação.

**Escolha que precisa de profissional.** As regras de segurança da issue estão alinhadas com essas fontes, e só a do IMC precisa de ajuste:

- Para o **IMC de menores**, usar escore-z da OMS, ou simplesmente não gerar meta de perda para menores, o que a issue já faz.
- Definir **o que o menor recebe:** manutenção calculada por qual equação, ou nenhuma meta numérica, só orientação de hábito. É decisão de CRN.

---

## 3. O que os apps publicam sobre divisão, volume e progressão

Só o que está em página oficial. Nenhum dos quatro publica a regra inteira.

| App | Divisão | Volume e repetições | Progressão | Fonte |
|---|---|---|---|---|
| **Fitbod** | A pessoa escolhe corpo todo, superior/inferior ou empurrar/puxar/pernas. Pontua os ~800 exercícios por recuperação, objetivo, experiência, divisão e equipamento | Força: "1–6 repetições com cargas altas (~85–100% de 1RM), intervalo de 3–5 min". Hipertrofia: "6–12 repetições", com algum trabalho de 1–5 e 15–25, e **10–20 séries por grupo muscular por semana**. Ajusta o número de exercícios à duração | 1RM estimado pelas séries registradas "com equações de predição (como a de Epley)"; o RIR registrado muda a carga seguinte. Recuperação de 0–100% por músculo, com preferência para músculos não treinados nas últimas 48–72 h; a central de ajuda fala em 100% depois de 6 a 7 dias (**secundária**: trecho de busca, a página dá 403) | [F35][F36][F37] |
| **Hevy (Trainer)** | Pergunta dias, duração e músculo prioritário; não publica a regra de divisão | Mostra séries por parte do corpo e se estão na faixa "recomendada (verde)", sem dizer a faixa | "É preciso atingir o topo da faixa de repetições com uma carga em todas as séries para o Trainer aumentar" | [F38] |
| **JEFIT (Adaptive Plan)** | Não publica | Não publica | Blocos de 4 semanas: entrada, acumulação, intensificação e descarga, na qual "o volume cai pela metade". Checagem semanal decide se avança de fase | [F39] |
| **MacroFactor Workouts** | Pergunta objetivo (força ou hipertrofia), 5 pontos de foco, até 5 músculos despriorizados, dias, minutos, equipamento, divisão (corpo todo, superior/inferior...), descarga e experiência | Gera séries e repetições, mas não publica os números por nível | "Smart Progression" ajusta carga e repetições pelo desempenho, pelo RIR-alvo e pela faixa de repetições; só começa depois de registros | [F40][F41][F42] |

O Carbon é app de nutrição e não gera treino; o que publica sobre meta calórica já está em [`apps-nutricao.md`](apps-nutricao.md) [N·F72].

**Leitura.** O mercado converge no mesmo questionário: objetivo, experiência, dias, duração, equipamento e prioridade. As faixas que o Fitbod publica são as do ACSM 2009 [F1] e de [F10]. A progressão do Hevy é a regra do ACSM 2009 [F1]. Nenhum dos quatro publica volume por nível nem a conta de duração → exercícios. Essa parte o Eleva terá de fixar com CREF.

---

## 4. Enquadramento legal no Brasil

Relato do que o texto diz. **Não é parecer jurídico.**

### 4.1 Lei 9.696/1998: Educação Física [F43]

- **Art. 1º:** "O exercício das atividades de Educação Física e a designação de Profissional de Educação Física é prerrogativa dos profissionais regularmente registrados nos Conselhos Regionais de Educação Física."
- **Art. 3º:** "Compete ao Profissional de Educação Física coordenar, planejar, programar, supervisionar, dinamizar, dirigir, organizar, avaliar e executar trabalhos, programas, planos e projetos [...] nas áreas de atividades físicas e do desporto."
- **Lei 14.386/2022:** alterou a lei e deu ao CONFEF competência para "editar os atos necessários à interpretação e à execução" dela (art. 5º-A, II).

### 4.2 Resoluções CONFEF

- **Resolução 46/2002** [F47] descreve a intervenção do profissional "de prescrição e de orientação de sessões de atividades físicas". Na preparação física, o profissional diagnostica, planeja e prescreve.
- **Resolução 542/2024** [F46] regula o atendimento à distância (texto lido em repositório de terceiros, **secundário**):
  - Modalidades: teleconsulta com anamnese, teleaula ("prescrição e acompanhamento do exercício físico", síncrona ou assíncrona), teleconsultoria e análise de metadados.
  - Exigências: registro ativo, anamnese, termo de consentimento, programa "devidamente assinado e carimbado com nome e registro profissional" e identificação visível do registro na oferta pela internet.
  - **Art. 12:** "Caracteriza exercício ilegal da profissão, mesmo em ambiente virtual, a orientação e/ou anúncio" por quem não tem registro.
  - Define conteúdo "Genérico", "não direcionado a um cliente ou a turma", **sem proibi-lo**.
  - **Não menciona inteligência artificial nem programa gerado automaticamente.**

### 4.3 Lei 8.234/1991: Nutrição [F44]

- **Art. 3º, atividades privativas do nutricionista:**
  - **VII:** "assistência e educação nutricional a coletividades ou indivíduos, **sadios ou enfermos**, em instituições públicas e privadas e em consultório de nutrição e dietética".
  - **VIII:** "assistência dietoterápica hospitalar, ambulatorial e a nível de consultórios de nutrição e dietética, prescrevendo, planejando, analisando, supervisionando e avaliando dietas para enfermos".
- **Art. 4º, VII:** atribui também ao nutricionista a "prescrição de suplementos nutricionais, necessários à complementação da dieta".

**Ponto para a issue:** a issue se apoia no inciso VIII (enfermos). O **inciso VII alcança pessoa sadia**. A triagem clínica tira do fluxo os casos do VIII, mas não responde ao VII.

### 4.4 Resoluções CFN

- **Resolução CFN 856/2026, novo Código de Ética e Conduta** [F48][F49]. Texto via LegisWeb, **secundário**; a notícia oficial do CFN confirma o tema, não os artigos.
  - **Art. 3º, § 2º:** todo espaço "físico ou virtual" é extensão da prática profissional.
  - **Art. 34:** admite ferramenta tecnológica e IA como apoio, com responsabilidade integral do profissional. O parágrafo único diz que a IA não pode substituir o nutricionista na interação direta, na análise técnica nem na autonomia profissional.
  - **Art. 35:** o nutricionista deve validar as saídas automatizadas antes de usá-las.
  - **Art. 37:** deve indicar o uso de IA.
  - **Arts. 44–45 e 102:** a telenutrição exige inscrição no e-Nutricionista.
  - **Vigência:** o art. 117 diz 90 dias após a publicação no DOU de 28/04/2026. Nota do LegisWeb fala em prorrogação para 23/01/2027 por uma "Resolução CFN nº 156/2026" cujo número **não foi confirmado** na fonte oficial.
- **Resolução CFN 760/2023:** regula a telenutrição e o e-Nutricionista, segundo **trecho de busca**; não foi lida.

### 4.5 Contravenção penal

**Decreto-Lei 3.688/1941, art. 47** [F45]: "Exercer profissão ou atividade econômica ou anunciar que a exerce, sem preencher as condições a que por lei está subordinado o seu exercício."

### 4.6 O que se aplica a plano gerado por sistema para usuário sem profissional

**O que o texto alcança.**

- Os códigos e resoluções do CFN e do CONFEF obrigam **o profissional registrado**. Valem para o Eleva quando há especialista vinculado ao aluno.
- As leis 9.696 e 8.234 definem atividades do profissional: "planos e programas" de atividade física, e "assistência e educação nutricional" de sadios. A Resolução CONFEF 542/2024, art. 12, estende o exercício ilegal ao "ambiente virtual" para "orientação e/ou anúncio" por não registrado.

**O que fica em aberto, sem resposta nos textos lidos.**

1. Software que gera plano individual, sem pessoa física no meio, "exerce" a atividade? As leis falam de pessoas e profissões; nenhum texto lido trata de sistema automatizado.
2. Ter um profissional com registro como responsável técnico pelas **regras**, sem ver cada plano, é suficiente? A 542/2024 pede programa "assinado e carimbado" por beneficiário, o que pressupõe atendimento individual.
3. A linha entre "conteúdo genérico", que a 542/2024 define sem proibir, e "plano individual" para um sistema que personaliza por idade, peso e objetivo.
4. A posição do CFN e do CONFEF, e a jurisprudência, sobre apps que vendem plano gerado (Fitbod, MacroFactor e Yazio operam no Brasil). Não foi pesquisada.

**Implicação prática, sem parecer:** tudo isso reforça três coisas que a issue já sugere:

- linguagem de "sugestão/educação", não de "prescrição";
- regras **fixadas e assinadas por CREF e CRN** responsáveis, documentadas em ADR;
- encaminhamento a profissional nos casos clínicos.

A decisão de enquadramento é de advogado.

---

## 5. Tabela-resumo: regra candidata → faixa → fonte → quem decide

| Regra candidata | Faixa com evidência | Fonte | Quem fixa o valor |
|---|---|---|---|
| Piso de treino de força | ≥ 2 dias/sem, todos os grupos grandes; 3 dias para 5–17 anos | [F5][F3][F4] | Já fixo pela evidência |
| Divisão por nº de dias (2–6) | Só exige ~2×/sem por músculo; com volume igual a frequência é livre | [F6][F7][F8] | **CREF** (a tabela da 1.2 é convenção) |
| Séries/músculo/semana: iniciante e voltando | Qualquer volume > 0 funciona; dose-resposta | [F3][F9] | **CREF** (proposta 6–10) |
| Séries/músculo/semana: intermediário | ≥ 10 para hipertrofia | [F2][F9] | **CREF** (proposta 10–15) |
| Séries/músculo/semana: avançado | 12–20 em treinados; retorno decrescente | [F10][F11] | **CREF** |
| Repetições: iniciante | 8–12RM | [F1] | **CREF** |
| Repetições: hipertrofia (geral) | Faixa larga de cargas, com esforço próximo da falha | [F12][F13] | **CREF** |
| Força | ≥ 80% de 1RM, 2–3 séries | [F2][F3] | **CREF** |
| Intervalo | Iniciante 60–120 s; treinado > 2 min para força; > 60–90 s não muda hipertrofia | [F15][F16][F17][F1] | **CREF** |
| Falha muscular | Não muda o resultado de forma consistente | [F2] | **CREF** (proposta RIR 1–3) |
| Progressão de carga | +2–10% ao passar 1–2 repetições da meta | [F1][F38] | **CREF** (degrau e arredondamento) |
| Exercícios por sessão conforme duração | Sem fonte; conta de séries × (execução + intervalo) | — ([F36] não publica) | **CREF** (proposta na 1.5) |
| Periodização | Não muda o resultado de forma consistente em adultos saudáveis | [F2][F3] | Produto + **CREF** |
| TMB | Mifflin-St Jeor, 19–78 anos; a mais confiável, mas erra no indivíduo | [F19][F20] | Já fixo; **CRN** para < 19 anos |
| Fator de atividade | FAO: sedentário 1,40–1,69; ativo 1,70–1,99; vigoroso 2,00–2,40. Fonte do 1,2–1,9 não verificada | [F21] | **CRN** (inclusive a tradução dias × minutos → fator) |
| Déficit (perder gordura) | −19% deu 0,7%/sem com ganho de massa magra; 500–750 kcal/dia em obesidade | [F22][F30] | **CRN** |
| Superávit (ganhar massa) | +10–20%; 0,25–0,5% do peso/sem | [F26] | **CRN** |
| Ritmo máximo de perda | 0,5–1% do peso/sem | [F23][F22] | Issue fixa ~1%; **CRN** fixa o padrão |
| Proteína | 1,4–2,0 g/kg em geral; ~1,6 platô; 1,6–2,2 em superávit; 2,3–3,1 **por kg de massa magra** em déficit | [F24][F27][F26][F23][F25] | **CRN** (inclusive a base de peso em obesidade) |
| Gordura | 0,5–1,5 g/kg; 20–35% da energia (IOM); 15–30% em corte | [F26][F29][F23] | **CRN** |
| Piso calórico | TMB (prática de mercado, sem artigo primário lido) | [N·F35] | Issue fixa; **CRN** confirma |
| Menores de 18 | Mifflin não validada; foco em hábito, não em peso; IMC por escore-z | [F19][F34][F31] | Issue fixa "sem déficit"; **CRN** decide o resto |
| IMC baixo | Adulto < 18,5; 5–19 anos: IMC-para-idade < −2 DP | [F32][F31] | Já fixo pela OMS |
| Gestação | Ganho de 5–18 kg conforme IMC prévio; atividade recomendada | [F33][F5] | Issue: sem dieta e encaminhar |

---

## 6. Conferência de `energyTargets.ts` contra as fontes

| Item no código | Valor | O que a fonte diz | Situação |
|---|---|---|---|
| `calculateTMB` | 10·kg + 6,25·cm − 5·idade + 5 / −161 | Idêntico à forma simplificada de Mifflin [F19] | **Confere.** Falta barrar ou tratar idade < 19, fora da validação |
| `ACTIVITY_FACTORS` | 1,2 / 1,375 / 1,55 / 1,725 / 1,9 | Origem não verificada. FAO: sedentário/leve 1,40–1,69, ativo 1,70–1,99, vigoroso 2,00–2,40 [F21] | **Sem fonte.** O 1,2 fica abaixo da faixa sedentária da FAO; o 1,9 cai em "vigoroso" |
| `GOAL_FACTORS.cutting` | 0,8 (−20%) | −19% → 0,7%/sem com ganho de massa magra [F22]; ritmo de 0,5–1%/sem [F23] | **Confere com a faixa**, mas o % do GET não garante o teto de 1%/sem nem o piso (abaixo) |
| `GOAL_FACTORS.bulking` | 1,1 (+10%) | +10–20% para iniciante/intermediário; avançado mais conservador [F26] | **Confere** (ponta baixa) |
| Piso na TMB | Não existe | Regra da issue | **Diverge.** Sedentário + cutting = 1,2 × 0,8 = **0,96 × TMB**, abaixo da TMB. Com 1,375, fica em 1,10 × TMB |
| Proteína cutting | 2,2 g/kg de peso total | 2,3–3,1 g/kg de **massa magra** para magro e treinado [F23][F25]; ISSN 2,3–3,1 g/kg para quem treina força em déficit [F24] | **Diverge na base.** Para magro e treinado, 2,2 g/kg de peso total ≈ 2,5 g/kg de massa magra (com 12% de gordura): confere. Para obesidade infla: 130 kg → 286 g/dia |
| Proteína manutenção | 1,8 g/kg | 1,4–2,0 [F24]; platô ~1,6 [F27] | **Confere.** Pode ser alto para quem não treina força |
| Proteína bulking | 2,0 g/kg | 1,6–2,2 [F26] | **Confere** |
| Gordura | 0,8 / 0,9 / 1,0 g/kg | 0,5–1,5 g/kg [F26]; 20–35% da energia [F29] | **Confere** na maioria dos casos. Não há checagem em % da energia |
| Carbo pelo resto | `Math.max(0, …)` | Iraki sugere ≥ 3–5 g/kg em superávit para quem treina [F26] | **Risco.** Com peso alto e meta baixa, proteína e gordura por kg de peso total comem a energia e o carbo cai a quase zero sem aviso. Exemplo: 130 kg, meta de 2.400 kcal → 286 g de proteína + 104 g de gordura = 2.080 kcal, sobram ~80 g de carbo |
| Objetivos | `cutting` / `maintenance` / `bulking` | O onboarding tem 4 objetivos | **Lacuna de mapeamento:** "Saúde e disposição" e "Desempenho no esporte" precisam de regra (CRN) |

---

## 7. Lacunas

O que não foi possível verificar e o que se tentou:

| Lacuna | O que se tentou |
|---|---|
| **Texto completo do ACSM 2009** (séries por exercício por nível; divisão corpo todo, superior/inferior ou por grupo por nível) | journals.lww.com devolve 402 (paywall). Só o resumo foi lido [F1] |
| **Texto completo do ACSM 2026** (tabelas por variável, recomendações para iniciante) | Resumo [F2] e infográfico oficial [F3] lidos; a página de notícia do ACSM não traz os números |
| **NSCA** (posicionamentos e o livro *Essentials*) | Não pesquisado a fundo; o livro não é aberto |
| **Origem dos fatores 1,2–1,9** | Só site comercial atribui a McArdle et al. (1996). Faixas IOM vistas só em fonte secundária |
| **Percentual de acerto da Mifflin** no texto de Frankenfield 2005 | Só o resumo foi lido [F20] |
| **Diretriz AHA/ACC/TOS 2013** (500–750 kcal; 1.200–1.500 kcal) | Resumo do Europe PMC sem texto; valores pelo resumo do ACC [F30] (**secundário**) |
| **IOM 2009 gestação** | Tabela via resumo secundário [F33]; capítulo não aberto |
| **IOM AMDR revisado em 2024** | Conclusão não lida [F29] |
| **Regra para "voltando"**, volume por nível e duração → exercícios | Nenhuma fonte primária trata; é escolha de CREF |
| **Regra de redução de carga e de volta após pausa** | Hevy, Fitbod, JEFIT e MacroFactor não publicam números |
| **Central de ajuda do Fitbod** ("How Fitbod Creates Your Workout") | 403. A recuperação de 6–7 dias veio de trecho de busca [F37] |
| **"Science Behind Hevy Trainer"** | Fica dentro do app; não está na web |
| **Resolução CONFEF 542/2024 no site oficial** | Lida em repositório de terceiros [F46]; confef.org.br não foi aberto |
| **Vigência da Resolução CFN 856/2026** e a "Resolução 156/2026" que a prorrogaria | Só nota do LegisWeb; não confirmado no DOU nem no CFN |
| **Resolução CFN 760/2023** (telenutrição) | Só trecho de busca |
| **Posição do CFN/CONFEF ou jurisprudência sobre app que gera plano sem profissional** | Não pesquisado; pedir a advogado |
| **Proteína para "Saúde e disposição" sem treino de força** e regra para "Desempenho no esporte" | A literatura de esporte não cobre o público geral; decisão de CRN |

---

## Fontes

**Treino de força e atividade física**

- **[F1]** American College of Sports Medicine. "Progression models in resistance training for healthy adults." *Med Sci Sports Exerc* 2009;41(3):687–708. doi:10.1249/MSS.0b013e3181915670. PMID 19204579 (resumo lido via Europe PMC). https://europepmc.org/article/MED/19204579
- **[F2]** Currier BS, D'Souza AC, Singh MAF, Lowisz CV, Rawson ES, Schoenfeld BJ et al. "American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews." *Med Sci Sports Exerc* 2026;58(4):851–872. doi:10.1249/MSS.0000000000003897. PMID 41843416 (resumo). https://europepmc.org/article/MED/41843416
- **[F3]** ACSM, infográfico "5 Things to Know About Creating an Effective Resistance Training Plan" (2026). https://acsm.org/wp-content/uploads/2026/03/Resistance-Training-Position-Stand-infographic.pdf
- **[F4]** Garber CE et al. "ACSM position stand. Quantity and quality of exercise [...]." *Med Sci Sports Exerc* 2011;43(7):1334–1359. doi:10.1249/MSS.0b013e318213fefb. https://europepmc.org/article/MED/21694556
- **[F5]** Bull FC et al. "World Health Organization 2020 guidelines on physical activity and sedentary behaviour." *Br J Sports Med* 2020;54(24):1451–1462. doi:10.1136/bjsports-2020-102955 (texto completo, PMC7719906). https://europepmc.org/article/PMC/PMC7719906
- **[F6]** Schoenfeld BJ, Ogborn D, Krieger JW. "Effects of Resistance Training Frequency on Measures of Muscle Hypertrophy." *Sports Med* 2016;46(11):1689–1697. doi:10.1007/s40279-016-0543-8.
- **[F7]** Schoenfeld BJ, Grgic J, Krieger J. "How many times per week should a muscle be trained to maximize muscle hypertrophy?" *J Sports Sci* 2019;37(11):1286–1295. doi:10.1080/02640414.2018.1555906.
- **[F8]** Grgic J et al. "Effect of Resistance Training Frequency on Gains in Muscular Strength." *Sports Med* 2018;48(5):1207–1220. doi:10.1007/s40279-018-0872-x.
- **[F9]** Schoenfeld BJ, Ogborn D, Krieger JW. "Dose-response relationship between weekly resistance training volume and increases in muscle mass." *J Sports Sci* 2017;35(11):1073–1082. doi:10.1080/02640414.2016.1210197.
- **[F10]** Baz-Valle E et al. "A Systematic Review of The Effects of Different Resistance Training Volumes on Muscle Hypertrophy." *J Hum Kinet* 2022;81:199–210. doi:10.2478/hukin-2022-0017.
- **[F11]** Pelland JC et al. "The Resistance Training Dose Response: Meta-Regressions Exploring the Effects of Weekly Volume and Frequency on Muscle Hypertrophy and Strength Gains." *Sports Med* 2026;56(2):481–505. doi:10.1007/s40279-025-02344-w.
- **[F12]** Schoenfeld BJ et al. "Strength and Hypertrophy Adaptations Between Low- vs. High-Load Resistance Training." *J Strength Cond Res* 2017;31(12):3508–3523. doi:10.1519/JSC.0000000000002200.
- **[F13]** Schoenfeld BJ et al. "Loading Recommendations for Muscle Strength, Hypertrophy, and Local Endurance: A Re-Examination of the Repetition Continuum." *Sports* 2021;9(2):32. doi:10.3390/sports9020032.
- **[F14]** Grgic J et al. "The effects of short versus long inter-set rest intervals in resistance training on measures of muscle hypertrophy." *Eur J Sport Sci* 2017;17(8):983–993. doi:10.1080/17461391.2017.1340524.
- **[F15]** Grgic J et al. "Effects of Rest Interval Duration in Resistance Training on Measures of Muscular Strength." *Sports Med* 2018;48(1):137–151. doi:10.1007/s40279-017-0788-x.
- **[F16]** Schoenfeld BJ et al. "Longer Interset Rest Periods Enhance Muscle Strength and Hypertrophy in Resistance-Trained Men." *J Strength Cond Res* 2016;30(7):1805–1812. doi:10.1519/JSC.0000000000001272.
- **[F17]** Singer A et al. "Give it a rest: a systematic review with Bayesian meta-analysis on the effect of inter-set rest interval duration on muscle hypertrophy." *Front Sports Act Living* 2024;6:1429789. doi:10.3389/fspor.2024.1429789.
- **[F18]** de Salles BF et al. "Rest interval between sets in strength training." *Sports Med* 2009;39(9):765–777. doi:10.2165/11315230-000000000-00000.

**Energia e nutrição**

- **[F19]** Mifflin MD, St Jeor ST et al. "A new predictive equation for resting energy expenditure in healthy individuals." *Am J Clin Nutr* 1990;51(2):241–247. doi:10.1093/ajcn/51.2.241. PMID 2305711.
- **[F20]** Frankenfield D, Roth-Yousey L, Compher C. "Comparison of predictive equations for resting metabolic rate in healthy nonobese and obese adults: a systematic review." *J Am Diet Assoc* 2005;105(5):775–789. doi:10.1016/j.jada.2005.02.005. PMID 15883556.
- **[F21]** FAO/WHO/UNU. *Human energy requirements*. Report of a Joint Expert Consultation, Rome, 17–24 Oct 2001 (FAO Food and Nutrition Technical Report Series 1, 2004), cap. 5, tabela 5.3. https://www.fao.org/4/y5686e/y5686e07.htm
- **[F22]** Garthe I et al. "Effect of two different weight-loss rates on body composition and strength and power-related performance in elite athletes." *Int J Sport Nutr Exerc Metab* 2011;21(2):97–104. doi:10.1123/ijsnem.21.2.97. PMID 21558571.
- **[F23]** Helms ER, Aragon AA, Fitschen PJ. "Evidence-based recommendations for natural bodybuilding contest preparation: nutrition and supplementation." *J Int Soc Sports Nutr* 2014;11:20. doi:10.1186/1550-2783-11-20.
- **[F24]** Jäger R et al. "International Society of Sports Nutrition Position Stand: protein and exercise." *J Int Soc Sports Nutr* 2017;14:20. doi:10.1186/s12970-017-0177-8.
- **[F25]** Aragon AA et al. "International society of sports nutrition position stand: diets and body composition." *J Int Soc Sports Nutr* 2017;14:16. doi:10.1186/s12970-017-0174-y.
- **[F26]** Iraki J, Fitschen P, Espinar S, Helms E. "Nutrition Recommendations for Bodybuilders in the Off-Season: A Narrative Review." *Sports* 2019;7(7):154. doi:10.3390/sports7070154.
- **[F27]** Morton RW et al. "A systematic review, meta-analysis and meta-regression of the effect of protein supplementation on resistance training-induced gains in muscle mass and strength in healthy adults." *Br J Sports Med* 2018;52(6):376–384. doi:10.1136/bjsports-2017-097608.
- **[F28]** Thomas DT, Erdman KA, Burke LM. "American College of Sports Medicine Joint Position Statement. Nutrition and Athletic Performance." *Med Sci Sports Exerc* 2016;48(3):543–568. doi:10.1249/MSS.0000000000000852.
- **[F29]** Institute of Medicine. *Dietary Reference Intakes for Energy, Carbohydrate, Fiber, Fat, Fatty Acids, Cholesterol, Protein, and Amino Acids* (2002/2005), AMDR. Lido via resultado de busca que cita a página das National Academies (**secundária** quanto ao texto exato). https://nap.nationalacademies.org/read/11537/chapter/6
- **[F30]** Jensen MD et al. "2013 AHA/ACC/TOS guideline for the management of overweight and obesity in adults." *Circulation* 2014;129(25 Suppl 2):S102–S138. doi:10.1161/01.cir.0000437739.71477.ee. Números via resumo do ACC (**secundário**). https://www.acc.org/Latest-in-Cardiology/Journal-Scans/2014/07/10/16/17/2013-AHA-ACC-TOS-Guideline-for-the-Management-of-Overweight
- **[F31]** OMS, fact sheet "Malnutrition" (magreza de 5–19 anos = IMC-para-idade < −2 DP). https://www.who.int/news-room/fact-sheets/detail/malnutrition
- **[F32]** OMS, Global Health Observatory, "Body mass index" (adulto: baixo peso IMC < 18,5). https://www.who.int/data/gho/data/themes/topics/topic-details/GHO/body-mass-index
- **[F33]** Institute of Medicine / National Research Council. *Weight Gain During Pregnancy: Reexamining the Guidelines* (2009). Tabela via resumos (**secundário**). https://www.nationalacademies.org/read/12584/chapter/3
- **[F34]** Golden NH, Schneider M, Wood C; AAP Committee on Nutrition et al. "Preventing Obesity and Eating Disorders in Adolescents." *Pediatrics* 2016;138(3):e20161649. doi:10.1542/peds.2016-1649.

**Apps (páginas oficiais, acesso em 09/10/2026)**

- **[F35]** Fitbod, "How Fitbod Generates Your Personalized Workouts: Meet The Fitbod Algorithm". https://fitbod.me/blog/fitbod-algorithm/
- **[F36]** Fitbod, "How Fitbod Builds Personalized Strength Programs Without A Trainer". https://fitbod.me/blog/how-fitbod-builds-personalized-strength-programs-without-a-trainers/
- **[F37]** Fitbod Help, "Muscle Recovery" (página devolve 403; conteúdo por trecho de busca, **secundário**). https://help.fitbod.me/hc/en-us/articles/360006269014-Muscle-Recovery
- **[F38]** Hevy, "Hevy Trainer: Adaptive Strength Programming System" (inclui FAQ). https://www.hevyapp.com/features/workout-plan-generator/
- **[F39]** JEFIT, "Adaptive Plan". https://www.jefit.com/ai-workout-tracker/adaptive-plan
- **[F40]** MacroFactor Help, "Create a New Program via Smart Generation". https://help.macrofactorapp.com/en/articles/285-create-a-new-program-via-smart-generation
- **[F41]** MacroFactor Help, "What Information Does MacroFactor Workouts Use to Generate My Program?" (trecho de busca). https://help.macrofactorapp.com/en/articles/370-what-information-does-macrofactor-workouts-use-to-generate-my-program
- **[F42]** MacroFactor Help, "Understanding and Using Smart Progressions" (trecho de busca). https://help.macrofactorapp.com/en/articles/305-understanding-and-using-smart-progressions

**Legislação e conselhos**

- **[F43]** Lei nº 9.696, de 1º de setembro de 1998 (com redação da Lei nº 14.386/2022). https://www.planalto.gov.br/ccivil_03/leis/l9696.htm
- **[F44]** Lei nº 8.234, de 17 de setembro de 1991. https://www.planalto.gov.br/ccivil_03/leis/1989_1994/l8234.htm
- **[F45]** Decreto-Lei nº 3.688, de 3 de outubro de 1941 (Lei das Contravenções Penais), art. 47. https://www.planalto.gov.br/ccivil_03/decreto-lei/del3688.htm
- **[F46]** Resolução CONFEF nº 542, de 05/08/2024 (DOU de 13/08/2024), texto em repositório de terceiros (**secundário**). https://www.normasbrasil.com.br/norma/resolucao-542-2024_463073.html
- **[F47]** Resolução CONFEF nº 46, de 18/02/2002, texto em repositório de terceiros (**secundário**). https://www.legisweb.com.br/legislacao/?id=98644
- **[F48]** Resolução CFN nº 856, de 25/04/2026 (Código de Ética e Conduta), texto em repositório de terceiros (**secundário**). https://www.legisweb.com.br/legislacao/?id=494878
- **[F49]** CFN, "CFN atualiza Código de Ética e reforça proteção ao paciente e à prática profissional na nutrição", 30/04/2026. https://cfn.org.br/cfn-atualiza-codigo-de-etica-e-reforca-protecao-ao-paciente-e-a-pratica-profissional-na-nutricao/

**Fontes dos outros arquivos de pesquisa citadas aqui:** [N·F29], [N·F35], [N·F65], [N·F66], [N·F68], [N·F70] e [N·F72] estão em [`apps-nutricao.md`](apps-nutricao.md).
