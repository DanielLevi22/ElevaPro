# Zepp Coach e o ecossistema Zepp/Amazfit: pesquisa de funcionalidades

> Pesquisa feita em 14/09/2026 para decisões de produto do Eleva Pro. Fontes primárias (Zepp Health, Amazfit, docs.zepp.com, Firstbeat, artigos científicos do PAI) aparecem como **[Fn]**. Fontes secundárias (reviews, integradores, imprensa) aparecem como **[Sn]** e nunca sustentam sozinhas um fato central. Onde nenhuma fonte primária confirma, está escrito **não confirmado**.
>
> Ressalva de método: os manuais oficiais em PDF foram lidos por inteiro (Balance 2, Cheetah 2 Pro e T-Rex 3 Pro). Várias páginas de FAQ de `support.amazfit.com/.../faq/NNNN` só renderizam com JavaScript. Quando um fato veio só do trecho que o buscador mostrou dessas páginas, isso está marcado.

---

## 1. Resumo

1. O **Zepp Coach** é **gratuito** [F2][F13]. Ele gera um plano a partir de um questionário: exercício feito nos últimos 1 a 2 meses, dias de descanso e data de início [F4][F5]. O plano pode ser "regular", aplicável à maioria dos modos de treino, ou de corrida para 3K, 5K, 10K, meia ou maratona [F2][F3]. Não exige teste de nível [F1].
2. A adaptação combina **TRIMP** (FC × duração), **CTL de 42 dias**, **ATL de 7 dias** e **TSB = CTL − ATL**. Há duas regras publicadas: se a carga sobe mais de 50% em relação à semana anterior, o Coach reduz a semana seguinte; se o aluno cumpre menos de 50% do prescrito, entra num "regime de destreino" [F1]. Desde 2024 a intensidade também se ajusta pela **Prontidão (Readiness)** [F11].
3. No relógio, o Coach mostra a sessão do dia e dá partida rápida no modo de treino [F5][F6]. A orientação durante a execução vem das ferramentas genéricas do relógio: alertas de FC, ritmo e km, pacer virtual, voz, modelos de treino e intervalos [F5][F6]. **Não confirmado** que o Coach monte blocos intervalados com alvo por etapa.
4. As métricas "de relógio" são **Efeito de Treino** aeróbico/anaeróbico (0–5), **Carga de Treino** (EPOC somado em 7 dias), **Tempo de Recuperação** (0–96 h) e **VO₂ máx.** [F5][F6]. Os nomes e as escalas são os da Firstbeat, licenciada pela Amazfit em 2018 [F43][F45]. Hoje a Zepp apresenta esses motores como próprios ("PeakBeats") [F10]. **Não confirmado** se ainda usa Firstbeat.
5. As métricas de saúde são **BioCharge** (0–100), **Prontidão** (FC e VFC do sono, qualidade respiratória e temperatura), **PAI** (licenciado da PAI Health/HUNT), sono com fases e pontuação, estresse por VFC e SpO₂ [F6][F10][F48].
6. As zonas de FC usam por padrão FC máx. = **220 − idade** [F26]. Podem ser calculadas por FC máxima ou por **reserva (Karvonen)** [F7][F37], e há teste e detecção automática de **limiar de lactato** [F6].
7. A IA conversacional é outro produto. O **Zepp Flow** usa GPT-4o da OpenAI [F20]. O **Zepp Aura** é pago (US$ 11,99/mês) e voltado a sono [F15]. O "Zepp Coach Chat" com LLM começou como beta em 2023 [F16][F17]. A política de privacidade lista Coach, Aura e Flow como serviços de IA, mas **não nomeia o fornecedor de modelo** [F33].
8. **Exportação** para Health Connect/HealthKit: a Zepp documenta apenas que sincroniza com "Apple Health/Google Fit" [F30] e que a VFC do Balance 2 passou a ir para o Apple Health em agosto de 2026 [F23]. Fontes secundárias dizem que a escrita no Health Connect é só de ida e cobre passos, sono, FC, treinos, SpO₂ e peso [S1][S3][S4]. **Não confirmado em fonte primária** que a série de FC do treino, o VO₂ máx. ou a carga saiam do ecossistema.
9. Para **empurrar treino estruturado ao relógio**, a Zepp não tem API pública documentada [F41]. Mesmo assim, TrainingPeaks, Intervals.icu, Runna e os brasileiros **SisRUN** e **Treinus** já fazem isso em modelos recentes [F29][S7][S9][F50]. Isso indica um canal de parceiro. Há também o caminho do **Mini Program Zepp OS**, que lê FC ao vivo e o estado de treino no relógio e envia a um servidor [F36][F37][F42].

---

## 2. Catálogo de funcionalidades

### 2.1 Tabela mestra

| Funcionalidade | O que faz | Dados de entrada | Gratuito / pago | Fonte |
|---|---|---|---|---|
| Zepp Coach: plano | Gera plano diário/semanal e sincroniza a sessão do dia com o relógio | Questionário (exercício dos últimos 1–2 meses, dias de descanso, data de início); características físicas; dias e tempo disponíveis | Gratuito | [F1][F4][F5][F2] |
| Zepp Coach: planos de corrida | Plano para 3K, 5K, 10K, meia e maratona, ajustado semana a semana | Objetivo de prova + histórico + condição | Gratuito | [F2][F16][F21] |
| Zepp Coach: adaptação | Ajusta duração, frequência e intensidade; sugere descanso | TRIMP, CTL 42 d, ATL 7 d, TSB, prontidão, sono, estresse | Gratuito | [F1][F11][F2] |
| Zepp Coach Chat | Responde perguntas de treino por voz ou texto | Texto/voz do usuário | Beta em 2023; hoje há um "chatbot de fitness" na assinatura Zepp Fitness | [F17][F18][F14] |
| Calendário de Treino | Junta Coach, planos oficiais, planos de terceiros e treinos livres; compara semanas com IA | Planos + histórico | Gratuito (Zepp OS 5/6) | [F6][F24][F23] |
| Biblioteca de planos oficiais | Planos fixos de iniciante a meia maratona | Escolha do usuário | Gratuito | [F6] |
| Modelos de treino / Biblioteca de treinos | Treino por etapas (tipo, alvo, lembrete, repetições) feito no app e enviado ao relógio | Edição manual ou treino oficial | Gratuito | [F5][F6] |
| Intervalado no relógio | Etapas de esforço e descanso por distância, tempo e voltas | Edição no relógio | Gratuito | [F5][F6] |
| Efeito de Treino (TE) | Pontua de 0,0 a 5,0 o efeito aeróbico e anaeróbico da sessão | Perfil + FC + velocidade | Gratuito | [F5][F6] |
| Carga de Treino | Soma de EPOC em 7 dias, em faixa baixa/moderada/alta personalizada | FC da sessão, histórico | Gratuito | [F5][F8] |
| Tempo de Recuperação | Recomenda de 0 a 96 h de recuperação | FC do último treino | Gratuito | [F5][F8] |
| VO₂ máx. | Estima o VO₂ máx. e classifica em 7 níveis por idade e sexo | Perfil + FC + velocidade (+ altitude) em corrida externa | Gratuito | [F5][F7][F8] |
| Equilíbrio de Estresse de Treino (TSB) | Nível de forma (CTL) − nível de fadiga (ATL) | Esforço diário | Gratuito | [F8][F9][F50] |
| Esforço (Exertion) | Meta diária de esforço com treino recomendado | TRIMP acima de um limiar pessoal por ≥ 3 min | Gratuito | [F9][F14] |
| Desempenho em Tempo Real | Compara o estado atual com o histórico (−10% a +10%) durante a corrida | Mesmas condições do VO₂ máx. | Gratuito | [F5][F6] |
| Previsão de prova | Estima tempo de prova | Histórico de corrida externa + VO₂ máx.; exige ao menos uma corrida de 3 km | Gratuito | [F8] |
| Limiar de lactato | Teste guiado ou detecção automática de ritmo e FC de limiar | Corrida com intensidade suficiente | Gratuito (modelos recentes) | [F6][F25] |
| Zonas de FC | 5 zonas por % da FC máx. ou por reserva de FC | Idade (220 − idade), FC de repouso, valor manual | Gratuito | [F9][F26][F7][F37] |
| FC pós-treino | Mede a FC nos 3 min após o treino | FC | Gratuito | [F5][F6] |
| Prontidão (Readiness) | Nota matinal de recuperação física e mental | FC de repouso no sono, VFC no sono, qualidade respiratória, temperatura | Nota gratuita; os "Insights" exigem Zepp Aura | [F10][F11][F12] |
| BioCharge | "Bateria" corporal de 0 a 100, atualizada ao longo do dia | FC, estresse, sono, VFC, qualidade respiratória, atividade | Gratuito; o manual não cita assinatura para a interpretação | [F6][F7] |
| HybridCharge / LifeLoad | Junta BioCharge, LifeLoad (estresse e demanda do dia) e carga de treino | Os três índices | Gratuito (Balance 3, Cheetah 2 Pro) | [F21][F22] |
| PAI | Pontuação semanal de atividade por FC; meta ≥ 100 | FC, intensidade, perfil | Gratuito | [F5][F9][F46] |
| Sono | Sono noturno e cochilos, fases leve/profundo/REM, pontuação, respiração | Acelerômetro + PPG | Gratuito; relatórios avançados no Aura | [F5][F10][F15] |
| VFC | RMSSD, com linha de base de cerca de 7 noites | PPG no sono | Gratuito | [F8][F9] |
| Estresse | Índice por variação da VFC, medido a cada 5 min | PPG | Gratuito | [F5] |
| SpO₂ | Medição manual ou automática em repouso e alerta de baixa (faixa de 80–100% no Balance 2) | PPG | Gratuito | [F5] |
| Força | Reconhece 25 exercícios e conta repetições, séries e descanso | Acelerômetro/giroscópio | Gratuito | [F27][F22] |
| Detecção automática de treino | Reconhece 8 tipos (caminhada, esteira, corrida, bike, natação em piscina, elíptico, remo...) | Sensores | Gratuito | [F5][F6] |
| Voz durante o treino | Anuncia parciais, pausa e resumo em fone Bluetooth | — | Gratuito | [F5][F6] |
| Navegação e rotas | Importa GPX/TCX/KML, mapas offline, volta ao início | GPS | Gratuito | [F5][F6] |
| RPE pós-treino | Registra a percepção de esforço após a sessão | Usuário | Gratuito (Zepp OS 6) | [F23][F24] |
| Zepp Flow | Assistente de voz no relógio | Voz; GPT-4o | Gratuito, em regiões selecionadas | [F20][F21] |
| Zepp Aura | Música de sono com IA, chat de sono e relatórios | Sono, dados fisiológicos | Pago: US$ 11,99/mês ou US$ 69,99/ano, com versão gratuita limitada | [F15][F5] |

