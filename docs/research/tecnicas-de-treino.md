# Técnicas de treino de força: catálogo, evidência e modelagem para a prescrição série a série

Status: concluído em 20/10/2026; lacunas restantes: cerca de 40 marcas de "não confirmado" e 20 de "trecho de busca" (a maioria em parâmetros de métodos sem estudo e em apps sem central pública), 12 lacunas distintas (ver seção 7). Técnicas cobertas: 38. Apps cobertos: Hevy, Strong, MacroFactor Workouts, StrengthLog, Fitbod, Trainerize, TrueCoach, MFIT Personal, Tecnofit, Treinus.

> Pesquisa feita em 20/10/2026 para desenhar a tabela de séries prescritas do Eleva Pro (`set_type` + blocos opcionais). Fontes primárias (artigo científico lido no resumo ou no texto completo em PubMed/PMC/Europe PMC/periódico, central de ajuda oficial do app, material do autor do método, página oficial do fabricante) aparecem como **[Fn]**. Fontes secundárias (blogs, sites de academia, comparativos de concorrente, fóruns) aparecem como **[Sn]** e servem só para terminologia brasileira e pistas, nunca sustentando sozinhas um fato central. Onde nenhuma fonte primária confirma, está escrito **não confirmado**. Todas as fontes foram acessadas em 20/10/2026.
>
> Ressalvas de método:
> - Vários resumos foram lidos pela API do Europe PMC (`/europepmc/webservices/rest/search?query=DOI:...`), que devolve o resumo integral quando o PubMed bloqueia leitura automática. A URL citada é a do DOI.
> - Artigos fechados (Lixandrão 2018, Prestes 2019, Enes 2021, Refalo 2023, Robinson 2024, Angleri 2017, Schoenfeld 2015 e 2017) foram lidos **só no resumo**. Números que não estão no resumo não foram usados.
> - Quando um fato veio só do trecho que o buscador mostrou de uma página oficial que bloqueou a leitura, está marcado **(trecho de busca)**.
> - Não instalei os apps. A descrição deles vem da central de ajuda; onde não há central pública (MFIT para técnicas, Tecnofit, Treinus), está "não confirmado".
> - Parâmetros "típicos" de técnicas sem estudo (FST-7, 21s, wave loading, heavy duty) são convenção de uso corrente, registrada a partir de fonte secundária ou marcada "não confirmado". Não são recomendação.
> - Evidência é quase toda de adultos jovens, majoritariamente homens, em intervenções de 6 a 12 semanas. Isso limita a generalização para o Praticante típico do Eleva Pro.

---

## 1. Resumo executivo: os 10 achados mais úteis

1. **Nenhuma técnica avançada ganha do treino tradicional em hipertrofia quando o volume é igualado.** A meta-análise mais recente (24 estudos, 2026) dá g = 0,046 para hipertrofia (IC −0,057 a 0,149, não significativo) e g = 0,351 para força [F2]. Drop-set [F3][F4], cluster [F7], superset [F10], pirâmide [F21] e pré-exaustão [F18] empatam com séries tradicionais. O valor das técnicas é **tempo** e **variedade**, não "mais músculo".
2. **O ganho real é de tempo, e é grande.** Supersets cortam cerca de 37% da sessão sem perder volume [F10]; drop-set leva de metade a um terço do tempo [F3]; supersets, drop-sets e rest-pause "aproximadamente reduzem pela metade" o tempo mantendo o volume [F9]. Para o Praticante sem tempo, isso é argumento de produto.
3. **Rest-pause é a técnica com o sinal mais consistente.** Única com coeficiente positivo significativo para hipertrofia na meta-análise de 2026 [F2]; maior espessura de coxa e resistência local que o tradicional em treinados [F5]; um pouco mais de 1RM no agachamento com volume igualado [F6]. O efeito é pequeno.
4. **Proximidade da falha importa para hipertrofia, não para força.** A meta-regressão de 2024 achou que a hipertrofia cresce conforme a série termina mais perto da falha (inclinação do RIR negativa, IC sem zero) e que a força não muda [F13]. Mas ir até a falha absoluta não é superior [F11][F12]. Isso justifica um campo de **RIR/RPE alvo por série** mais do que um tipo "falha".
5. **As pessoas erram o RIR em cerca de 1 repetição** (subestimam ~0,95 rep), erram menos perto da falha e em séries de menos de 12 reps [F24]. RIR/RPE é um campo útil, mas o valor registrado é uma estimativa.
6. **O mercado converge em 4 tipos de série: Normal, Aquecimento, Drop-set, Falha.** Hevy [F30] e Strong [F33] têm exatamente esses (Strong chama de "tags"); MacroFactor acrescenta **Myo** [F34]. Superset/agrupamento **nunca** é tipo de série: é uma ligação entre exercícios em todos eles [F31][F33][F36][F38].
7. **Drop-set e myo-reps são modelados como "uma série com várias entradas".** MacroFactor registra cada redução de carga do drop-set e cada mini-série do myo como entradas dentro de uma série agrupada [F34]; StrengthLog usa "+ New drop" dentro da série [F35]. É exatamente o "bloco dentro da série" do concorrente brasileiro.
8. **"Drop7" no Brasil é marca de um pino para drop-set**, vendido como "pino de musculação para dropset" [F44]. Não achei fonte que use "drop 7" como nome de método; o termo parecido é FST-7 (7 séries com pausa curta), que não tem estudo. O mais provável é que o profissional queira drop-set (ver seção 8).
9. **Várias técnicas são esquemas de séries, não tipos.** Pirâmide, 5x5, GVT (10x10), FST-7, wave loading e top set + back-off são só sequências de séries com carga/reps diferentes. Como o Eleva Pro já vai prescrever série a série, elas viram **modelos prontos** que preenchem séries, sem `set_type` próprio. GVT (10 séries) não foi melhor que 5 séries [F22].
10. **BFR funciona, mas é outro produto.** Hipertrofia igual à de carga alta, força menor [F16]; exige manguito, pressão individualizada (40–80% da pressão de oclusão arterial) e triagem de risco [F17]. Fica fora da fase 1 (equipamento, segurança e dado de saúde).

---

## 2. Taxonomia proposta para o Eleva Pro

O critério é o **escopo de modelagem**: onde a técnica "mora" no dado.

| Grupo | Onde mora | Técnicas | Como modelar |
|---|---|---|---|
| **A. Tipo de série simples** | 1 série = 1 registro | Aquecimento, preparação (feeder), série de trabalho, até a falha / AMRAP | `set_type` na série prescrita |
| **B. Série com blocos** | 1 série = N blocos sem descanso "cheio" entre eles | Drop-set (e drop duplo/triplo, strip set, drop mecânico), rest-pause, myo-reps, cluster set, SST | `set_type` + tabela de blocos (carga, reps alvo, pausa antes do bloco) |
| **C. Modificador de execução** | Atributo de como cada rep é feita | Cadência/tempo (3-1-1-0), excêntrica enfatizada/negativas, isometria e pausa no meio, parciais, lengthened partials, 21s, roubada, repetições forçadas | Campo de modificador na série ou no exercício (fase 2); fase 1 usa `notes` |
| **D. Agrupamento entre exercícios** | Liga 2+ exercícios | Bi-set, superset agonista/antagonista, tri-set, giant set (série gigante), circuito, pré-exaustão, pós-exaustão | `group` no nível do exercício (rótulo A1/A2), não `set_type` |
| **E. Esquema de séries** | Sequência de séries do exercício | Pirâmide crescente/decrescente/reversa, 5x5, GVT 10x10, FST-7, wave loading, top set + back-off, heavy duty/HIT | **Modelo pronto** que gera as séries; sem `set_type` próprio |
| **F. Autorregulação** | Alvo de esforço da série | RIR, RPE | Coluna opcional `target_rir`/`target_rpe` em qualquer série + `actual_rpe` na execução |
| **G. Formato por tempo** | Bloco do treino com relógio | EMOM, AMRAP por tempo, Tabata, intervalado | Outro modelo (bloco temporizado); fora da fase 1 |
| **H. Fora do escopo** | Exige equipamento/triagem | BFR | Fora da fase 1 |

### 2.1 `set_type` sugerido para a fase 1 (6 valores)

| `set_type` | Rótulo PT-BR | Conta no volume? | Parâmetros mínimos prescritos | O que o aluno registra |
|---|---|---|---|---|
| `warmup` | Aquecimento | Não | reps, carga (ou % da carga de trabalho) | feito/não feito; carga e reps opcionais |
| `feeder` | Preparação (aproximação) | Não | reps (baixas), carga | carga, reps |
| `working` | Série de trabalho (Normal) | Sim | reps (alvo ou faixa), carga, descanso; RIR/RPE alvo opcional | reps, carga, RPE/RIR opcional |
| `failure` | Até a falha | Sim | carga, reps mínimas/faixa (AMRAP), descanso | reps feitas (a última completa), carga |
| `drop_set` | Drop-set | Sim | ≥2 blocos: bloco 1 (carga, reps ou "até a falha"); blocos seguintes (carga ou redução %, reps ou "até a falha"); pausa entre blocos ≈ 0–10 s | carga e reps **por bloco** |
| `rest_pause` | Rest-pause / pausa de descanso | Sim | ≥2 blocos com a mesma carga: reps do bloco 1 (ou "até a falha"), pausa entre blocos em s (10–20 s típico), nº de mini-blocos ou reps-alvo totais | reps por bloco (carga herdada) |

Regras de forma:
- Blocos só existem para `drop_set` e `rest_pause`. Para os outros tipos, a série é o próprio bloco único.
- O bloco precisa de: `block_index`, `target_reps` (int ou nulo = "até a falha"), `target_load` (ou `load_drop_pct`), `pause_before_seconds`. Na execução: `actual_reps`, `actual_load`.
- **Myo-reps** entra como `rest_pause` (ver 3.8). O próprio criador chama o método de "uma permutação do rest-pause" [S4]; o MacroFactor dá a ele um tipo separado ("Myo") [F34], mas a forma do dado é a mesma (mesma carga, pausa curta, N mini-blocos).
- **Drop duplo/triplo, strip set e drop mecânico** são `drop_set` com 3+ blocos; o drop mecânico muda o exercício/pegada em vez da carga, então o bloco precisa aceitar um texto curto de variação (ou ficar em `notes` na fase 1).
- RIR/RPE alvo é **coluna**, não tipo: vale para `working`, `failure` (RIR 0 implícito, como o MacroFactor faz [F34]) e para o 1º bloco de `drop_set`/`rest_pause`.

### 2.2 O que fica fora da fase 1 e por quê

| Fica fora | Motivo |
|---|---|
| `cluster` como tipo | Mesma forma de dado do `rest_pause` (blocos, mesma carga, pausa), mas com reps planejadas **abaixo** da falha e pausa maior (15–60 s). Sem vantagem de hipertrofia [F7], é ferramenta de força/potência para público avançado. Fase 2: reaproveita blocos com pausa maior e flag "não ir à falha". |
| Parcial, 21s, negativa, isometria, tempo | São modificadores de execução (grupo C), não tipos. O concorrente põe "Parcial" como tipo, mas uma série parcial ainda é uma série de trabalho ou até a falha. Fase 1: `notes`; fase 2: campo `tempo` (texto `3-1-1-0`) e `rom` (`full`/`lengthened`/`shortened`). |
| Superset/bi-set/tri-set/giant set/circuito | É agrupamento de exercícios (grupo D). Recomendo entrar **junto** com a fase 1, mas como coluna `group_label` em `workout_exercises`, não como `set_type`. É o padrão de todos os apps estudados. |
| Pirâmide, 5x5, GVT, FST-7, wave, top set + back-off | Esquemas (grupo E): saem de graça da prescrição série a série. Viram modelos prontos no editor (botão "aplicar pirâmide"), sem migration. |
| Repetições forçadas, roubada | Dependem de parceiro ou de quebrar técnica; o registro é só "fiz N com ajuda". Fase 1: `notes`. |
| EMOM, AMRAP por tempo, Tabata | Prescrição por tempo, não por série. Pede outro modelo. |
| BFR | Equipamento, pressão individualizada, triagem de risco cardiovascular/trombose [F17]; e o registro de pressão de oclusão é dado de saúde (LGPD). |
| SST, heavy duty/HIT | Métodos-marca com protocolo próprio; dá para montar com blocos (SST) ou com 1 série `failure` (heavy duty). Modelos prontos na fase 2, se houver pedido. |

### 2.3 Implicações diretas para o desenho

- **Tabela de séries prescritas** (`workout_exercise_sets` ou nome equivalente): `set_index`, `set_type` (6 valores), `target_reps` (int ou faixa; nulo = até a falha), `target_load`, `rest_seconds`, `target_rir`/`target_rpe` (opcional), `notes`. Isso substitui o `sets/reps/weight` achatado de `workout_exercises`.
- **Blocos prescritos** só para `drop_set`/`rest_pause`: `block_index`, `target_reps` (nulo = até a falha), `target_load` ou `load_drop_pct`, `pause_before_seconds`.
- **Execução**: `workout_session_sets` já é série a série; falta o espelho dos blocos (reps e carga reais por bloco) e `actual_rpe`.
- **Agrupamento**: `group_label` (A, B...) e ordem dentro do grupo em `workout_exercises`.
- **Volume**: `warmup` e `feeder` não contam (padrão Strong [F33]).
- **(i) por técnica**: o texto curto pode sair do catálogo da seção 3, com a ressalva honesta da evidência (ex.: "economiza tempo; não gera mais músculo que séries normais").
- **LGPD**: RPE/RIR e reps/carga ficam em `workout_sessions` e derivadas, já mapeadas como sensíveis no CLAUDE.md. Rodar `/lgpd-check` antes da migration.

---

## 3. Catálogo

Legenda de escopo: **S** = por série; **S+B** = por série com blocos; **M** = modificador de execução; **G** = agrupamento entre exercícios; **E** = esquema de séries (modelo pronto); **A** = autorregulação; **T** = formato por tempo.

### 3.1 Aquecimento (warm-up set) — S
- **Nomes:** aquecimento, série de aquecimento, aquecimento específico; EN *warm-up set*.
- **Definição:** séries leves do próprio exercício antes das séries de trabalho, longe da fadiga, para preparar o movimento.
- **Parâmetros típicos:** 1–2 séries; protocolo estudado: 6 reps a 40% e 6 reps a 80% da carga de trabalho [F29]. Fontes brasileiras citam 40–60% da carga habitual, só no primeiro exercício [S10].
- **Registro:** feito/não feito; carga e reps opcionais. Não entra em volume nem em gráficos (Strong exclui das métricas [F33]).
- **Evidência:** aquecimento específico (2×6 a 40% e 80%) aumentou a velocidade da primeira série de agachamento e supino a 80% 1RM em 34 homens treinados [F29]. Não há meta-análise sobre aquecimento específico e hipertrofia (**não confirmado**).

### 3.2 Série de preparação / aproximação (feeder set) — S
- **Nomes:** preparação, aproximação, série preparatória, "reconhecimento de carga"; EN *feeder set*, *ramp-up set*, *acclimation set*.
- **Definição:** 1–3 séries de poucas reps com carga crescente até perto da carga de trabalho, sem fadiga. Difere do aquecimento por ser mais pesada e servir para "sentir" a carga.
- **Parâmetros:** 1–5 reps, 60–90% da carga de trabalho (convenção; **não confirmado** em fonte primária).
- **Registro:** carga e reps; não conta no volume.
- **Evidência:** o protocolo de 6 reps a 80% da carga de treino melhorou a velocidade no agachamento comparado a 6 reps a 40% [F29]. Nenhum estudo de hipertrofia (**não confirmado**).