### 2.2 Coach e planos

**Criação do plano.** O caminho no app muda conforme a versão. Pode ser "Zepp App > Workout > card Zepp Coach > Customize Plan" [F5] ou "Home > Profile > Zepp Coach > Edit Plan" [F6]. Nos dois casos o usuário preenche "a situação de exercício dos últimos 1 a 2 meses", escolhe os dias de descanso e a data de início [F4][F5][F6]. O post oficial de 2023 cita também características físicas, nível de experiência, frequência semanal e o tempo que o usuário pode dedicar. Ele diz: "Não é preciso fazer testes de aptidão ou avaliações antes de começar" [F1]. A documentação do T-Rex 3 menciona uma "avaliação de nível" opcional na tela inicial do app [F4]. O protocolo dessa avaliação **não está documentado**.

**Tipos de plano.** Há "planos de treino regulares, aplicáveis à maioria dos modos de treino" e "planos de corrida especializados" para 3K, 5K, 10K, meia e maratona [F2][F3]. O Cheetah 2 Pro fala em sessões aeróbicas, de limiar e "de força para dar durabilidade" dentro do ciclo de corrida [F21]. Um comunicado de 2026 menciona orientação "em resistência, força e treino híbrido" [F22]. **Não confirmado** que exista um plano de musculação gerado pelo Coach com exercícios, séries e cargas. Um plano de perda de peso ou de "saúde" como objetivo explícito também **não foi confirmado** em fonte primária. O manual do app copiado pelo manuals.plus menciona o preenchimento do "propósito do exercício" [S12].

**Adaptação.** Conforme o post técnico oficial [F1]:
- O TRIMP "usa o monitoramento contínuo da FC e a duração da sessão para gerar um único número que representa o estresse de treino". Minutos em FC alta pesam mais que minutos em FC baixa.
- "Fitness é a carga de treino dos últimos 42 dias (CTL)"; "Fadiga é a carga média dos últimos 7 dias (ATL)"; "Equilíbrio de estresse = CTL − ATL".
- "Se você aumenta a carga mais de 50% em relação à semana anterior [...] o Zepp Coach reduz automaticamente a carga da semana seguinte."
- "Se você não atinge 50% do treino prescrito, o Zepp Coach inicia um regime de destreino e exige aumento gradual de carga."
- O Coach pode "ajustar duração, frequência e intensidade das sessões e até recomendar um dia de descanso".
- A página de produto atual acrescenta ajuste "após uma noite ruim de sono ou considerando o estresse do dia" [F2][F3]. Desde o Zepp OS 3.5 (junho de 2024), "a intensidade do programa se ajusta à sua prontidão" [F11].
- Em planos de corrida, o usuário pode modificar a agenda semanal ou pular sessões [F25].

**Execução.** A agenda diária aparece no app "Zepp Coach" do relógio e no card do app. O relógio permite lembrete e partida rápida do modo de treino. Treinos iniciados pela lista comum de modos "entram nas estatísticas do dia" [F5][F6]. Uma fonte secundária diz que o relógio conduz a sessão "com alvos de ritmo ou FC" [S10]. **Não confirmado em fonte primária.**

**Pós-treino.** O registro mostra TE, carga, tempo de recuperação, VO₂ máx. e FC pós-treino [F5][F6]. O Zepp OS 6 acrescenta RPE, nota de voz e equipamento vinculado [F23][F24]. O Calendário de Treino compara semanas com IA [F6]. Um "relatório do Coach" específico **não foi confirmado**.

**Chat e IA.**
- Março de 2023: beta do "Zepp Coach Chat" para usuários do Falcon [F17].
- Junho de 2023: o lançamento do Cheetah descreve IA generativa e LLM em formato de perguntas e respostas, por voz ou texto, e planos de prova ajustados semana a semana [F16].
- Maio de 2024: o blog oficial diz que o Zepp Flow e os chatbots do Zepp Aura e do Zepp Fitness foram feitos "com o uso do portal do ChatGPT" [F19].
- Julho de 2024: o Zepp OS 4 integra o GPT-4o da OpenAI ao Zepp Flow, com respostas faladas em português [F20].
- O modelo que alimenta o **Coach** (planos) e o **Coach Chat** não é nomeado [F18][F19][F20].
- Em outubro de 2024 aparece a assinatura "Zepp Fitness" com relatórios semanais e mensais e um "chatbot de IA de fitness" [F14]. Preço e disponibilidade atuais **não confirmados**.

### 2.3 Métricas fisiológicas de treino