### 3.3 Série de trabalho (working / straight set) — S
- **Nomes:** série válida, série de trabalho, "normal"; EN *working set*, *straight set*.
- **Definição:** a série que conta para o volume, com reps e carga prescritas e descanso completo.
- **Parâmetros:** 6–15 RM é a faixa sugerida para eficiência; mínimo de 4 séries semanais por grupo muscular [F9]. Hipertrofia mostra dose-resposta até 10+ séries semanais por grupo [F28]; várias séries por exercício dão ~40% mais efeito que série única [F27].
- **Registro:** reps, carga, descanso real; RPE/RIR opcional.

### 3.4 Até a falha / até a fadiga — S
- **Nomes:** até a falha, falha concêntrica, até a fadiga, "série máxima", AMRAP (como série); EN *to failure*, *AMRAP set*.
- **Definição:** repetir até não conseguir completar a próxima rep com técnica.
- **Parâmetros:** carga fixa; reps "até a falha" ou faixa com mínimo.
- **Registro:** reps completas. O Hevy pede para registrar a última rep **completa** [F30]; o Strong, ao contrário, usa a tag Falha para indicar que **mais uma** rep foi tentada e não completada [F33]. Definir uma convenção e escrever no (i).
- **Evidência:** sem diferença significativa entre falha e não falha para força (ES −0,09) e hipertrofia (ES 0,22); efeito pequeno a favor da falha na hipertrofia em treinados (ES 0,15, 6 estudos) [F11]. Ir à falha momentânea não é superior; a relação proximidade-hipertrofia pode ser não linear [F12]. Hipertrofia cresce conforme se aproxima da falha; força não [F13].

### 3.5 RIR e RPE (autorregulação) — A
- **Nomes:** RIR = repetições em reserva; RPE = percepção subjetiva de esforço; EN *reps in reserve*, *rating of perceived exertion*.
- **Definição:** a escala RPE baseada em RIR mapeia RPE 10 = 0 RIR, RPE 9 = 1 RIR, e assim por diante [F23].
- **Parâmetros:** alvo por série (ex.: RIR 2 / RPE 8); faixas meio-ponto (8,5) são comuns (**não confirmado** em fonte primária).
- **Escopo:** coluna em qualquer série, não tipo.
- **Registro:** RPE ou RIR real ao fim da série. Hevy: coluna RPE ativada nas configurações, só durante a sessão, **não** na rotina [F32]. Strong: RPE por série [F33]. MacroFactor: RIR por série, Falha = RIR 0 [F34].
- **Evidência:** validação inicial da escala em agachamento, com relação inversa entre velocidade e RPE [F23]. Pessoas subestimam as reps restantes em ~0,95 rep, com alta heterogeneidade; erram menos perto da falha e com menos de 12 reps [F24].

### 3.6 Rest-pause (pausa de descanso) — S+B
- **Nomes:** rest-pause, pausa-descanso, "pausa de descanso"; EN *rest-pause*.
- **Definição:** série até a falha (ou perto), pausa curta (10–20 s), mais reps com a **mesma carga**, repetir 2–3 vezes.
- **Parâmetros:** carga ~80% 1RM no estudo de Prestes (o resumo dá o braço tradicional: 3×6 a 80% com 2 min) [F5]; pausas de ~10 s em fonte brasileira [S6]; 2–4 mini-blocos (**não confirmado** em fonte primária).
- **Blocos:** sim. Bloco 1 (reps até a falha), blocos 2..N (pausa em s, reps).
- **Registro:** reps por bloco; carga única.
- **Evidência:** 6 semanas em 18 treinados: força igual, mais resistência no leg press e mais espessura de coxa [F5]. 8 semanas em 28 treinados, volume igual: um pouco mais de 1RM no agachamento, hipertrofia igual [F6]. Única técnica com coeficiente significativo positivo para hipertrofia na meta-análise de 2026 [F2]. Reduz o tempo de sessão à metade [F9].

### 3.7 Cluster set — S+B
- **Nomes:** cluster, série em cluster, "série fracionada"; EN *cluster set*, *rest redistribution*.
- **Definição:** série com pausas curtas entre reps ou grupos de reps, **sem** ir à falha, para manter velocidade e qualidade [F8].
- **Parâmetros:** pausas intra-série de 20–60 s; exemplos 3×4 e 6×2 a 60% 1RM [F1]. A terminologia varia muito na literatura [F8].
- **Blocos:** sim (mesma carga, reps planejadas, pausa).
- **Registro:** reps por bloco; idealmente velocidade (fora do escopo).
- **Evidência:** sem diferença para força (ES −0,05) nem hipertrofia (ES −0,05) versus tradicional; pode gerar menos fadiga [F7]. Permite carga maior sem perder velocidade relativa [F8].

### 3.8 Myo-reps — S+B
- **Nomes:** myo-reps, "mio-reps"; EN *myo-reps*.
- **Definição:** série de ativação perto da falha, depois mini-séries curtas com a mesma carga separadas por 3–5 respirações, até não atingir a meta da mini-série.
- **Parâmetros:** ativação de 8–15 reps (revisão do criador; antes 15–30), mini-séries de 3–5 reps, 3–5 respirações (~10–20 s) [S4]. O criador, Borge Fagerli, publicou o método em e-book próprio, que não consegui ler (**não confirmado** na fonte do autor).
- **Blocos:** sim, mesma forma do rest-pause.
- **Registro:** reps por bloco.
- **Evidência:** não há estudo específico de myo-reps (**não confirmado**); a evidência é a de rest-pause.

### 3.9 Drop-set (e drop duplo, strip set, drop mecânico) — S+B
- **Nomes:** drop-set, drop, série descendente, "drop duplo"/"drop triplo" (2/3 reduções), strip set (tirar anilhas), drop mecânico (mudar para variação mais fácil); EN *drop set*, *descending set*, *strip set*, *mechanical drop set*.
- **Definição:** treinar até a falha com uma carga, reduzir a carga e continuar imediatamente até nova falha [F3].
- **Parâmetros:** redução de ~20% [F1]; 20–30% e cerca de 3 reduções em fonte brasileira [S2]; pausa entre blocos = tempo de trocar a carga.
- **Blocos:** sim (carga diferente por bloco). Drop mecânico: o bloco muda a variação, não a carga.
- **Registro:** carga e reps por bloco. MacroFactor registra cada redução como entrada dentro de uma série agrupada [F34]; StrengthLog, "+ New drop" [F35]; Hevy marca a série como D e não dispara o descanso antes dela [F30].
- **Evidência:** sem diferença significativa de hipertrofia versus tradicional (SMD da diferença 0,155, p = 0,392; 5 estudos, 142 participantes); alguns protocolos levam metade a um terço do tempo [F3]. Coleman et al. 2022: efeitos triviais a favor do drop-set em hipertrofia e força (5 estudos) [F4][S13]. Em treinados, com volume igualado, sem vantagem [F21]. Meta-análise de 2026: coeficiente pequeno e não significativo [F2].

### 3.10 SST (Sarcoplasma Stimulating Training) — S+B / E
- **Nomes:** SST; EN *sarcoplasma stimulating training*. Criado pelo treinador suíço Patrick Tuor [F26].
- **Definição e parâmetros (protocolo estudado):** SST-CT: 3 séries a 10RM até a falha com 20 s de pausa; depois −20% com 1 s concêntrica/4 s excêntrica; −20% com 4 s/1 s; −20% em isometria a 90° até a falha, 20 s antes de cada redução. SST-RIV: 8 séries a 10RM até a falha com pausas 45-30-15-5-5-15-30-45 s [F26].
- **Blocos:** sim; mistura blocos com modificador de cadência e isometria. Melhor como modelo pronto.
- **Evidência:** só agudo: maior espessura muscular aguda e menos tempo, mesmo com volume menor, em 12 treinados [F26]. Efeito crônico não estudado [F1].

### 3.11 Pirâmide crescente, decrescente e reversa — E
- **Nomes:** pirâmide, piramidal, pirâmide crescente (carga sobe, reps caem), decrescente/reversa (carga desce, reps sobem), "pirâmide completa"/"duplo piramidal" (sobe e desce); EN *ascending/descending pyramid*, *reverse pyramid*.
- **Parâmetros:** ex.: 12-10-8-6 com carga crescente (convenção; **não confirmado**).
- **Escopo:** esquema; cada série é `working` com carga/reps próprias. Modelo pronto.
- **Evidência:** pirâmide crescente sem vantagem de força ou hipertrofia em treinados, volume igualado (área de secção ~7,5% vs 7,6% tradicional) [F21].

### 3.12 FST-7 — E
- **Nomes:** FST-7 (*Fascia Stretch Training 7*), criado por Hany Rambod.
- **Definição:** no último exercício do grupo muscular, 7 séries de 8–12 reps com 30–45 s de descanso, buscando "pump" para "esticar a fáscia" [S5].
- **Escopo:** esquema; 7 séries `working` com descanso curto. Modelo pronto.
- **Evidência:** **não há estudo** do FST-7 nem da tese de que alongar a fáscia permite mais hipertrofia (**não confirmado**). O próprio material de divulgação diz que o "7" não é mágico [S5]. Não achei o material original do autor.

### 3.13 GVT (German Volume Training, 10x10) — E
- **Nomes:** GVT, 10x10, "treino alemão de volume".
- **Definição:** 10 séries de 10 reps no mesmo exercício, carga ~60% 1RM, descanso curto (convenção; **não confirmado** em fonte primária do autor).
- **Escopo:** esquema; modelo pronto.
- **Evidência:** 10×10 não foi melhor que 5×10 em 6 semanas (19 homens); o grupo de 5 séries ganhou mais em massa magra de tronco/braço e em força no supino e puxada [F22].

### 3.14 Método 5x5 — E
- **Definição:** 5 séries de 5 reps com carga alta (~80–85% 1RM), progressão linear (convenção; **não confirmado**).
- **Escopo:** esquema; modelo pronto.
- **Evidência:** nenhum estudo do "5x5" como método (**não confirmado**); a evidência é a de carga alta e volume [F13][F28].

### 3.15 Wave loading — E
- **Definição:** ondas de séries com reps decrescentes e carga crescente, repetidas com carga maior (ex.: 3-2-1, 3-2-1) (convenção; **não confirmado**).
- **Escopo:** esquema; modelo pronto. **Evidência:** não achei estudo (**não confirmado**).

### 3.16 Top set + back-off — E / A
- **Definição:** uma série pesada (top set, muitas vezes por RPE) seguida de séries mais leves (back-off) com carga reduzida em % do top set.
- **Escopo:** esquema; a série top é `working` com RPE alvo; back-offs são `working` com carga relativa. Coaches pedem isso explicitamente: um usuário do Trainerize reclama de não conseguir registrar top set e back-offs no mesmo exercício e cita o exemplo 2 reps 89,3% RPE 8 / 4 reps 81,1% RPE 7 / 6 reps 73,9% RPE 6 [S12].
- **Evidência:** não achei estudo do formato (**não confirmado**).

### 3.17 21s — M / E
- **Nomes:** 21, "21s"; EN *21s*.
- **Definição:** 7 reps na metade inferior, 7 na metade superior e 7 completas, sem pausa (típico na rosca) [S14].
- **Escopo:** série única com 3 trechos de amplitude; modelável como 3 blocos sem pausa com modificador de amplitude, mas na fase 1 fica em `notes`.
- **Evidência:** nenhum ensaio testa o formato 7+7+7 (**não confirmado**).

### 3.18 Repetições parciais e lengthened partials — M
- **Nomes:** parcial, meia repetição, parcial alongada / "parcial na posição alongada"; EN *partial reps*, *lengthened partials*.
- **Definição:** reps com amplitude reduzida; "lengthened" = só na porção em que o músculo está alongado.
- **Escopo:** modificador da série (amplitude), não tipo. Pode ser "parciais depois da falha" (extensão da série = bloco extra sem pausa).
- **Registro:** reps (completas e parciais separadas, se houver extensão).
- **Evidência:** ROM completa tem vantagem trivial sobre parcial (SMD 0,12, IC −0,02 a 0,26); subgrupo de parciais alongadas sugere vantagem de hipertrofia, mas inconclusiva (IC cruza zero) [F14]. Na cadeira extensora, a parcial na fase inicial (músculo alongado, 100°–65°) deu mais hipertrofia relativa em algumas regiões; nenhum grupo ganhou mais 1RM [F15].

### 3.19 Negativas / ênfase excêntrica / sobrecarga excêntrica — M
- **Nomes:** negativa, excêntrica lenta, sobrecarga excêntrica; EN *negatives*, *eccentric emphasis*, *accentuated eccentric loading* (AEL).
- **Definição:** descida controlada (ex.: 3–5 s) ou carga maior só na excêntrica, com ajuda na subida.
- **Escopo:** modificador (cadência) ou, para AEL, exige parceiro/equipamento.
- **Evidência:** excêntrica teve efeito maior que concêntrica, sem significância (diferença 0,25, IC −0,03 a 0,52; p = 0,076) [F20]. Excêntrica de ~2 s sugerida por eficiência de tempo; AEL pode dar tensão extra, mas precisa de equipamento ou ajudante [F1].

### 3.20 Isometria e pausa no meio do movimento — M
- **Nomes:** isometria, pausa, "parada de 2 s", rep pausada; EN *isometric hold*, *paused rep*.
- **Definição:** segurar a posição por X s (no fim, no meio ou no ponto de maior tensão).
- **Escopo:** modificador de cadência (o 2º ou 4º dígito do tempo) ou bloco isométrico (como no SST [F26]).
- **Evidência:** não pesquisei revisão específica de isometria para hipertrofia (**não confirmado**).

### 3.21 Tempo / cadência controlada (notação 3-1-1-0) — M
- **Definição:** quatro dígitos = excêntrica, transição embaixo, concêntrica, transição em cima, em segundos [F1].
- **Escopo:** modificador; campo texto `tempo` na série ou no exercício (fase 2).
- **Evidência:** hipertrofia semelhante com reps de 0,5 a 8 s; reps muito lentas (>10 s) parecem inferiores [F19]. 4 s e 2 s de excêntrica deram hipertrofia de coxa semelhante [F1].

### 3.22 Pré-exaustão — G
- **Nomes:** pré-exaustão, pré-fadiga; EN *pre-exhaustion*.
- **Definição:** exercício monoarticular antes do multiarticular para o mesmo músculo (ex.: cadeira extensora → leg press), com ou sem pausa [F1]. Quando sem pausa, é um bi-set.
- **Escopo:** ordem de exercícios + agrupamento.
- **Evidência:** reduz volume total e reps até a falha [F1]. 9 semanas em não treinados: força e hipertrofia comparáveis ao tradicional, com carga total menor [F18].

### 3.23 Pós-exaustão — G
- **Definição:** inverso: multiarticular primeiro, monoarticular em seguida [F1].
- **Evidência:** não achei estudo crônico específico (**não confirmado**).