| Métrica | Definição publicada | Condições | Fonte |
|---|---|---|---|
| Efeito de Treino (aeróbico e anaeróbico) | Escala de 0,0 a 5,0: 0–0,9 sem efeito; 1–1,9 recuperação; 2–2,9 mantém; 3–3,9 melhora; 4–4,9 melhora muito; 5,0 sobrecarga. Cresce durante o treino | Treino com FC; perfil + FC + velocidade | [F5][F6] |
| Carga de Treino | "Calculada com base no EPOC", soma dos últimos 7 dias; faixa moderada "depende dos dados recentes e de longo prazo" | Atingir a carga mínima numa sessão | [F5][F8] |
| Tempo de Recuperação | 0–18 h recuperado; 19–35 h treino normal; 36–53 h reduzir; 54–96 h descanso | Baseado na FC do último treino | [F5][F8] |
| VO₂ máx. | 7 níveis por idade e sexo (tabela no manual do T-Rex 3 Pro) | Corrida externa, pista, ultra ou trilha; ≥ 10 min acima de 6 km/h com FC ≥ 75% da FC máx.; terreno plano e baixa altitude | [F5][F7][F8] |
| CTL / ATL / TSB | CTL = média ponderada do esforço em 42 dias; ATL = em 7 dias; TSB = CTL − ATL | Esforço diário | [F8][F9][F1] |
| Esforço (Exertion) | Baseado em TRIMP; acumula "quando a FC passa um limiar personalizado por ≥ 3 minutos"; meta diária | FC contínua | [F9][F14] |
| Desempenho em Tempo Real | Excelente +10%; muito bom +5 a +9%; bom −5 a +4%; cansado −10 a −4%; exausto < −10% | Mesmas condições do VO₂ máx. | [F5][F6] |
| Limiar de lactato | Ritmo e FC de limiar por teste ou atualização automática ("Heart Rate Zone > Lactate Threshold Heart Rate > Automatic Update") | Corrida | [F6][F25] |
| Potência, tempo de contato, oscilação | Potência em watts por passada; tempo de contato com simetria; oscilação vertical | Modelos com essas métricas | [F8] |
| Recuperação da FC | Queda ≥ 12 bpm em 1 min ou ≥ 22 bpm em 2 min indica bom condicionamento | FC até 3 min após o treino | [F8][F9][F5] |

> **Duas "cargas" diferentes.** A **Carga de Treino** do relógio usa EPOC somado em 7 dias [F5]. O **Coach e o Esforço** usam TRIMP com CTL/ATL [F1][F9]. A documentação não explica como as duas se relacionam. **Não confirmado.**

### 2.4 Execução do treino no relógio

- **Modos:** mais de 170 modos de esporte [F5][F21].
- **Assistente de treino:** metas por duração, distância, calorias ou efeito; alertas de distância por km, FC segura, faixa de FC, ritmo mais rápido e mais lento, cadência, velocidade, tempo, calorias, hidratação e retorno [F5][F6].
- **Parciais:** volta automática por distância configurável e volta manual, com detalhe por volta [F5][F6].
- **Pacer virtual:** mostra o ritmo, a distância à frente ou atrás do pacer e a posição relativa [F5][F6].
- **Assistente de cadência:** som ou vibração no ritmo definido [F5].
- **Pausa automática** e **Smart Start**, que inicia o registro ao detectar movimento depois do GPS [F5][F6].
- **Carga levada** (mochila/colete) de 0,5 a 50 kg em caminhada e corrida [F6].
- **Modelos de treino:** criados em "Zepp app > Workout > More > Training", com etapas, tipos de etapa, lembretes e repetições [F5]. Nas versões novas viraram "Biblioteca de Treinos", com treinos oficiais prontos [F6][F24].
- **Intervalado** editável no próprio relógio: esforço e descanso por distância, tempo e voltas [F5][F6].
- **Calendário de Treino** no relógio, com as sessões do dia e da semana [F6][F23].
- **Voz:** anúncio de parciais, pausas e resumo via fone Bluetooth [F5][F6].
- **Navegação:** importação de GPX/TCX/KML pelo app, mapas offline, alerta de curva, perfil de altitude, retorno ao início [F5][F6].
- **Detecção automática** de 8 tipos, com sensibilidade ajustável; consome bateria [F5][F6].
- **Força:** 25 exercícios reconhecidos, com contagem de repetições, séries e descanso; rotina planejada no app e enviada ao relógio; grupos musculares treinados [F27][F22].
- **HYROX:** planos, simulação de prova e pacer virtual específico [F22].
- **Equipamentos:** remo FTMS (por exemplo, Concept2) exibido ao vivo [F23].
- **Armazenamento:** até 100 treinos no relógio; a Zepp recomenda sincronizar logo após o treino para não sobrescrever [F5][F6].

### 2.5 Saúde e recuperação

- **Prontidão (Readiness):** "usa FC de repouso no sono, VFC no sono, qualidade respiratória e temperatura corporal para gerar uma nota" de recuperação física e mental [F10][F11]. Sai ao fim do sono [F12]. "O serviço de Insight da Prontidão exige assinatura Zepp Aura", só em regiões selecionadas [F12]. A base com "680+ análises profissionais" apareceu só em trecho de busca do manual, **não verificado**.
- **BioCharge:** "com base em FC, estresse, sono, VFC, qualidade respiratória e atividade, mede fadiga e recuperação". Vai de 0 a 100, atinge o pico ao acordar, cai com esforço e estresse e sobe com cochilo e relaxamento. Traz "análise escrita por especialistas" e histórico de 7 dias. A própria Zepp avisa que é "apenas referência" [F6][F7][F9].
- **LifeLoad e HybridCharge:** LifeLoad "acrescenta o contexto do estresse e das demandas do dia". HybridCharge combina BioCharge, LifeLoad e Carga de Treino [F22][F21].
- **PAI:** "calculado com base na FC, na intensidade das atividades diárias e em dados fisiológicos". Manter PAI acima de 100 "ajuda a reduzir o risco de morte cardiovascular", segundo o HUNT Fitness Study [F5][F9]. Vem de parceria com a PAI Health desde 2018 [F48].
- **Sono:** sono que cruza 0h–8h conta como noturno; sono a mais de 60 min do noturno é cochilo; menos de 20 min não é registrado. Há fases, pontuação, monitoramento assistido (REM) e qualidade respiratória [F5]. O motor se chama "SomnusCare" [F10]; o de sono da linha 2026 é "RestoreIQ" [F21].
- **VFC:** RMSSD, com linha de base de cerca de 7 noites; faixa típica de 20 a 200 ms [F9].
- **Estresse:** "calculado a partir de mudanças na VFC", automático a cada 5 min, com alerta após 10 min alto [F5].
- **SpO₂:** manual, automático em repouso e alerta de baixa após 10 min [F5].
- **Esforço e Saúde do Coração:** o Zepp App 9 põe na tela inicial três notas diárias (Sono, Esforço e Prontidão) e um painel com FC, FC de repouso, VFC e SpO₂ [F14][F13].
- **Zepp Aura:** o chat resume o sono às segundas-feiras (exige 4 ou mais noites na semana) e no dia 1º (exige 15 ou mais noites no mês). O chat livre só vale para assinantes [F5]. A versão gratuita dá 1 mensagem por dia ao assistente de sono [F15].

### 2.6 Integrações e dados

Detalhe completo na seção 4.
- **Apps suportados:** Strava, adidas Running, TrainingPeaks, komoot, Relive, Google Fit e Apple Health. Samsung Health e MyFitnessPal não são suportados [F32].
- **Configuração:** Strava e Relive por "Add accounts"; Apple Health e Google Fit adicionando o Zepp como fonte de dados [F30].
- **TrainingPeaks e Intervals.icu:** vínculo em "Profile > 3rd-party account linking". Treinos concluídos sobem para a plataforma e planos descem ao relógio. Exige Zepp OS 5; primeiro no T-Rex 3 Pro e no Balance 2 [F29].
- **No Brasil:** a lista de integrações do Active 3 Premium inclui a brasileira **Treinus** [F50].

### 2.7 Privacidade

- **Política do app (vigente desde 14/07/2026)** [F33]:
  - Coleta FC, FC de repouso, zona e FC máxima, SpO₂, estresse, emoções, PAI, dados PPG e ECG, VFC, peso e IMC. "Tratamos esses dados se você consentir."
  - Serviços de IA: "Quando você usa serviços de IA como Zepp Flow, Zepp Aura e Zepp Coach, coletamos a informação que você insere, notificações e conteúdo de resposta e contatos". Esses dados são combinados com "suas outras informações pessoais" para gerar recomendações e respostas.
  - **Nenhum fornecedor de IA é nomeado.** Isso contrasta com os comunicados que citam OpenAI e GPT-4o para o Flow [F20] e o "portal do ChatGPT" para Aura e Zepp Fitness [F19].
  - Armazenamento: data centers na China, nos EUA e na Alemanha. Usuários do EEE ficam na Alemanha; EUA e Canadá, nos EUA. Brasil **não é citado** como região de armazenamento.
  - Retenção: "enquanto você usar nossos produtos". Direitos de exclusão e portabilidade pelo portal de privacidade.
  - O Brasil aparece só no direito de reclamar à autoridade supervisora. **Não há adendo LGPD.**
  - Integrações citadas: Strava, WeChat, Google Fit e Relive. Apple Health e Health Connect não são mencionados na política.
- **Política do site (01/06/2026):** não cobre dados de dispositivo nem de app [F34].

### 2.8 Nomenclatura em português

Termos confirmados no site oficial brasileiro (br.amazfit.com). O texto do app Zepp em pt-BR não foi acessível, então os nomes exatos das telas ficam **não confirmados**.

| Inglês | Português usado pela Amazfit Brasil | Fonte |
|---|---|---|
| Zepp Coach | "Zepp Coach™" (mantido em inglês); "Planos de treinamento do Zepp Coach™" | [F50][F51] |
| Training Load | "Carga de Treino" / "carga de treino" | [F50][F51] |
| Training Effect | "Efeito do Treino" / "efeito de treino" | [F50][F49] |
| Recovery Time | "tempo de recuperação"; "Status de recuperação" | [F51][F49] |
| VO₂ Max | "VO₂ máx." | [F51][F49] |
| Training Stress Balance | "Equilíbrio de Estresse de Treino" | [F50] |
| Real-time Performance | "Desempenho em Tempo Real" | [F50] |
| Heart rate zones | "Zonas de frequência cardíaca" | [F50] |
| Lactate threshold | "limiar de lactato" | [F49] |
| HRV | "VFC" (às vezes "HRV") | [F49] |
| Workout modes | "modos de treino" | [F51] |
| Readiness | **não confirmado** ("Prontidão" é tradução provável, sem fonte) | — |
| "Treinador Zepp" | Aparece só em vídeos de usuários brasileiros | [S13] |

BioCharge, LifeLoad, HybridCharge, RestoreIQ, Zepp Flow e Zepp Aura ficam em inglês no site brasileiro [F49][F50].

---

## 3. Algoritmos e fórmulas publicados

| Tema | O que é público | O que é proprietário ou não publicado |
|---|---|---|
| **Zonas de FC** | FC máx. = 220 − idade por padrão [F26]. Cinco zonas de 50% a 100% da FC máx.: Esforço leve, Queima de gordura, Aeróbica, Anaeróbica, Esforço máximo [F9]. Opção por reserva de FC (Karvonen, com a FC de repouso do perfil) [F7][F8]. Na API do Zepp OS o tipo de zona é 0 = reserva, 1 = máxima, com FC de repouso e 6 limites [F37]. Há opção de FC de limiar de lactato [F6]. | Percentuais exatos de cada zona no método por reserva e no método por limiar: **não confirmados** em fonte primária. |
| **VO₂ máx.** | Entradas: perfil, FC e velocidade (e altitude) em corrida externa de ≥ 10 min acima de 6 km/h com FC ≥ 75% da FC máx. [F7][F8]. O método Firstbeat, usado pela Amazfit em 2018 [F43], é público em white paper: segmenta a FC em faixas, escolhe os trechos mais confiáveis e usa a relação linear ou não linear entre FC e velocidade até a FC máx. O erro médio é ~5% (2690 corridas de 79 corredores) e cresce se a FC máx. estimada estiver errada [F44]. | Se o algoritmo atual da Zepp ainda é Firstbeat: **não confirmado**. A Zepp apresenta o motor como próprio ("PeakBeats") [F10], e a Firstbeat foi comprada pela Garmin em 2020 [S15]. |
| **Efeito de Treino / Carga (EPOC)** | TE de 0 a 5 e carga como EPOC somado em 7 dias [F5]. No modelo Firstbeat, o TE depende do **pico de EPOC** na sessão e da "classe de atividade" (0–10, escala de Ross & Jackson estendida). O EPOC é previsto pela FC durante o exercício; quanto mais intenso e longo, e quanto menos pausa, maior o EPOC [F45]. | A fórmula que estima EPOC a partir da FC é proprietária (há white paper, sem coeficientes). Se a Zepp usa esse modelo hoje: **não confirmado**. |
| **Tempo de Recuperação** | Faixas de 0 a 96 h e a informação de que se baseia na FC do último treino [F5]. | Cálculo: **não publicado**. |
| **TRIMP / CTL / ATL / TSB (Coach)** | TRIMP = FC × duração, com mais peso para FC alta; CTL em 42 dias, ATL em 7, TSB = CTL − ATL; regra de +50% por semana e regime de destreino abaixo de 50% [F1]. O Esforço usa TRIMP acima de limiar pessoal por ≥ 3 min [F9]. | Variante de TRIMP (Banister, Edwards ou outra), constantes das médias ponderadas e valor do limiar: **não publicados**. |
| **PAI** | Derivado no HUNT Fitness Study (n = 4.631) e validado na população HUNT (n = 39.298, 20–74 anos). Categorias por sexo (≤ 50, 51–99, ≥ 100). PAI ≥ 100 esteve associado a risco de morte cardiovascular 17% menor em homens e 23% menor em mulheres [F46]. O PAI converte a FC semanal em pontuação pessoal usando FC de repouso e FC máxima [F47]. | A fórmula completa é proprietária da PAI Health e licenciada à Huami/Zepp [F48]. Uma fonte secundária cita teto diário de 75 e acúmulo mais lento acima de 50 (**não verificado**). |
| **Prontidão** | Entradas: FC de repouso e VFC no sono, qualidade respiratória, temperatura [F10][F11]. | Pesos, escala e linha de base: **não publicados**. |
| **BioCharge / LifeLoad** | Entradas: FC, estresse, sono, VFC, respiração, atividade; escala de 0 a 100 [F6][F9]. | Algoritmo: **não publicado**. |
| **VFC** | RMSSD, com linha de base de cerca de 7 noites [F9]. | Janela exata de amostragem: **não publicada**. |
| **Estresse** | Índice por variação da VFC, a cada 5 min [F5]. | Escala e cálculo: **não publicados**. |
| **Previsão de prova** | Usa histórico de corrida externa, VO₂ máx. e condição; exige ao menos uma corrida de 3 km [F8]. | Fórmula: **não publicada**. |

---

## 4. O que a Zepp exporta e o que fica preso no ecossistema

Esta é a parte com mais lacunas. **Nenhuma fonte primária da Zepp lista os tipos de dado escritos no Health Connect.**

### 4.1 Health Connect (Android)

| Afirmação | Tipo de fonte | Fonte |
|---|---|---|
| Sincroniza com "Google Fit" adicionando o Zepp como fonte (texto antigo, sem citar Health Connect) | Primária | [F30][F32] |
| Vínculo em "Profile > 3rd-party account linking > Health Connect", com permissões por métrica (pressão, FC, sono, peso) | Secundária (Reddit de representante da Zepp, jan/2025) | [S1] |
| "26 tipos" de dado, **só escrita** (nada é lido de volta) | Secundária | [S2] |
| Leitura de **peso** do Health Connect adicionada depois | Secundária (trecho de busca) | [S1] |
| Relato de FC não aparecendo corretamente | Secundária | [S1] |
| Tipos entregues: fases do sono, FC, FC de repouso, frequência respiratória, SpO₂, passos, distância, calorias ativas e basais, andares, sessão de exercício, altura, peso | Secundária (agregador) | [S4] |

**Não confirmado:**
- se a **sessão de exercício** vem com a **série de FC** do treino ou só com o resumo;
- se há **rota** (ExerciseRoute), **VO₂ máx.** (Vo2MaxRecord), **VFC** ou temperatura;
- a **latência** exata.