### 3.24 Bi-set, superset (agonista e antagonista), tri-set, giant set, circuito — G
- **Nomes e divergência brasileira:** "bi-set" é usado tanto para dois exercícios do **mesmo** grupo muscular quanto como sinônimo de superset; algumas fontes reservam "supersérie" para músculos opostos [S7][S8]. "Conjugado" e "série combinada" são termos genéricos para exercícios ligados; o MFIT usa "Combinar" [F41]. Tri-set = 3 exercícios; giant set / série gigante = 4+; circuito = vários exercícios em rodadas.
- **Definição:** exercícios em sequência sem descanso entre eles; descanso só ao fim da rodada.
- **Parâmetros:** nº de rodadas = nº de séries; descanso por rodada. Fonte brasileira: tri-set 3–4 séries de 10–20 reps, 30–60 s entre exercícios [S9 via busca].
- **Escopo:** agrupamento no nível do exercício (rótulo A1/A2). As séries continuam por exercício.
- **Registro:** séries de cada exercício normalmente; RPE só após a rodada (Fitbod adia o prompt de RiR até o fim do grupo [F40, trecho de busca]).
- **Evidência:** 19 estudos: sessão ~37% mais curta, eficiência maior (SMD 1,74), volume igual; mais lactato e RPE maior (SMD 0,77); adaptações crônicas iguais em força (0,10) e hipertrofia (−0,05), com só 3 estudos crônicos. Agonista-antagonista dá mais reps (0,68); mesmo músculo reduz o volume (−1,08) [F10]. Agonista-antagonista e superior-inferior são eficientes em tempo [F1].

### 3.25 Repetições forçadas — M
- **Nomes:** forçada, "ajuda do parceiro"; EN *forced reps*.
- **Definição:** após a falha, o parceiro ajuda a completar mais reps.
- **Escopo:** extensão da série (bloco extra assistido); fase 1 em `notes`.
- **Evidência:** só agudo: maior resposta de cortisol e GH e queda de força isométrica de 56,5% vs 38,3%, com recuperação mais lenta, em 16 atletas [F25]. Sem estudo crônico de hipertrofia encontrado (**não confirmado**).

### 3.26 Roubada (cheating) — M
- **Nomes:** roubada, "roubo controlado"; EN *cheat reps*.
- **Definição:** usar impulso de outras articulações para completar reps após a falha.
- **Evidência:** não achei estudo (**não confirmado**). Risco técnico; não recomendo como opção estruturada.

### 3.27 BFR (restrição de fluxo sanguíneo / oclusão vascular) — fora
- **Nomes:** BFR, treino com oclusão, Kaatsu; EN *blood flow restriction*.
- **Parâmetros (Patterson et al.):** 20–40% 1RM; 2–4 séries; 75 reps em 30-15-15-15 ou até a falha; 30–60 s de descanso; pressão 40–80% da pressão de oclusão arterial medida com o próprio manguito; 5–10 min de restrição por exercício; 2–3×/semana; manguito de 5 a 18 cm conforme o músculo [F17].
- **Segurança:** pressões maiores elevam a resposta cardiovascular; rabdomiólise rara (0,07–0,2%); sugerem triagem de risco de trombose [F17].
- **Evidência:** força maior com carga alta; hipertrofia igual entre carga alta e BFR com carga baixa [F16].

### 3.28 Heavy duty / HIT de série única — E
- **Nomes:** heavy duty (Mike Mentzer), HIT, "série única até a falha".
- **Definição:** 1 série por exercício até a falha absoluta, às vezes com forçadas/negativas, baixa frequência.
- **Escopo:** esquema: 1 série `failure` por exercício.
- **Evidência:** várias séries dão ~40% mais efeito de hipertrofia que série única [F27]; dose-resposta com séries semanais [F28]. Material original de Mentzer não consultado (**não confirmado**).

### 3.29 EMOM e AMRAP — T
- **Definição:** EMOM = N reps no início de cada minuto; AMRAP (por tempo) = máximo de rodadas/reps num tempo fixo. AMRAP como **série** (máximo de reps com uma carga) é o `failure` de 3.4.
- **Escopo:** bloco temporizado; outro modelo. O Tecnofit tem um app de cronômetro separado com EMOM e Tabata [F42, trecho de busca].
- **Evidência:** não pesquisada para hipertrofia (**não confirmado**).

### 3.30 Outros termos brasileiros frequentes
| Termo | O que é | Onde cai |
|---|---|---|
| Drop duplo / drop triplo | Drop-set com 2/3 reduções | `drop_set` com 3/4 blocos |
| Série combinada / conjugado | Exercícios ligados | Agrupamento (G) |
| Série gigante | 4+ exercícios ligados | Agrupamento (G) |
| Piramidal | Pirâmide | Esquema (E) |
| Método 5x5 | 5 séries de 5 | Esquema (E) |
| "Falha na última" | Só a última série até a falha | Última série = `failure` (o MFIT tem preset com esse nome, segundo concorrente [S1]) |
| "Isometria" como preset | Pausa isométrica | Modificador (M) |

---

## 4. Evidência

Força da evidência: **Moderada** = meta-análise com ≥10 estudos coerentes; **Limitada** = meta-análise pequena (≤6 estudos) ou 1–2 ECRs; **Muito limitada** = só estudo agudo; **Ausente** = nenhum estudo encontrado.

| Técnica | Achado | Força | Fonte |
|---|---|---|---|
| Técnicas avançadas (conjunto) | Hipertrofia g = 0,046 (n.s.); força g = 0,351; rest-pause único com coeficiente significativo para hipertrofia | Moderada | [F2] |
| Técnicas avançadas (revisão) | Sem consenso de superioridade; superset, drop, cluster, SST e excêntrica de ~2 s são eficientes em tempo | Moderada (qualitativa) | [F1] |
| Eficiência de tempo | Superset, drop-set e rest-pause cortam ~metade do tempo mantendo volume; melhores para hipertrofia que para força | Moderada (narrativa) | [F9] |
| Drop-set | Hipertrofia igual ao tradicional; ½ a ⅓ do tempo | Limitada (5 estudos) | [F3][F4] |
| Drop-set e pirâmide em treinados | Sem vantagem com volume igualado | Limitada (1 ECR) | [F21] |
| Rest-pause | Força igual; mais resistência local e espessura de coxa | Limitada (1 ECR) | [F5] |
| Rest-pause vs drop vs tradicional | Hipertrofia igual; rest-pause um pouco mais de 1RM no agachamento | Limitada (1 ECR) | [F6] |
| Myo-reps | Sem estudo próprio | Ausente | — |
| Cluster set | Força e hipertrofia iguais; menos fadiga | Moderada | [F7][F8] |
| Superset | ~37% menos tempo; volume igual; RPE maior; crônico igual (3 estudos) | Moderada (agudo) / Limitada (crônico) | [F10] |
| Pré-exaustão | Resultado comparável com menos carga total (não treinados) | Limitada | [F18][F1] |
| Até a falha | Não superior; leve vantagem de hipertrofia em treinados | Moderada | [F11][F12] |
| Proximidade da falha (RIR) | Hipertrofia aumenta perto da falha; força não | Moderada (exploratória) | [F13] |
| Precisão do RIR | Subestima ~0,95 rep; melhor perto da falha | Moderada | [F24] |
| Escala RPE-RIR | Validade inicial; RPE inversamente ligado à velocidade | Limitada | [F23] |
| Parciais / lengthened partials | ROM completa trivialmente melhor; parcial alongada promissora mas inconclusiva | Limitada | [F14][F15] |
| Excêntrica | Efeito maior não significativo (p = 0,076) | Limitada | [F20] |
| Tempo/duração da rep | 0,5–8 s equivalentes; >10 s pior | Limitada (8 estudos) | [F19] |
| GVT 10x10 | Não melhor que 5×10 | Limitada | [F22] |
| Volume (séries) | Várias séries > série única (~40%); dose-resposta até 10+ séries/semana | Moderada | [F27][F28] |
| BFR | Hipertrofia igual à carga alta; força menor | Moderada | [F16][F17] |
| SST | Mais espessura aguda em menos tempo | Muito limitada (agudo) | [F26] |
| Repetições forçadas | Mais resposta hormonal e fadiga aguda | Muito limitada (agudo) | [F25] |
| Aquecimento específico | Mais velocidade na 1ª série | Limitada | [F29] |
| FST-7, 21s, wave loading, roubada, top set + back-off, 5x5, heavy duty como método | Nenhum estudo do método | Ausente | — |