A fonte secundária diz que a exportação "só dispara depois que o Zepp puxa dados do relógio" [S3]. A documentação oficial indica que a sincronização relógio → app é automática com Bluetooth e app abertos, e que um treino em andamento bloqueia parte da sincronização [F5].

### 4.2 Apple Health (HealthKit)

| Afirmação | Tipo de fonte | Fonte |
|---|---|---|
| Sincroniza com Apple Health adicionando o Zepp como fonte | Primária | [F30] |
| VFC do **Balance 2** passa a ir para o Apple Health (27/08/2026) | Primária | [F23] |
| VFC do Balance 3 e do Balance Ultra vai para o Apple Health | Apareceu só em trecho de busca, sem página localizada: **não confirmado** | — |
| Vão: passos, sono, FC (repouso e treino), treinos (ritmo, distância, calorias em atividades com GPS), energia ativa, SpO₂, peso; VFC parcial | Secundária | [S3] |
| **Não vão:** estresse, prontidão, PAI | Secundária | [S3] |
| Apenas 3 a 4 leituras de VFC por dia chegam, não a série noturna | Secundária | [S3] |

### 4.3 Strava e plataformas de treino

- **Strava:** vão corrida externa, caminhada e bike com GPS. Não vão atividades indoor, natação, atividades sem GPS nem atividades antigas (trecho de busca da FAQ oficial [F31]). A política coreana da Zepp detalha o que vai: período, distância, altitude, velocidade, ritmo e FC [F33].
- **TrainingPeaks e Intervals.icu:** ida e volta. Treinos concluídos e métricas sobem; planos estruturados descem ao relógio [F29].
- **Runna:** as próximas 2 semanas de treino vão ao app Zepp. Na volta, só T-Rex 3 Pro e Balance 2 devolvem FC, cadência, calorias, distância e ritmo. Só corrida; força não sincroniza [S9].
- **SisRUN (Brasil):** login pela conta Zepp (`user.zepp.com`). O treino feito volta como feedback, e o treino estruturado vai ao relógio, enviado pelo treinador ou pelo aluno. Só alguns modelos (Active, Balance, T-Rex 3...) recebem treino estruturado, e treinos descritivos não funcionam [S7].
- **Treinus (Brasil):** listada como integração oficial no Active 3 Premium [F50]. Pela central de ajuda (vista só em trecho de busca), sincroniza treinos feitos a partir da data de conexão e envia treinos prescritos ao relógio [S8].
- **Terra (agregador):** cria, edita e apaga treinos estruturados de corrida, trilha, bike e natação. Alvos de FC, potência, ritmo, velocidade, cadência ou zona. **Janela de 7 dias:** o treino só aparece no relógio se estiver agendado de hoje até hoje + 6. Não suporta força. Lê atividade, totais diários e sono com consulta a cada 5–10 min [S5][S6].

### 4.4 APIs e SDKs

| Canal | O que permite | Status | Fonte |
|---|---|---|---|
| **Huami/Zepp REST API** | OAuth 2.0; perfil, atividade diária e horária, sono, **FC contínua**, dados de movimento brutos, treinos (resumo e detalhe), notificações por webhook | **Só parceiros**, com pedido em dev.huami.com e análise de 3 a 7 dias; empresas têm prioridade; wiki editado pela última vez em nov/2020; SDKs "não lançados formalmente" | [F40] |
| **Enviar treino estruturado via API** | — | Pergunta pública de fev/2026 sem resposta da Zepp até jul/2026 [F41]. Apesar disso, TrainingPeaks, Runna, SisRUN e Terra já fazem, o que indica um canal de parceiro não documentado. **Não confirmado** como obter acesso. | [F41][F29][S5][S7] |
| **Zepp OS: sensor HeartRate** | `getCurrent()` e `onCurrentChange()` para FC **ao vivo**; `getToday()`, `getResting()`, `getDailySummary()`, `getAFibRecord()`; permissão `data:user.hd.heart_rate` | Público | [F36] |
| **Zepp OS: sensor Workout** | `getStatus()` (VO₂ máx., Carga de Treino, Tempo de Recuperação); `getHistory()` (início e duração); `getUserHrZoneSettings()` (API 4.2+). **Só leitura**, não cria treino. Permissão `data:user.hd.workout` | Público | [F37] |
| **Zepp OS: Workout Extension** | Plugin dentro do app de Treino do relógio, com tela própria de dados em tempo real, sensores Bluetooth e sincronização via rede | Público; Zepp OS 3.5+ (T-Rex 3, Cheetah, Falcon, T-Rex Ultra) | [F38] |
| **Zepp OS: Side Service + Fetch** | App no relógio → Bluetooth → serviço dentro do app Zepp no celular → `fetch` para um servidor próprio. "A maioria dos dados de sensor de saúde só é obtida para o mesmo dia"; envio contínuo exige o mini app rodando | Público | [F42][F39] |
| **Exportação LGPD/GDPR** | Pedido de portabilidade pelo portal de privacidade | Formato do arquivo: **não confirmado** | [F33] |
| **Integrações não oficiais** | Ferramentas que usam a API interna fazem engenharia reversa e obtêm FC, velocidade e GPS por segundo, sono com fases, VFC e carga | Não oficial (termos de uso e LGPD) | [S11] |

### 4.5 O que fica preso na Zepp

Com base no que as fontes permitem afirmar:
- **Nenhuma fonte primária mostra** Prontidão, BioCharge, LifeLoad, PAI, Efeito de Treino, Carga de Treino, Tempo de Recuperação, TSB, Esforço, Desempenho em Tempo Real, estresse ou pontuação de sono saindo por Health Connect ou HealthKit. A secundária confirma que estresse, Prontidão e PAI **não** vão ao Apple Health [S3].
- VO₂ máx., Carga de Treino e Tempo de Recuperação **são legíveis** por um Mini Program no próprio relógio [F37].
- A série de FC do treino **não é confirmada** no Health Connect nem no HealthKit. É acessível ao vivo por Mini Program [F36] ou pela REST API de parceiro [F40].

> **Próximo passo sugerido (não executado):** confirmar no aparelho de teste com o Health Connect. Parear um Amazfit, fazer uma corrida e inspecionar se o registro `ExerciseSession` vem com `HeartRateRecord` no intervalo, `ExerciseRoute`, `Vo2MaxRecord` e `HeartRateVariabilityRmssdRecord`. Anotar também quanto tempo leva entre o fim do treino e a gravação.

---

## 5. Implicações para o Eleva Pro

Classificação sem decisão. Considera o que o app já lê: tempo, calorias por MET, distância, ritmo e cadência do celular, FC média no fim da sessão, e o agregado diário de passos, calorias ativas, sono em minutos e FC de repouso.

### (a) Reproduzível só com o celular e os dados que já lemos

- **Questionário inicial do Coach**: histórico dos últimos 1–2 meses, dias de descanso, data de início, dias e tempo disponíveis, objetivo de prova de 3K a maratona [F1][F4]. Serve ao "Member" sem especialista.
- **Regras publicadas de progressão**: não subir mais de 50% de carga por semana, e regime de destreino quando o aluno cumpre menos de 50% [F1]. Podem valer para Member e como alerta ao especialista.
- **CTL (42 d) / ATL (7 d) / TSB** sobre uma carga por sessão calculada com o que já existe [F1]. O TRIMP da Zepp exige FC contínua, então uma versão com FC média é aproximação e deve ser apresentada assim. Uma alternativa sem FC é carga por RPE × duração, já que a Zepp adicionou RPE pós-treino no Zepp OS 6 [F23][F24].
- **Zonas de FC** por 220 − idade [F26] e por reserva usando a FC de repouso diária que já lemos [F7][F9]. Bate com a proposta do ADR-0026.
- **Execução guiada no celular**: parcial por km, alerta de ritmo mais rápido ou mais lento, pacer virtual, voz, blocos intervalados por tempo e distância [F5][F6]. Tudo depende só de GPS/pedômetro e tempo.
- **Calendário que junta plano prescrito e treino livre**, como o Calendário de Treino da Zepp [F6][F24].
- **Pontuação diária simples de "recuperação"** com sono (minutos) + FC de repouso. Não é a Prontidão da Zepp, que usa VFC, respiração e temperatura [F10], e não deve ser vendida com esse nome.

### (b) Reproduzível só se Health Connect/HealthKit entregar o dado X

| Funcionalidade | Dado necessário | Estado da confirmação |
|---|---|---|
| TRIMP real, tempo em zona, alerta de zona no pós-treino | Série de FC durante a sessão | **Não confirmado** que a Zepp escreva [S3][S4] |
| Importar cardio feito só com o relógio, sem o celular | `ExerciseSession` escrita pela Zepp | Secundária diz que sim [S3][S4]; primária não |
| Prontidão mais próxima da Zepp | VFC noturna (RMSSD), frequência respiratória, temperatura | VFC ao Apple Health confirmada só para Balance 2/3/Ultra [F23]; Health Connect não confirmado |
| Mostrar o VO₂ máx. do relógio | `Vo2MaxRecord` / `vo2Max` | **Não confirmado** |
| Sono por fase | Estágios de sono | Secundária diz que sim [S4]; o código atual já trata fonte com e sem estágios |
| SpO₂ | Registro de SpO₂ | Secundária [S3][S4] |
| **FC ao vivo do relógio** (ADR-0026) | Transmissão BLE ou Mini Program | Health Connect não é canal ao vivo. Caminhos confirmados: Mini Program Zepp OS com `HeartRate.onCurrentChange` + Side Service `fetch` [F36][F42], ou REST API de parceiro [F40] |
| Enviar a prescrição de cardio ao relógio | API de parceiro de treino estruturado | Existe na prática (TrainingPeaks, Runna, SisRUN, Treinus) [F29][S7][S9][F50], sem documentação pública [F41]; janela de 7 dias e sem força segundo o Terra [S5] |

### (c) Depende de hardware ou algoritmo proprietário, sem reprodução honesta

- **Efeito de Treino, Carga de Treino (EPOC) e Tempo de Recuperação:** modelo de EPOC a partir da FC proprietário, no estilo Firstbeat [F45][F5].
- **VO₂ máx. no nível da Zepp:** exige série de FC + velocidade e um modelo validado. O método Firstbeat é descrito, mas não aberto [F44].
- **PAI:** algoritmo e marca licenciados da PAI Health [F48][F46].
- **Prontidão, BioCharge, LifeLoad, HybridCharge, pontuação de sono, índice de estresse:** entradas conhecidas, pesos não publicados [F10][F6][F22].
- **Desempenho em Tempo Real, detecção de limiar de lactato, potência de corrida, tempo de contato, oscilação vertical** [F5][F6][F8].
- **Reconhecimento automático de 25 exercícios de força** com contagem de repetições: modelo sobre acelerômetro no pulso [F27].
- **Os internos adaptativos do Coach** além das regras publicadas (variante de TRIMP, limiares, uso da prontidão) [F1][F11].

### Pontos que tocam LGPD

- **Série bruta de FC** e VFC são dado pessoal sensível de saúde ([Lei 13.709/2018, art. 5º, II e art. 11][L1]). Ler a série do treino (itens b) muda o volume e a sensibilidade frente ao agregado diário atual. Pede `/lgpd-check`: finalidade, minimização (guardar só o derivado, como TRIMP e tempo em zona?) e retenção.
- **Coordenadas:** o Eleva Pro decidiu não guardar. Importar `ExerciseRoute` do Health Connect ou dados da API de parceiro traria GPS de volta. A própria Zepp trata "trajeto de movimento" e GPS como dado coletado [F33].
- **IA de terceiros:** a política da Zepp junta dado de treino e saúde com a entrada de chat [F33] sem nomear o fornecedor, embora os comunicados citem OpenAI [F19][F20]. Um "Coach com chat" no Eleva Pro que envie dado de saúde a um LLM exige transparência sobre o operador e sobre transferência internacional ([LGPD art. 33][L1]).
- **Integração com conta Zepp:** SisRUN e Treinus pedem login na conta Zepp [S7][S8]. Um canal de parceiro traria dado de saúde de um terceiro controlador (Zepp), com necessidade de base legal e contrato. Uma integração não oficial por engenharia reversa [S11] tem risco contratual e de segurança.
- **Armazenamento da Zepp:** EUA, Alemanha e China, sem região Brasil [F33]. Isso importa se o Eleva Pro orientar o aluno a usar recursos da Zepp como parte do serviço.
- **Menores:** a Zepp não se dirige a menores de 16 anos [F33]. Vale conferir contra o público do Eleva Pro se houver integração.

---

## 6. Fontes

### Primárias