---

## 5. Apps do mercado

| App | Tipo por série? | Tipos | Agrupamento | Blocos dentro da série | RPE/RIR | Fonte |
|---|---|---|---|---|---|---|
| **Hevy** | Sim (toque no nº da série) | Normal, Aquecimento (W), Falha (F), Drop (D) | Superset (vira circuito com descanso após o último) | Não: drop é uma série separada marcada D, sem disparar o descanso antes | RPE por série, só na sessão ao vivo, não na rotina | [F30][F31][F32] |
| **Strong** | Sim ("set tags") | Aquecimento, Drop Set, Falha | Superset/grupos, fora das tags | Não: drop é "série de séries sem descanso" | RPE por série | [F33] |
| **MacroFactor Workouts** | Sim | Padrão, Aquecimento (W), Drop (D), Myo (M), Falha (F) | Não coberto na página lida | **Sim:** drop e myo são uma série agrupada com várias entradas | RIR por série; Falha = RIR 0 | [F34] |
| **StrengthLog** | Sim | Trabalho, Aquecimento, Drop set; "Max reps" por drop | Não verificado | **Sim:** "+ New drop" dentro da série | Não verificado | [F35] |
| **Fitbod** | Aquecimento automático | Aquecimento (só no 1º exercício de cada grupo) | Superset (2) e circuito (3+) | Não confirmado | RiR, perguntado no fim do grupo | [F40] (trecho de busca) |
| **Trainerize** | Não confirmado | Não confirmado (tags da página citam "Drop set", "Triset", "Quadset", "Monsterset", sem descrição) | Superset (séries + descanso inline) e circuito (rodadas); tipos de treino Regular, Circuito, Intervalado, Vídeo | Não confirmado | Não confirmado; coach reclama de não registrar top set e back-off no mesmo exercício | [F36][F37][S12] |
| **TrueCoach** | Não: descrição em texto livre ("séries, reps, tempo, descanso etc.") | — | Superset com rótulo A1/A2, B1/B2/B3 | Não | Só no texto livre | [F38][F39] |
| **MFIT Personal** | Série a série (Série, Carga, Intervalo) | Presets citados por concorrente: drop set, falha na última, rest-pause, isometria, cluster, cadência — **não confirmado** na fonte oficial | "Combinar" (conjugado/bi-set/tri-set) | Não confirmado | Não confirmado | [F41][S1] |
| **Tecnofit** | Não confirmado | Não confirmado | Não confirmado | Não confirmado | Não confirmado; cronômetro EMOM/Tabata em app separado | [F42] (trecho de busca) |
| **Treinus** | Não confirmado | Não confirmado (plataforma multiesporte de planilhas) | Não confirmado | Não confirmado | Não confirmado | [F43] (trecho de busca) |
| **Concorrente citado no pedido** | Sim | Aquecimento, Preparação, Até a fadiga, Pausa de descanso, Parcial + 2 ilegíveis; (i) por técnica | — | Sim ("blocos de repetição") | — | print do profissional; app **não identificado** |

O que se aprende:
- O conjunto mínimo de mercado é **Normal + Aquecimento + Falha + Drop**. Myo/rest-pause aparece só no MacroFactor, e é ele que modela blocos de verdade.
- Ninguém trata agrupamento como tipo de série.
- RPE/RIR é por série e opcional em todos que o têm. O Hevy não deixa **prescrever** RPE na rotina [F32]: espaço para o Eleva Pro, onde o especialista prescreve.
- Divergência de convenção na falha (Hevy: registre a última rep completa [F30]; Strong: a tag diz que houve uma tentativa a mais [F33]). Escolher uma e explicar no (i).

---

## 6. O que é "drop7"

O que consegui apurar:

1. **"Drop7" é uma marca brasileira de pino para drop-set.** O site oficial do distribuidor vende o "Pino de musculação para dropset com a melhor performance", em kits de 1, 2 ou 4 pinos, "compatível com todos os aparelhos", via Mercado Livre [F44]. Há perfil no Instagram (drop7brasil) que o apresenta como dispositivo para auxílio de treino [S3]. Produtos equivalentes no exterior ("drop set pin") servem para trocar a carga rapidamente em máquinas de placas [S15]. O site do Drop7 não descreve o mecanismo [F44].
2. **Não achei fonte que use "drop 7" como nome de método.** Uma página portuguesa intitulada "O que é drop 7 na academia?" (hoje 404) descrevia, no trecho de busca, um **drop-set** comum: reduções de ~20–30%, cerca de 3 reduções, sem pausa [S2]. A página não explica o "7".
3. **FST-7 é o candidato alternativo**: 7 séries de 8–12 reps com 30–45 s de descanso no último exercício do grupo [S5]. Não tem estudo (seção 3.12).

Conclusão: o mais provável é que o profissional esteja falando de **drop-set**, possivelmente feito com o pino Drop7 em máquina de placas. **Confirmar com ele** (uma pergunta: "drop7 é reduzir a carga sem descanso, ou são 7 séries com descanso curto?"). Os dois cabem no desenho: drop-set é `drop_set` com blocos; FST-7 é modelo pronto de 7 séries `working` com descanso de 30–45 s.

---

## 7. Lacunas restantes

| Lacuna | O que tentei |
|---|---|
| **App concorrente brasileiro** do print (tipos Aquecimento, Preparação, Até a fadiga, Pausa de descanso, Parcial) e as duas etiquetas ilegíveis | Busca exata pelos rótulos em português: nenhum resultado. Pedir ao profissional o nome do app. |
| **"Drop7" como método** | Site do Drop7, busca por "drop 7"/"drop7" + musculação; a única página que tratava do termo deu 404. Perguntar ao profissional. |
| **MFIT: tipos/presets de série** | Central de ajuda descreve Série/Carga/Intervalo e "Combinar", mas não presets; lista de presets veio só de um concorrente [S1]. Testar a conta grátis. |
| **Tecnofit e Treinus** | Sem central pública indexada; só lojas de app (trecho de busca). |
| **Trainerize: tipos de série e RPE** | Artigo de superset/circuito lido pela API; nada sobre tipos de série. |
| **Fitbod** | Centrais deram só trecho de busca. |
| **Strong: superset e prescrição de RPE na rotina** | Só o artigo de tags foi lido. |
| **Myo-reps no material do autor** | E-book de Borge Fagerli não acessado; parâmetros vieram de fontes secundárias. |
| **FST-7, GVT, heavy duty no material do autor** | Material original de Rambod, Poliquin e Mentzer não acessado. |
| **Texto completo** de Lixandrão 2018, Prestes 2019 (protocolo exato do rest-pause), Enes 2021, Coleman 2022 | Só resumos. O protocolo intra-série do rest-pause de Prestes não aparece no resumo. |
| **Isometria e pós-exaustão** | Não busquei revisão específica. |
| **Halperin 2022** | Números confirmados no preprint e em resumo secundário; versão publicada não lida. |

---

## 8. Fontes

### Primárias