- **[F1]** Zepp Health, "Zepp Coach™ + Amazfit: Stepping Up Performance", 12/07/2023. https://www.zepp.com/blog/zepp-coach-tm-amazfit-stepping-up-performance
- **[F2]** Amazfit US, página "Zepp Coach™". https://us.amazfit.com/pages/zepp-coach%e2%84%a2
- **[F3]** Amazfit Índia, página "Zepp coach". https://in.amazfit.com/pages/zepp-coach
- **[F4]** Amazfit Support (T-Rex 3), "How to use Zepp Coach?". https://support.amazfit.com/en/amazfit_t-rex_3/docs/LIi9dYCmHoAatzxpaTScK02CnWd
- **[F5]** Amazfit Balance 2, manual do usuário (PDF oficial). https://support.amazfit.com/us/amazfit_balance_2/files/user-manual.pdf.pdf
- **[F6]** Amazfit Cheetah 2 Pro, manual do usuário (PDF oficial). https://support.amazfit.com/us/amazfit_cheetah_2_pro/files/user-manual.pdf.pdf
- **[F7]** Amazfit T-Rex 3 Pro, manual do usuário (PDF oficial). https://support.amazfit.com/us/amazfit_t-rex_3_pro/files/user-manual.pdf.pdf
- **[F8]** Amazfit, "Technology Page – Running Technology". https://us.amazfit.com/pages/amazfit-technology-page-running-technology
- **[F9]** Amazfit, "Technology Page – Health Technology". https://us.amazfit.com/pages/amazfit-technology-page-health-technology
- **[F10]** Zepp Health, "Technology". https://www.zepp.com/technology
- **[F11]** Amazfit UK, "June 2024: Amazfit Sports & Outdoor Watches Upgrade to Zepp OS 3.5". https://uk.amazfit.com/blogs/product-updates/june-2024-amazfit-sports-outdoor-watches-upgrade-to-zepp-os-3-5
- **[F12]** Amazfit Support (Helio Ring), "How do I check my readiness score?". https://support.amazfit.com/us/amazfit_helio_ring/docs/A4tGdJXdKof34Gxxa5OcCGAsnPg
- **[F13]** Zepp Health, comunicado "Zepp Health Launches Enhanced Zepp App 9", 31/10/2024. https://www.zepp.com/press-release/zepp-health-launches-enhanced-zepp-app-9-elevating-personalized-health-and-wellness-for-amazfit-users-worldwide
- **[F14]** Zepp Health, "Meet the New and Improved Zepp App", 31/10/2024. https://www.zepp.com/blog/meet-the-the-new-improved-zepp-app
- **[F15]** Amazfit US, página "Zepp Aura". https://us.amazfit.com/pages/zepp-aura
- **[F16]** Amazfit, comunicado de lançamento da série Cheetah (IA generativa no Zepp Coach), 21/06/2023. https://us.amazfit.com/blogs/news/amazfit-launches-new-amazfit-cheetah-series-smartwatches-designed-for-runners-with-industry-leading-gps-technology-ai-coaching
- **[F17]** Amazfit, "Amazfit Introduces New AI-Powered Zepp Coach™ Chat Function for Amazfit Falcon Users", 29/03/2023. https://us.amazfit.com/blogs/news/amazfit-introduces-new-ai-powered-zepp-coach%E2%84%A2-chat-function-for-amazfit-falcon-users
- **[F18]** Zepp Health, "Generative AI-powered smart wearables changing the game in sports and healthcare", 11/05/2023. https://www.zepp.com/blog/generative-ai-powered-smart-wearables-changing-the-game-in-sports-and-healthcare
- **[F19]** Zepp Health, "Zepp Health's Amazfit Becomes the First to Fully Integrate AI into Smartwatches", 22/05/2024. https://www.zepp.com/blog/zepp-healths-amazfit-becomes-the-first-to-fully-integrate-ai-into-smartwatches
- **[F20]** Zepp Health, "Zepp Health Introduces Zepp OS 4 [...] Integrating OpenAI's GPT-4o", 02/07/2024. https://www.zepp.com/press-release/zepp-health-introduces-zepp-os-4-redefining-wearable-intelligence-by-integrating-openais-gpt-4o-into-its-amazfit-smartwatches
- **[F21]** Amazfit US, página do Cheetah 2 Pro. https://us.amazfit.com/products/cheetah-2-pro
- **[F22]** Zepp Health, "Amazfit Introduces a New Era of Hybrid Training with Balance 3 and Balance Ultra", 02/06/2026. https://www.zepp.com/press-release/amazfit-introduces-a-new-era-of-hybrid-training-with-balance-3-and-balance-ultra
- **[F23]** Amazfit UK, "Amazfit Balance 2 Series August 2026 Update [...] Zepp OS 6", 27/08/2026. https://uk.amazfit.com/blogs/product-updates/amazfit-balance-2-series-august-2026-update-a-smarter-training-experience-with-zepp-os-6
- **[F24]** Zepp OS, "Zepp OS 6 Overview". https://os.zepp.com/zepp-os-6-overview
- **[F25]** Amazfit, "Amazfit Balance 2 Update: Train Smarter with Lactate Threshold" (sem data na página). https://us.amazfit.com/blogs/product-update/amazfit-balance-2-update-train-smarter-with-lactate-threshold
- **[F26]** Amazfit Support (GTS 2 mini), "How are the heart rate zones divided [...]". https://support.amazfit.com/en/amazfit_gts_2_mini/docs/OLkBdH8Zio58wbx85rGcCNWfn3y
- **[F27]** Amazfit US, página "Strength Training". https://us.amazfit.com/pages/strength-training
- **[F28]** Zepp Health, "Amazfit Introduces the Active 3 Premium", 26/02/2026. https://www.zepp.com/press-release/amazfit-introduces-the-active-3-premium-turning-daily-movement-into-meaningful-progress-for-entry-level-runners
- **[F29]** Zepp OS News, "Train Smarter with TrainingPeaks and Intervals.icu", 14/11/2025. https://os.zepp.com/news/train-smarter-with-trainingpeaks-and-intervalsicu
- **[F30]** Amazfit Support (GTS 2 mini), "How can I sync to Strava/Apple Health/Google Fit/Relive?". https://support.amazfit.com/en/amazfit_gts_2_mini/docs/N6cUdJxDRo6rbfxiLs1cJDBrnRd
- **[F31]** Amazfit Support FAQ 1201 (restrições do Strava; conteúdo visto só em trecho de busca, a página não renderizou). https://support.amazfit.com/en/faq/1201
- **[F32]** Amazfit Índia, FAQ "What apps can the Zepp App sync with?". https://in.amazfit.com/pages/faq/what-apps-can-the-zepp-app-sync-with
- **[F33]** Zepp, "Zepp Privacy Policy" (app), vigente desde 14/07/2026. https://upload-cdn.zepp.com/tposts/8192 (conteúdo idêntico em https://upload-cdn.huami.com/tposts/8191)
- **[F34]** Zepp Health, política de privacidade do site, vigente desde 01/06/2026. https://www.zepp.com/privacy-policy
- **[F36]** Zepp OS Docs, sensor "HeartRate". https://docs.zepp.com/docs/reference/device-app-api/newAPI/sensor/HeartRate/
- **[F37]** Zepp OS Docs, sensor "Workout". https://docs.zepp.com/docs/reference/device-app-api/newAPI/sensor/Workout/
- **[F38]** Zepp OS Docs, "Workout Extension – Intro". https://docs.zepp.com/docs/guides/workout-extension/intro/
- **[F39]** Zepp OS Docs, "Side Service – Introduction" e "Fetch API". https://docs.zepp.com/docs/guides/framework/side-service/intro/ · https://docs.zepp.com/docs/reference/side-service-api/fetch/
- **[F40]** zepp-health/rest-api, wiki oficial da Huami REST API (última edição 27/11/2020). https://github.com/zepp-health/rest-api/wiki
- **[F41]** GitHub zepp-health, Discussion #494, "Is it possible to create and send structured workouts via REST API?", fev–jul/2026, sem resposta oficial. https://github.com/orgs/zepp-health/discussions/494
- **[F42]** GitHub zepp-health, Discussion #276, "How To Extract Health Data from Amazfit Smartwatches to a Web Server", dez/2023 (fórum oficial da organização). https://github.com/orgs/zepp-health/discussions/276
- **[F43]** Business Wire, "Newly Launched Amazfit Stratos [...] Feature Advanced Fitness and Training Insights From Firstbeat", 09/01/2018. https://www.businesswire.com/news/home/20180109005500/en/Newly-Launched-Amazfit-Stratos-Multisport-Smartwatches-Feature
- **[F44]** Firstbeat Technologies, "Automated Fitness Level (VO2max) Estimation with Heart Rate and Speed Data", white paper, 2014/2017. https://www.firstbeat.com/wp-content/uploads/2017/06/white_paper_VO2max_30.6.2017.pdf
- **[F45]** Firstbeat Technologies, "EPOC Based Training Effect Assessment", white paper, 2012. https://www.firstbeat.com/wp-content/uploads/2015/10/white_paper_training_effect.pdf
- **[F46]** Nes BM, Gutvik CR, Lavie CJ, Nauman J, Wisløff U. "Personalized Activity Intelligence (PAI) for Prevention of Cardiovascular Disease and Promotion of Physical Activity". *Am J Med* 2017;130(3):328–336. https://www.amjmed.com/article/S0002-9343(16)31069-5/fulltext
- **[F47]** Kieffer SK et al., "Association between Personal Activity Intelligence (PAI) and body weight [...] The HUNT study", *Lancet Regional Health – Europe*, 2021. https://pmc.ncbi.nlm.nih.gov/articles/PMC8454800/
- **[F48]** Zepp Health, "Huami Corporation Enters Partnership with PAI Health", 19/07/2018. https://www.zepp.com/press-release/huami-corporation-enters-partnership-with-pai-health
- **[F49]** Amazfit Brasil, Balance 3. https://br.amazfit.com/products/balance-3
- **[F50]** Amazfit Brasil, Active 3 Premium. https://br.amazfit.com/products/active-3-premium
- **[F51]** Amazfit Brasil, Balance 2. https://br.amazfit.com/products/balance-2
- **[L1]** Lei nº 13.709/2018 (LGPD). https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2018/lei/l13709.htm

### Secundárias (complemento, não sustentam fato central sozinhas)