- [F1] Krzysztofik M, Wilk M, Wojdała G, Gołaś A. Maximizing Muscle Hypertrophy: A Systematic Review of Advanced Resistance Training Techniques and Methods. *Int J Environ Res Public Health*. 2019;16(24):4897. doi:10.3390/ijerph16244897. https://pmc.ncbi.nlm.nih.gov/articles/PMC6950543 (texto completo; acesso 20/10/2026)
- [F2] Tsartsapakis I, Zafeiroudi A, Kouthouris C. Effects of Advanced Resistance Training Systems on Muscle Hypertrophy and Strength in Recreationally Trained Adults: A Systematic Review and Meta-Analysis. *J Funct Morphol Kinesiol*. 2026;11(1):80. doi:10.3390/jfmk11010080. https://pmc.ncbi.nlm.nih.gov/articles/PMC12922048/ (acesso 20/10/2026; o resumo fala em 23 estudos e o texto em 24/20)
- [F3] Sødal LK, Kristiansen E, Larsen S, van den Tillaar R. Effects of Drop Sets on Skeletal Muscle Hypertrophy: A Systematic Review and Meta-analysis. *Sports Med Open*. 2023;9:66. https://doi.org/10.1186/s40798-023-00620-5 (resumo via Europe PMC; acesso 20/10/2026)
- [F4] Coleman M et al. Muscular Adaptations in Drop Set vs. Traditional Training: A Meta-Analysis. *Int J Strength Cond*. 2022. https://vuir.vu.edu.au/46296/ (registro do repositório; números via [S13]; acesso 20/10/2026)
- [F5] Prestes J et al. Strength and Muscular Adaptations After 6 Weeks of Rest-Pause vs. Traditional Multiple-Sets Resistance Training in Trained Subjects. *J Strength Cond Res*. 2019;33(Suppl 1):S113–S121. https://doi.org/10.1519/JSC.0000000000001923 (resumo via Europe PMC; acesso 20/10/2026)
- [F6] Enes A, Alves R, Schoenfeld B, et al. Rest-pause and drop-set training elicit similar strength and hypertrophy adaptations compared with traditional sets in resistance-trained males. *Appl Physiol Nutr Metab*. 2021;46(11):1417–1424. https://doi.org/10.1139/apnm-2021-0278 (resumo via Europe PMC; acesso 20/10/2026)
- [F7] Davies TB et al. Chronic Effects of Altering Resistance Training Set Configurations Using Cluster Sets: A Systematic Review and Meta-Analysis. *Sports Med*. 2021;51(4):707–736. https://pubmed.ncbi.nlm.nih.gov/33475986/ (resumo; acesso 20/10/2026)
- [F8] Tufano JJ, Brown LE, Haff GG. Theoretical and practical aspects of different cluster set structures: a systematic review. *J Strength Cond Res*. 2017;31(3):848–867. https://ro.ecu.edu.au/ecuworkspost2013/2922/ (registro e resumo; acesso 20/10/2026)
- [F9] Iversen VM, Norum M, Schoenfeld BJ, Fimland MS. No Time to Lift? Designing Time-Efficient Training Programs for Strength and Hypertrophy: A Narrative Review. *Sports Med*. 2021;51(10):2079–2095. https://pmc.ncbi.nlm.nih.gov/articles/PMC8449772 (resumo; acesso 20/10/2026)
- [F10] Zhang X, Weakley J, Li H, Li Z, García-Ramos A. Superset Versus Traditional Resistance Training Prescriptions: A Systematic Review and Meta-analysis. *Sports Med*. 2025. doi:10.1007/s40279-025-02176-8. https://pmc.ncbi.nlm.nih.gov/articles/PMC12011898/ (texto completo; acesso 20/10/2026)
- [F11] Grgic J, Schoenfeld BJ, Orazem J, Sabol F. Effects of resistance training performed to repetition failure or non-failure on muscular strength and hypertrophy. *J Sport Health Sci*. 2022;11(2):202–211. https://doaj.org/article/dc36ba7ccd994798964f66b93bd8f662 (resumo; acesso 20/10/2026)
- [F12] Refalo MC et al. Influence of Resistance Training Proximity-to-Failure on Skeletal Muscle Hypertrophy: A Systematic Review with Meta-analysis. *Sports Med*. 2023;53(3):649–665. https://doi.org/10.1007/s40279-022-01784-y (resumo via Europe PMC; acesso 20/10/2026)
- [F13] Robinson ZP et al. Exploring the Dose–Response Relationship Between Estimated Resistance Training Proximity to Failure, Strength Gain, and Muscle Hypertrophy: A Series of Meta-Regressions. *Sports Med*. 2024;54(9):2209–2231. https://doi.org/10.1007/s40279-024-02069-2 (resumo via Europe PMC; acesso 20/10/2026)
- [F14] Wolf M et al. Partial Vs Full Range of Motion Resistance Training: A Systematic Review and Meta-Analysis. *Int J Strength Cond*. 2023. https://doaj.org/article/99e86b317bec40f5abc2f0008358737e (resumo; acesso 20/10/2026)
- [F15] Pedrosa GF et al. Partial range of motion training elicits favorable improvements in muscular adaptations when carried out at long muscle lengths. *Eur J Sport Sci*. 2022;22(8):1250–1260. https://doi.org/10.1080/17461391.2021.1927199 (resumo; acesso 20/10/2026)
- [F16] Lixandrão ME et al. Magnitude of Muscle Strength and Mass Adaptations Between High-Load Resistance Training Versus Low-Load Resistance Training Associated with Blood-Flow Restriction: A Systematic Review and Meta-Analysis. *Sports Med*. 2018;48(2):361–378. https://doi.org/10.1007/s40279-017-0795-y (resumo via Europe PMC; acesso 20/10/2026)
- [F17] Patterson SD, Hughes L, Warmington S, et al. Blood Flow Restriction Exercise: Considerations of Methodology, Application, and Safety. *Front Physiol*. 2019;10:533 (título corrigido por corrigendum). https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2019.00533/full (texto completo, Tabela 1; acesso 20/10/2026)
- [F18] Trindade TB et al. Effects of Pre-exhaustion Versus Traditional Resistance Training on Training Volume, Maximal Strength, and Quadriceps Hypertrophy. *Front Physiol*. 2019. https://doi.org/10.3389/fphys.2019.01424 (resumo via Europe PMC; acesso 20/10/2026)
- [F19] Schoenfeld BJ, Ogborn DI, Krieger JW. Effect of repetition duration during resistance training on muscle hypertrophy: a systematic review and meta-analysis. *Sports Med*. 2015;45(4):577–585. https://pubmed.ncbi.nlm.nih.gov/25601394/ (resumo; acesso 20/10/2026)
- [F20] Schoenfeld BJ, Ogborn DI, Vigotsky AD, Franchi MV, Krieger JW. Hypertrophic Effects of Concentric vs. Eccentric Muscle Actions: A Systematic Review and Meta-analysis. *J Strength Cond Res*. 2017;31(9):2599–2608. https://pubmed.ncbi.nlm.nih.gov/28486337/ (resumo; acesso 20/10/2026)
- [F21] Angleri V, Ugrinowitsch C, Libardi CA. Crescent pyramid and drop-set systems do not promote greater strength gains, muscle hypertrophy, and changes on muscle architecture compared with traditional resistance training in well-trained men. *Eur J Appl Physiol*. 2017;117(2):359–369. https://pubmed.ncbi.nlm.nih.gov/28130627/ (resumo; acesso 20/10/2026)
- [F22] Amirthalingam T et al. Effects of a Modified German Volume Training Program on Muscular Hypertrophy and Strength. *J Strength Cond Res*. 2017;31(11):3109–3119. https://acuresearchbank.acu.edu.au/item/8y1x2/effects-of-a-modified-german-volume-training-program-on-muscular-hypertrophy-and-strength (resumo; acesso 20/10/2026)
- [F23] Zourdos MC et al. Novel Resistance Training–Specific Rating of Perceived Exertion Scale Measuring Repetitions in Reserve. *J Strength Cond Res*. 2016;30(1):267–275. https://openrepository.aut.ac.nz/items/efef3b25-6701-4fb5-bb82-55fcd2a26027/full (resumo; acesso 20/10/2026)
- [F24] Halperin I et al. Accuracy in Predicting Repetitions to Task Failure in Resistance Exercise: A Scoping Review and Exploratory Meta-analysis. *Sports Med*. 2022. https://sportrxiv.org/index.php/server/preprint/view/67 (preprint; versão publicada não lida; acesso 20/10/2026)
- [F25] Ahtiainen JP et al. Acute Hormonal and Neuromuscular Responses and Recovery to Forced vs. Maximum Repetitions Multiple Resistance Exercises. *Int J Sports Med*. 2003;24:410–418. https://www.thieme-connect.de/products/all/doi/10.1055/s-2003-41171 (resumo; acesso 20/10/2026)
- [F26] de Almeida FN, Lopes CR, da Conceição RM, et al. Acute Effects of the New Method Sarcoplasma Stimulating Training Versus Traditional Resistance Training on Total Training Volume, Lactate and Muscle Thickness. *Front Physiol*. 2019;10:579. https://pmc.ncbi.nlm.nih.gov/articles/PMC6529514/ (texto completo; acesso 20/10/2026)
- [F27] Krieger JW. Single vs. multiple sets of resistance exercise for muscle hypertrophy: a meta-analysis. *J Strength Cond Res*. 2010. https://pubmed.ncbi.nlm.nih.gov/20300012/ (resumo; acesso 20/10/2026)
- [F28] Schoenfeld BJ, Ogborn D, Krieger JW. Dose-response relationship between weekly resistance training volume and increases in muscle mass: A systematic review and meta-analysis. *J Sports Sci*. 2017. https://researchgate.net/profile/Brad-Schoenfeld/publication/305455324 (PDF do autor; acesso 20/10/2026)
- [F29] Ribeiro B et al. (estudo de aquecimento específico em 34 homens treinados). *Journal of Men's Health*. 2021;17(4):226–233. https://doaj.org/article/90de36e35e514c36af5f61118a42eb3a (resumo; acesso 20/10/2026)
- [F30] Hevy. Set Types in Hevy Explained: Drop Sets, Warm Up Sets and More. https://help.hevyapp.com/hc/en-us/articles/34896293707927 (lido pela API do Zendesk; acesso 20/10/2026)
- [F31] Hevy. What are Supersets? / Circuits, Intervals and Supersets Explained. https://help.hevyapp.com/hc/en-us/articles/35650286563095 e https://help.hevyapp.com/hc/en-us/articles/36954623739415 (trecho de busca; acesso 20/10/2026)
- [F32] Hevy. How to write sets and reps (RPE Tracking). https://www.hevyapp.com/features/how-to-write-sets-and-reps (trecho de busca; acesso 20/10/2026)
- [F33] Strong. About Warm-up, Drop Sets and Failure Sets. https://help.strongapp.io/article/166-set-tags (acesso 20/10/2026)
- [F34] MacroFactor. Set Types in Workouts. https://help.macrofactorapp.com/en/articles/317-logging-different-types-of-sets (acesso 20/10/2026)
- [F35] StrengthLog. Drop sets. https://help.strengthlog.com/help-article/drop-sets/ (acesso 20/10/2026)
- [F36] Trainerize. How to Create Superset and Circuit Workouts. https://help.trainerize.com/hc/en-us/articles/208688926 (lido pela API do Zendesk; acesso 20/10/2026)
- [F37] Trainerize. What Types of Workouts Can I Create? https://help.trainerize.com/hc/en-us/articles/208688896 (trecho de busca; acesso 20/10/2026)
- [F38] TrueCoach. Creating a Superset. https://help.truecoach.co/en/articles/2403842-creating-a-superset (acesso 20/10/2026)
- [F39] TrueCoach. The Workout Builder Basics. https://help.truecoach.co/en/articles/3047972-the-workout-builder-basics (acesso 20/10/2026)
- [F40] Fitbod. Warm Up Sets; artigo sobre RiR em supersets/circuitos. https://help.fitbod.me/hc/en-us/articles/360006337634 e https://help.fitbod.me/hc/en-us/articles/360006427813 (trecho de busca; acesso 20/10/2026)
- [F41] MFIT Personal. Como adicionar exercícios no treino do app da MFIT? https://ajuda.mfitpersonal.com.br/ajuda/professor/como-adicionar-exercicios-no-treino-do-app-da-mfit/ (acesso 20/10/2026)
- [F42] Tecnofit. Tecnofit Timer (App Store) e Tecnofit para Personal Trainer. https://apps.apple.com/br/app/id1505200734 e https://apps.apple.com/app/id1456964677 (trecho de busca; acesso 20/10/2026)
- [F43] Treinus (App Store). https://apps.apple.com/BR/app/id881985048 (trecho de busca; acesso 20/10/2026)
- [F44] Drop7 — Pino Dropset (distribuidor oficial). https://drop7.com.br/ (acesso 20/10/2026)

### Secundárias

- [S1] Vibe Fit (concorrente). MFIT Personal vs Vibe Fit (2026): comparação honesta. https://appvibefit.com/blog/mfit-personal-vs-vibe-fit-2026 (acesso 20/10/2026)
- [S2] FitnessDock. O que é drop 7 na academia? https://www.fitnessdock.pt/story/1264-o-que-e-drop-7-na-academia (404 em 20/10/2026; só trecho de busca)
- [S3] Instagram @drop7brasil. https://www.instagram.com/drop7brasil/ (trecho de busca; acesso 20/10/2026)
- [S4] StrengthLog. Myo-Reps: What They Are, How They Work, and When to Use Them. https://www.strengthlog.com/myo-reps/ ; Fitness Volt. Myo-Reps. https://fitnessvolt.com/myo-reps/ (acesso 20/10/2026)
- [S5] The Barbell. FST-7 Training. https://thebarbell.com/fst-7-training/ ; Fitness Volt. FST-7 Workout Guide. https://fitnessvolt.com/?p=187359 (acesso 20/10/2026)
- [S6] Vitat. Rest-pause: o que é, benefícios e como fazer. https://vitat.com.br/rest-pause/ (acesso 20/10/2026)
- [S7] Treino Mestre. Bi-set: o que é, como fazer. https://treinomestre.com.br/bi-set-conheca-mais-sobre-este-metodo-de-treinamento-5-dicas-importantes/ (acesso 20/10/2026)
- [S8] Millbody. Termos de Musculação: Guia para Personal Trainer. https://millbody.com/termos-musculacao-personal-trainer/ (acesso 20/10/2026)
- [S9] Smart Fit News. Conheça os treinos drop-set e bi-set; Vitat. Treino tri-set. https://www.smartfit.com.br/news/fitness/treinos-drop-set-super-set/ e https://vitat.com.br/treino-tri-set/ (trecho de busca; acesso 20/10/2026)
- [S10] Union Fit. A importância do aquecimento e séries preparatórias no treino. https://blog.unionfit.com.br/post/importancia-aquecimento-series-preparatorias-treino (acesso 20/10/2026)
- [S11] Reclame Aqui. Insatisfação de Profissional de Educação Física com o sistema MFIT Personal. https://www.reclameaqui.com.br/mfit-personal/insatisfacao-de-profissional-de-educacao-fisica-com-o-sistema-mfit-personal-e-suas-constantes-e-negativas-mudancas_Rg7G1bQAigfP8a_Z/ (trecho de busca; acesso 20/10/2026)
- [S12] ABC Trainerize Ideas. Allow multiple entries for an exercise. https://ideas.abcfitness.com/forums/167887-coach-trainer-abc-trainerize/suggestions/49106372-allow-multiple-entries-for-an-exercise (acesso 20/10/2026)
- [S13] Stronger by Science, resumo de Coleman et al. 2022. https://www.strongerbyscience.com/?p=57976 (trecho de busca; acesso 20/10/2026)
- [S14] Fitbod. 21's. https://fitbod.me/exercises/21-s ; Muscle & Strength. Bicep Curl 21s. https://www.muscleandstrength.com/node/49856 (trecho de busca; acesso 20/10/2026)
- [S15] ILUS Fitness. Drop Set Pin. https://ilusfitness.com/en/products/ilus-drop-set-pin (trecho de busca; acesso 20/10/2026)