- **[S1]** Notebookcheck, "Amazfit smartwatches get new Health Connect data sync feature", 23/01/2025 (baseado em post de representante no Reddit). https://www.notebookcheck.net/Amazfit-smartwatches-get-new-Health-Connect-data-sync-feature.951489.0.html
- **[S2]** Gadgets & Wearables, "Zepp Health can now sync much more data with Health Connect", 24/01/2025. https://gadgetsandwearables.com/2025/01/24/zepp-health-connect/
- **[S3]** Constant, "Does Amazfit (Zepp) sync with Apple Health?". https://trainconstant.com/blog/amazfit-zepp-apple-health
- **[S4]** Sahha, "Amazfit Integration". https://sahha.ai/integrations/amazfit/
- **[S5]** Terra API, "Zepp and structured workouts". https://tryterra.co/community/zepp-and-structured-workouts
- **[S6]** Terra API, "Zepp API Integration". https://tryterra.co/integrations/zepp
- **[S7]** SisRUN – Central de Ajuda, "Como sincronizar com Zepp (Amazfit)", atualizado em 24/08/2026. https://sisrun.zendesk.com/hc/pt-br/articles/49496659351315-Como-sincronizar-com-Zepp-Amazfit
- **[S8]** Treinus – Central de Ajuda, "Como sincronizar meu Amazfit com a Treinus?" (página bloqueada; conteúdo só em trecho de busca). https://ajuda.treinus.com.br/hc/pt-br/articles/360026777253-Como-sincronizar-meu-Amazfit-com-a-Treinus
- **[S9]** Runna Support, "Using your Amazfit watch with Runna". https://support.runna.com/en/articles/13176839-using-your-amazfit-watch-with-runna
- **[S10]** STAS, "Zepp Coach Review: Plans, Limits, Intervals.icu". https://stas.run/en/guides/zepp-coach-guide
- **[S11]** GitHub lingcang728/ZeppBridge (cliente não oficial da API interna). https://github.com/lingcang728/ZeppBridge
- **[S12]** manuals.plus, "Manual do usuário do aplicativo amazfit Zepp" (visto só em trecho de busca). https://manuals.plus/amazfit/zepp-app-manual
- **[S13]** YouTube, "Treinador Zepp chegou para o Amazfit GTR 4". https://www.youtube.com/watch?v=-leZYzOZMhY
- **[S15]** DC Rainmaker, "Garmin Acquires Firstbeat Analytics", jun/2020. https://www.dcrainmaker.com/2020/06/acquires-firstbeat-analytics.html

[F1]: https://www.zepp.com/blog/zepp-coach-tm-amazfit-stepping-up-performance
[F2]: https://us.amazfit.com/pages/zepp-coach%e2%84%a2
[F3]: https://in.amazfit.com/pages/zepp-coach
[F4]: https://support.amazfit.com/en/amazfit_t-rex_3/docs/LIi9dYCmHoAatzxpaTScK02CnWd
[F5]: https://support.amazfit.com/us/amazfit_balance_2/files/user-manual.pdf.pdf
[F6]: https://support.amazfit.com/us/amazfit_cheetah_2_pro/files/user-manual.pdf.pdf
[F7]: https://support.amazfit.com/us/amazfit_t-rex_3_pro/files/user-manual.pdf.pdf
[F8]: https://us.amazfit.com/pages/amazfit-technology-page-running-technology
[F9]: https://us.amazfit.com/pages/amazfit-technology-page-health-technology
[F10]: https://www.zepp.com/technology
[F11]: https://uk.amazfit.com/blogs/product-updates/june-2024-amazfit-sports-outdoor-watches-upgrade-to-zepp-os-3-5
[F12]: https://support.amazfit.com/us/amazfit_helio_ring/docs/A4tGdJXdKof34Gxxa5OcCGAsnPg
[F13]: https://www.zepp.com/press-release/zepp-health-launches-enhanced-zepp-app-9-elevating-personalized-health-and-wellness-for-amazfit-users-worldwide
[F14]: https://www.zepp.com/blog/meet-the-the-new-improved-zepp-app
[F15]: https://us.amazfit.com/pages/zepp-aura
[F16]: https://us.amazfit.com/blogs/news/amazfit-launches-new-amazfit-cheetah-series-smartwatches-designed-for-runners-with-industry-leading-gps-technology-ai-coaching
[F17]: https://us.amazfit.com/blogs/news/amazfit-introduces-new-ai-powered-zepp-coach%E2%84%A2-chat-function-for-amazfit-falcon-users
[F18]: https://www.zepp.com/blog/generative-ai-powered-smart-wearables-changing-the-game-in-sports-and-healthcare
[F19]: https://www.zepp.com/blog/zepp-healths-amazfit-becomes-the-first-to-fully-integrate-ai-into-smartwatches
[F20]: https://www.zepp.com/press-release/zepp-health-introduces-zepp-os-4-redefining-wearable-intelligence-by-integrating-openais-gpt-4o-into-its-amazfit-smartwatches
[F21]: https://us.amazfit.com/products/cheetah-2-pro
[F22]: https://www.zepp.com/press-release/amazfit-introduces-a-new-era-of-hybrid-training-with-balance-3-and-balance-ultra
[F23]: https://uk.amazfit.com/blogs/product-updates/amazfit-balance-2-series-august-2026-update-a-smarter-training-experience-with-zepp-os-6
[F24]: https://os.zepp.com/zepp-os-6-overview
[F25]: https://us.amazfit.com/blogs/product-update/amazfit-balance-2-update-train-smarter-with-lactate-threshold
[F26]: https://support.amazfit.com/en/amazfit_gts_2_mini/docs/OLkBdH8Zio58wbx85rGcCNWfn3y
[F27]: https://us.amazfit.com/pages/strength-training
[F28]: https://www.zepp.com/press-release/amazfit-introduces-the-active-3-premium-turning-daily-movement-into-meaningful-progress-for-entry-level-runners
[F29]: https://os.zepp.com/news/train-smarter-with-trainingpeaks-and-intervalsicu
[F30]: https://support.amazfit.com/en/amazfit_gts_2_mini/docs/N6cUdJxDRo6rbfxiLs1cJDBrnRd
[F31]: https://support.amazfit.com/en/faq/1201
[F32]: https://in.amazfit.com/pages/faq/what-apps-can-the-zepp-app-sync-with
[F33]: https://upload-cdn.zepp.com/tposts/8192
[F34]: https://www.zepp.com/privacy-policy
[F36]: https://docs.zepp.com/docs/reference/device-app-api/newAPI/sensor/HeartRate/
[F37]: https://docs.zepp.com/docs/reference/device-app-api/newAPI/sensor/Workout/
[F38]: https://docs.zepp.com/docs/guides/workout-extension/intro/
[F39]: https://docs.zepp.com/docs/reference/side-service-api/fetch/
[F40]: https://github.com/zepp-health/rest-api/wiki
[F41]: https://github.com/orgs/zepp-health/discussions/494
[F42]: https://github.com/orgs/zepp-health/discussions/276
[F43]: https://www.businesswire.com/news/home/20180109005500/en/Newly-Launched-Amazfit-Stratos-Multisport-Smartwatches-Feature
[F44]: https://www.firstbeat.com/wp-content/uploads/2017/06/white_paper_VO2max_30.6.2017.pdf
[F45]: https://www.firstbeat.com/wp-content/uploads/2015/10/white_paper_training_effect.pdf
[F46]: https://www.amjmed.com/article/S0002-9343(16)31069-5/fulltext
[F47]: https://pmc.ncbi.nlm.nih.gov/articles/PMC8454800/
[F48]: https://www.zepp.com/press-release/huami-corporation-enters-partnership-with-pai-health
[F49]: https://br.amazfit.com/products/balance-3
[F50]: https://br.amazfit.com/products/active-3-premium
[F51]: https://br.amazfit.com/products/balance-2
[L1]: https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2018/lei/l13709.htm
[S1]: https://www.notebookcheck.net/Amazfit-smartwatches-get-new-Health-Connect-data-sync-feature.951489.0.html
[S2]: https://gadgetsandwearables.com/2025/01/24/zepp-health-connect/
[S3]: https://trainconstant.com/blog/amazfit-zepp-apple-health
[S4]: https://sahha.ai/integrations/amazfit/
[S5]: https://tryterra.co/community/zepp-and-structured-workouts
[S6]: https://tryterra.co/integrations/zepp
[S7]: https://sisrun.zendesk.com/hc/pt-br/articles/49496659351315-Como-sincronizar-com-Zepp-Amazfit
[S8]: https://ajuda.treinus.com.br/hc/pt-br/articles/360026777253-Como-sincronizar-meu-Amazfit-com-a-Treinus
[S9]: https://support.runna.com/en/articles/13176839-using-your-amazfit-watch-with-runna
[S10]: https://stas.run/en/guides/zepp-coach-guide
[S11]: https://github.com/lingcang728/ZeppBridge
[S12]: https://manuals.plus/amazfit/zepp-app-manual
[S13]: https://www.youtube.com/watch?v=-leZYzOZMhY
[S15]: https://www.dcrainmaker.com/2020/06/acquires-firstbeat-analytics.html
