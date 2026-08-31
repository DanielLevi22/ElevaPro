# O aparelho mede, o modelo interpreta

**Data:** 2026-08-30
**Status:** accepted — validado em aparelho em 2026-08-31 (Redmi Note 14 Pro, Android 16, arm64)
**Versão navegável:** [`0022-o-aparelho-mede-o-modelo-interpreta.html`](0022-o-aparelho-mede-o-modelo-interpreta.html) — mesmos diagramas, renderizados. Este arquivo é o canônico.

---

## Contexto

O [ADR-0010](0010-body-scan-calibrado.md) afirma que a análise corporal é calibrada por regra
de três:

> Se o aluno tem 175 cm e ocupa 900 px da cabeça ao pé, o frame tem 5,14 px/cm, e qualquer
> largura na imagem converte para centímetro por regra de três.

**Esse cálculo nunca existiu no código.** Não há `px_por_cm` em nenhum lugar do repositório. O que
existe é uma instrução no prompt do BFF mandando o modelo converter as larguras "a partir dessa
proporção" — ou seja, quem localiza a cabeça e os pés em pixels é o próprio Claude, no olho, a
cada chamada.

As marcas fixas em `BodyScanCamera` (10% e 90% da altura da tela) são a única coisa segurando a
escala, e só funcionam se o aluno encostar exatamente nelas. Ninguém verifica se ele encostou. Se
ele para quatro centímetros abaixo da marca, a régua erra ~2% e todas as circunferências saem
deslocadas juntas, com aparência de número legítimo.

Dois agravantes encontrados junto:

- A chamada em `web/src/app/api/ai/body-scan/route.ts` **não define `temperature`**, então roda no
  padrão 1.0. A mesma foto enviada duas vezes devolve cintura diferente. Parte da "variação" entre
  janeiro e março é o modelo tendo sorteado outro valor — e o ADR-0010 apoia a confiabilidade do
  delta em erro sistemático que se cancela, o que amostragem aleatória não faz.
- `muscle_mass_kg` é massa em quilos vinda de uma foto. O ADR-0010 apagou a estimativa de peso com
  a frase "peso é massa, e nenhuma câmera mede massa" e deixou este campo em pé, na mesma unidade,
  saindo do mesmo lugar.

## Opções consideradas

### Opção A — MediaPipe mede a geometria; o modelo interpreta

- **Prós:** a régua deixa de ser suposição e vira medida; o que é geométrico fica determinístico e
  testável com imagens de fixture; o modelo continua fazendo aquilo em que é bom, agora sobre
  fatos; processamento biométrico acontece no aparelho e nada novo atravessa a fronteira.
- **Contras:** dependência nativa, com iOS bloqueado até o primeiro build existir; superfície
  nativa própria para manter a cada upgrade de SDK; a máscara mede o tecido, não o corpo.

### Opção B — Só melhorar o enquadramento, sem modelo local

- **Prós:** nenhuma dependência nativa, entrega em dias, iOS acompanha.
- **Contras:** silhueta desenhada na tela não verifica nada — é a solução que já está lá e que
  falhou. Sem detectar a pessoa não há como saber se ela encostou nas marcas, e a régua continua
  inexistente. Melhora a foto que entra num passo que continua chutando.

### Opção C — Mover tudo para o aparelho; o modelo faz só o qualitativo

- **Prós:** determinismo total nos números; chamada de IA menor e mais barata.
- **Contras:** landmark é centro de articulação e máscara é contorno de roupa — nenhum dos dois
  entrega composição corporal. Gordura viraria fórmula antropométrica encadeada sobre estimativa,
  e o especialista perderia leitura clínica que hoje o modelo faz bem.

### Opção D — API comercial de medidas corporais

- **Prós:** o problema inteiro resolvido por quem só faz isso, com dado de validação.
- **Contras:** pago por scan, imagem sai do país, lock-in. Troca a melhor posição de LGPD da lista
  pela pior, para resolver a parte do problema que é justamente a menos crítica.

## Decisão

**Escolhemos a A, com a fronteira desenhada pela natureza da grandeza.**

- **Geometria — o aparelho mede.** Distância, largura, ângulo, razão. São coisas que a imagem
  contém e que uma conta extrai. Não há julgamento envolvido, e o resultado é reprodutível.
- **Composição e julgamento clínico — o modelo estima e interpreta.** Percentual de gordura, risco
  postural, feedback por vista, recomendações. Exigem leitura, e é onde o modelo é bom **quando
  tem fatos**.

O fator decisivo é que **as duas coisas falham por motivos opostos**. Um modelo de linguagem
localizando bordas em pixels erra sem saber que errou, e erra diferente a cada chamada. Uma conta
sobre landmarks não interpreta nada, mas também não inventa. Cada um fazendo o que não sabe fazer
era a origem de todos os números frágeis desta feature.

Os fatos medidos entram no prompt **dentro do bloco que já existe** para altura e peso —
`MEDIDAS CONHECIDAS DO ALUNO (não estime nenhuma delas)` — só que muito maior. O modelo é
enriquecido, não substituído.

### O módulo é próprio, e não VisionCamera

Frame processors do VisionCamera exigem `react-native-worklets-core`. O app tem
`react-native-worklets` 0.10.1, que o Reanimated 4.5.1 traz. Os dois no mesmo projeto colidem no
Android com `WorkletsPackage` duplicado. Um Expo Module próprio, dono da própria preview, não
passa por worklets nenhum: ele amostra nativamente e emite para o JS um objeto pequeno a cada dois
segundos. Nenhum frame cruza a ponte.

## Como o processo funciona

```mermaid
flowchart LR
    subgraph MP["MediaPipe — mede no aparelho"]
        direction TB
        A1["régua px por cm"]
        A2["larguras da silhueta"]
        A3["assimetrias em cm e graus"]
        A4["postura sagital em graus"]
        A5["qualidade da captura"]
    end
    subgraph PR["Prompt do BFF"]
        B1["bloco MEDIDAS CONHECIDAS<br/>não estime nenhuma delas"]
    end
    subgraph CL["Claude — interpreta"]
        direction TB
        C1["gordura corporal"]
        C2["risco postural"]
        C3["feedback por vista"]
        C4["recomendações"]
    end
    subgraph DBX["body_scans"]
        direction TB
        D1["circunferências medidas"]
        D2["análise do modelo"]
    end

    A1 --> A2
    A2 --> B1
    A3 --> B1
    A4 --> B1
    A5 --> B1
    B1 --> C1
    B1 --> C2
    B1 --> C3
    B1 --> C4
    A2 -.->|"direto, sem passar pelo modelo"| D1
    C1 --> D2
    C2 --> D2
    C3 --> D2
    C4 --> D2
```

### O aparelho mede em pixels; o BFF aplica a Escala

A divisão `pixels ÷ altura` acontece no **BFF**, não no aparelho — e não por
conveniência: o endpoint de elegibilidade responde **se** o aluno pode escanear
e **de onde** viria a Escala, nunca **quanto**, porque mandar a medida seria
dado de saúde atravessando a fronteira sem finalidade (Art. 6º, III). O
aparelho não conhece a altura e não deve conhecer.

Isso não enfraquece a decisão. O que a torna verdadeira é a medida ser
**determinística e feita sobre a imagem**, não a unidade em que ela sai. O
aparelho mede em pixels, o BFF converte com a Escala que já resolve, e o modelo
continua sem estimar geometria nenhuma.

Só as circunferências têm caminho direto ao banco. O motivo é que duas fontes para a mesma grandeza
não têm critério de desempate: se o modelo devolvesse circunferência tendo o número medido no
prompt, o que iria para o banco seria o amostrado, com o medido servindo de sugestão ignorável.

### A captura, ponta a ponta

```mermaid
sequenceDiagram
    autonumber
    actor Aluno
    participant App as App · tela do scan
    participant Nat as Módulo nativo · MediaPipe
    participant Voz as expo-speech
    participant BFF as BFF · Next.js
    participant IA as Claude Sonnet
    participant DB as Supabase

    Aluno->>App: abre o body scan
    App->>BFF: GET body-scan/eligibility
    BFF-->>App: pode escanear + fonte da escala
    App-->>Aluno: tutorial, só na primeira vez

    loop para cada pose — frente, costas, lateral
        App->>Nat: iniciar preview
        loop a cada 2s, até o portão liberar
            Nat->>Nat: pose + máscara no frame amostrado
            Nat-->>App: fatos de enquadramento e luz
            App->>App: avaliarPortao
            alt fora de posição
                App->>Voz: instrução de maior prioridade
                Voz-->>Aluno: dê um passo para trás
            else tudo verde
                App->>Voz: três, dois, um
                App->>Nat: capturar em alta qualidade
            end
        end
        Nat->>Nat: medir o still — régua, larguras, ângulos
        alt mediu
            Nat-->>App: fact sheet da pose
            App->>App: guarda no store MMKV
        else sem coroa ou sem contato com o chão
            Nat-->>App: falha de medida
            App-->>Aluno: refazer esta pose
        end
    end

    App->>BFF: POST ai/body-scan — 3 imagens + fact sheet
    BFF->>BFF: resolverEscala — altura e peso conhecidos
    Note over BFF,IA: fatos medidos entram como<br/>MEDIDAS CONHECIDAS, temperature 0
    BFF->>IA: prompt + imagens
    IA-->>BFF: gordura, postura, feedback, recomendações
    BFF->>DB: grava circunferências medidas + análise
    BFF-->>App: resultado
    App-->>Aluno: laudo + comparação com o scan anterior
```

As três fotos continuam saindo para o serviço externo, porque a análise postural depende delas. O
que muda é que agora viajam acompanhadas de fatos medidos — e a imagem segue sem ser persistida.

### O portão

```mermaid
flowchart TD
    F["frame amostrado a cada 2s"] --> P["pose + máscara"]
    P --> Q{"33 landmarks<br/>com visibilidade boa?"}
    Q -->|não| I1["corpo cortado<br/>centralize ou afaste-se"]
    Q -->|sim| V{"vista bate com<br/>a pose pedida?"}
    V -->|não| I2["vire para a posição pedida"]
    V -->|sim| E{"coroa e pés dentro<br/>da faixa?"}
    E -->|não| I3["aproxime-se ou afaste-se"]
    E -->|sim| N{"aparelho nivelado?"}
    N -->|não| I4["ajuste a inclinação"]
    N -->|sim| L["mede luz — média e contraluz"]
    L --> OK["libera o disparo"]
    L -.->|"não bloqueia"| W["registra luz ruim no scan<br/>vira aviso após a captura"]
    I1 --> S
    I2 --> S
    I3 --> S
    I4 --> S
    S["fala só a de maior prioridade<br/>e só se mudou desde a última"] --> F
```

A ordem não é arbitrária: vai da checagem que invalida a foto inteira para a que apenas degrada. A
primeira que falhar produz a instrução, e nada mais é dito — uma correção por vez, e silêncio
significa que está bom.

**Geometria trava. Luz não trava.** Um aluno às dez da noite no quarto pode não ter como resolver
o contraluz, e scan marcado vale mais que scan que não aconteceu. O precedente é da 0027:
`framing_level_sensor: false` já significa "este sinal não conta para este scan".

### O consentimento

O texto atual em `elegibilidade.ts` promete: *"As imagens vão para um serviço de inteligência
artificial externo e não são guardadas — só o resultado fica salvo."* Isso descreve **três fotos
que o aluno tira**. A partir daqui o aparelho passa a olhar sozinho, a cada dois segundos,
enquanto a tela está aberta.

Não armazenar não é não tratar: o Art. 5°, X inclui coleta, acesso e processamento. O texto é
reescrito separando as duas coisas — o que roda no aparelho e morre lá, e o que sai para o
serviço externo — e **`POLICY_VERSION` sobe de `1.1` para `1.2`**. O mecanismo já existe:
`hasCollectionConsent` devolve `false` quando a versão não bate, então o reconsentimento acontece
sozinho. É o mesmo motivo da `1.1`, que a própria docstring registra: *"não faltava autorização,
faltava o aluno saber."*

**Minimização — a alternativa recusada, registrada.** Amostrar só dentro da contagem regressiva
entregaria o mesmo portão tratando estritamente menos imagem, com começo e fim claros. Escolhemos
a amostragem contínua para a correção chegar **enquanto o aluno se posiciona**, e não só depois de
ele iniciar a contagem — que é o momento em que ele ainda está longe da tela e mais precisa da
voz. O custo é uma janela de tratamento maior, e ele está sendo pago de olhos abertos, com o
consentimento dizendo isso na cara.

### Quando a medida falha

A máscara vai falhar às vezes — pé cortado no rodapé, camisa branca contra parede branca, cabelo
volumoso. **A foto é recusada, e nunca há queda para o método antigo.** O fallback reintroduziria
dois métodos na mesma série, invisivelmente e para sempre, decidido por acaso de iluminação.
Recusar é barato porque o portão é ao vivo: o aluno está em pé no lugar, a dois passos da pose
certa.

### A mesma escala nas três fotos

Cada foto converte pixel em centímetro pela **sua própria** régua, e dentro de uma foto isso está
certo. O problema aparece quando a análise cruza duas: a largura de cintura da frente e a da
lateral só descrevem o mesmo corpo se as duas saíram da mesma distância. O aluno parando a 0.70 de
ocupação na frente e a 0.88 na lateral produz um par de números que o modelo lê como mudança de
seção transversal — e que é mudança de distância.

A primeira pose liberada do scan grava quanto do quadro o corpo ocupou. As seguintes têm de voltar
a esse valor dentro de **±0.035**, e não apenas caber nas marcas.

```mermaid
flowchart TD
    A["primeira pose libera"] --> B["grava ocupacaoDeReferencia<br/>fração do quadro ocupada"]
    B --> C["pose seguinte"]
    C --> D{"ocupação dentro de<br/>±0.035 da referência?"}
    D -- menor --> E["voz: aproxime"]
    D -- maior --> F["voz: afaste"]
    E --> C
    F --> C
    D -- sim --> G["portão libera<br/>contagem de 5s"]
    G --> H["três fotos na mesma escala"]
```

O `±0.035` é mais apertado que a tolerância de enquadramento da primeira foto (`±0.12`) de
propósito: a primeira só precisa caber, as outras precisam **repetir**. Folga larga aqui devolveria
exatamente o erro que a trava existe para evitar, com o portão dizendo que estava tudo verde.

### Contido nas marcas, e não só centrado

O retângulo na tela promete *"seu corpo cabe aqui dentro"*. O portão, até aqui, verificava outra
coisa: se o **centro** do corpo estava perto do centro das marcas. Com `TOLERANCIA_ALTURA` em
`0.12`, um corpo ocupando `0.92` do quadro passava — e o retângulo tem `0.80` de altura. Os dois
números eram aritmeticamente incompatíveis: existia um corpo aceito pelo portão que não cabia no
desenho, e o aluno via os próprios pés do lado de fora enquanto a borda ficava verde.

A verificação passa a ser **por borda** — a coroa não pode passar do topo e o chão não pode passar
da base, cada uma no seu limite — e a tolerância de distância deixa de ser simétrica: quando o alvo
são as marcas, não há folga para cima, porque corpo maior que o retângulo não cabe nele. Aceitar
isso era desenhar uma promessa falsa na tela.

## O contexto que a análise recebe

Medir melhor resolve metade do problema. A outra metade era o prompt: a rota via **três imagens e
uma altura**, e mais nada. Duas ausências pesavam mais que todo o resto.

**O scan anterior.** O `ADR-0010` afirma que *"o valor está na diferença entre dois scans, não no
número absoluto de um só"* — e o modelo nunca via essa diferença. O produto prometia um filme e o
prompt entregava um retrato. Os valores do scan anterior entram como passado, nunca como alvo:
quem interpreta a variação é o modelo, e dizer para onde ela deveria ir seria induzir o achado.

**A limitação física.** Recomendação postural para quem tem manguito operado deveria ser outra, e
era a mesma. Entram seis campos — lesões, cirurgias, limitações de mobilidade, dor atual — com a
instrução explícita de **não atribuir achado postural à lesão sem que a imagem sustente**.

```mermaid
flowchart LR
    subgraph ap["No aparelho"]
        M["fact sheet<br/>pixels e graus"]
    end
    subgraph db["Supabase · cliente do titular, sob RLS"]
        S["body_scans<br/>último scan"]
        A["student_anamnesis<br/>6 campos nomeados"]
        T["training_periodizations<br/>objetivo do plano ativo"]
    end
    subgraph bf["No BFF"]
        E["resolverEscala<br/>altura e peso"]
        F["descreverFatosMedidos<br/>px ÷ altura → cm"]
        C["carregarContextoDoScan"]
        P["prompt único<br/>temperature 0"]
    end
    M --> F
    E --> F
    S --> C
    A --> C
    T --> C
    F --> P
    C --> P
    P --> IA["Claude Sonnet"]
    IA --> L["o que mudou desde o último scan,<br/>lido contra o que o corpo aguenta"]
```

**A anamnese entra por campo nomeado no `select`, nunca pelo objeto inteiro.** O recorte acontece
na consulta e não em memória: pedir `responses` para filtrar depois traria medicação, renda e
histórico familiar até a borda do processo sem finalidade nenhuma (Art. 6°, III). É a mesma
disciplina que a leitura de altura desta rota já praticava — e que o loader novo passou a seguir
depois de nascer errado.

O contexto é **enriquecimento, não pré-requisito**: se a consulta falha, o laudo sai sem a
comparação em vez de não sair.

### Um agente por tópico — recusado

A alternativa levantada foi especializar: um agente de treino, um de postura, um de composição,
com um orquestrador juntando as respostas. Não entra, e a razão é a mesma que decidiu quase tudo
neste documento — **profundidade, não superfície**. Três agentes olhando a mesma foto produzem três
leituras que precisam ser reconciliadas por um quarto, e nenhum deles sabe o que os outros viram.
A imprecisão do laudo não vinha de faltar especialista: vinha de faltar **medida** e faltar
**contexto**, e as duas foram atacadas direto. Um segundo modelo entra quando houver um seam real
— quando a análise de exercício existir e tiver pergunta própria —, não antes.

**Dívida registrada:** esta rota fala com o SDK da Anthropic direto, e o `ADR-0011` diz que *"todos
os orquestradores usam apenas essa interface — nunca o SDK do Anthropic/OpenAI diretamente"*.
Levá-la para o `AIProvider` é trabalho conhecido e fora do escopo desta issue.

### O laudo não elogia

`temperature: 0` e uma seção de estilo que proíbe elogio, encorajamento e consolo. Corpo sem
alteração relevante recebe *"nada a apontar"*, não um parágrafo simpático; achado não é suavizado
para poupar o aluno nem inventado para o texto parecer útil; e nada de julgamento estético — o
texto descreve postura e proporção, nunca aparência. A régua: escreve-se para quem vai **agir**
sobre o corpo, não para quem quer se sentir bem sobre ele.

## O que o `/lgpd-check` exigiu

O parecer rodou em 2026-08-30 e mudou o escopo em quatro pontos. Os dois primeiros viram código,
os dois últimos viram regra de revisão.

**`body_scans_own` deixa de ser `FOR ALL`.** Hoje o aluno pode dar UPDATE na própria análise. Era
tolerável enquanto os números eram estimativa do modelo; com eles virando **medida**, adulterar
passa a ter consequência, e a tabela deixa. É a mesma falha que a `0036` corrigiu em
`workout_sessions` — lá a doc dizia que o histórico era imutável e o banco discordava. Vira
INSERT/SELECT/DELETE: o DELETE fica, porque o direito de exclusão por item depende dele.

**Os campos novos aparecem para o aluno**, não só para o especialista. Régua, larguras e ângulos
são dados sobre o corpo dele (Art. 18, II). Coluna que só o profissional lê é tratamento sem livre
acesso.

**O fact sheet nunca entra em log.** *"Desnível de ombro de 1,8 cm"* é inferência sobre saúde de
titular identificado — a mesma regra que já vale para o sinal de inatividade do briefing.

**Achado colateral, já corrigido:** `body_scans` — que a `0017` chama de *"o dado mais sensível do
schema"* — não tinha **nenhum** teste comportamental de RLS. Só a checagem estrutural de que a
política existe. A trava foi escrita e provada negativamente: afrouxando a política num escopo
descartável, o aluno B passou a ler a análise do aluno A, e o teste acusa.

### Travas

| Trava | Estado |
|---|---|
| `verify-rls.sql` — aluno não lê análise de outro aluno; especialista sem vínculo não lê nenhuma | ✅ escrita, passando, prova negativa feita |
| `verify-rls.sql` — ninguém dá UPDATE em medida gravada, nem o titular (Art. 6°, V) | ✅ escrita — conta linhas afetadas, porque sem RLS o UPDATE passaria sem erro |
| `verify-rls.sql` — o titular continua apagando a própria análise (Art. 18, VI) | ✅ escrita — estreitar a política não podia levar o DELETE junto |
| `aiBodyScan` — a imagem não é codificada sem consentimento (Art. 11, I) | ✅ o consentimento é checado antes de a foto ser lida do disco |
| `fatosMedidos` — a mesma conta escreve o prompt e a coluna | ✅ 13 testes, incluindo o limiar de rotação compartilhado |
| `route` — a circunferência gravada é a do payload medido, nunca a que o modelo devolveu (Art. 6°, V) | ⬜ depende da Fase 3, que é condicionada à validação contra fita |
| `route` — nenhum valor do fact sheet aparece em log (Art. 6°, VIII) | ✅ nada do payload medido é logado |

## O que o aparelho respondeu

Medido no Redmi Note 14 Pro, Android 16, arm64, em 2026-08-31, com pessoa real.

**A pergunta que segurava este ADR — quanto custa um passe — está respondida a
favor.** As emissões chegam a cada 2s cravados, a extração fica entre 210 e 250
ms, e a inferência cabe por cima com folga. A cadência casada com a duração de
uma frase falada se sustenta.

**Os limiares saíram de medida, não de palpite.** Os primeiros chutes barravam
captura boa:

| Limiar | Chute inicial | Medido | Por quê |
|---|---|---|---|
| Visibilidade (frontal) | 0.6 sobre os 33 landmarks | 0.35 sobre os extremos | mínimo entre 33 zera com uma orelha ocluída; e visibilidade baixa é mau enquadramento, não ausência |
| Faixa de enquadramento | ±0.06 | ±0.12 | um passo a três metros muda a ocupação em muito mais que 0.06 — o aluno pulava de "aproxime" para "afaste" sem acertar o meio |
| Deslocamento vertical | reaproveitava a de tamanho | ±0.06 própria | posição se enxerga mais que tamanho |
| Contraste corpo/fundo | 0.5 | faixa saudável medida: 0.5–1.1 | 0.5 ficava no piso do normal e acusava contraluz falso |

**Dez defeitos que só o aparelho revelaria**, nenhum deles alcançável por
emulador ou teste automatizado:

1. `PreviewView` com `SurfaceView` não compõe na hierarquia do React Native — tela preta com a câmera aberta.
2. Filho nativo não recebe layout do RN: `onLayout` e `requestLayout` precisam ser manuais.
3. Bitmap RGBA do CameraX vem com padding de linha, e o MediaPipe lê assumindo empacotamento justo — **crash nativo** em `nativeCreateRgbaImage`.
4. `getPixel` pixel a pixel dominava o custo do passe: 230 ms viraram 16 ms com leitura em bloco.
5. Um pixel de ruído definia coroa e chão da silhueta; passou a exigir faixa mínima por linha.
6. Visibilidade baixa por mau enquadramento virava "não estou te vendo" para quem ocupava dois terços da tela.
7. A anti-repetição criava silêncio ambíguo: calar significava tanto "está certo" quanto "você travou e eu desisti".
8. Falar re-renderiza — `speak` altera estado —, e a contagem regressiva reiniciava a cada número, engasgando no 3.
9. Frente e costas pela visibilidade do rosto era palpite; pela **ordem dos ombros** é geometria.
10. `ImageCapture.Builder.setMirrorMode` lança `UnsupportedOperationException`: espelhamento de foto se controla em `Metadata.isReversedHorizontal`.

E dois erros de aritmética que os **testes** pegaram sozinhos, sem aparelho:
`afaste-muito` e depois `afaste` ficaram inalcançáveis por limiar impossível —
o corpo não ocupa mais que o quadro, então a razão nunca desce de `ALTURA_ALVO`.

**A lição que atravessa quase todos:** eu estava descrevendo o mundo do ponto de
vista da imagem, e a instrução precisa sair do ponto de vista de quem a obedece.
"Dê um passo à frente" só significa "aproxime-se" para quem olha para a câmera;
de costas, afasta. A mesma correção geométrica tem três nomes conforme a pose, e
uma frase só acerta em uma delas.

## Como o exercício entra sem derrubar o Body scan

O rastreio de exercício usa a mesma engine e vai chegar. A proteção do que já
funciona **não é abstração — é não encostar**: ele ganha view própria, e o
`body-scan-pose` fica intocado. Módulo que ninguém mexe não regride.

O caminho perigoso é o oposto, e é o tentador: tornar o módulo atual genérico,
com parâmetro de cadência, de máscara ligada ou desligada, de quais fatos emitir.
Cada parâmetro novo é uma chance de mudar o comportamento do primeiro consumidor
sem ninguém perceber.

E a configuração diverge de verdade, o que reforça a separação:

| | Body scan | Exercício |
|---|---|---|
| Cadência | 2s, casada com a duração de uma frase falada | ~30fps |
| Máscara de segmentação | ligada — é metade do custo do passe | desnecessária |
| O que emite | coroa, chão, larguras, luz | ângulos articulares |
| Duração da sessão | segundos | minutos, com térmico e bateria |

Só `LIVE_STREAM` e o modelo `lite` coincidem.

O que vale compartilhar quando houver dois é o **encanamento**: baixar o `.task`,
criar o landmarker, vincular o CameraX. Aí a duplicação dói, e aí o segundo
consumidor paga o seam — que é a regra do `CLAUDE.md` aplicada no momento certo,
nem antes nem depois.

**O que torna isso obrigatório e não preferência:** o lado nativo não tem teste
automatizado. Os testes cobrem o portão em JS; uma regressão dentro do Kotlin
não seria pega por ninguém até alguém escanear e reparar num número estranho.
Com o nativo sem rede de proteção, "não mexer" é a única defesa que existe.

## Consequências

**Fica mais fácil**

- Defender o número: a régua vira medida com erro caracterizável, no lugar de uma localização
  visual que muda a cada chamada.
- Testar: `analisarCaptura` e `avaliarPortao` rodam sobre imagens de fixture, sem câmera, sem
  device, sem rede. Hoje não há nada testável nesse caminho.
- Escrever o laudo: "ombro direito 1,8 cm acima do esquerdo, linha a 2,3° da horizontal" no lugar
  de "ombro direito elevado".
- Instruir o aluno: o app passa a dizer *o que* corrigir, por voz, enquanto ele está longe da tela.

**Fica mais difícil**

- Toda subida de Expo SDK passa a poder exigir rebuild do módulo nativo. É dívida permanente.
- O iOS fica sem body scan até o primeiro build existir.
- **O app engorda ~15 MB no arm64.** Medido no spike com `tasks-vision:0.10.35`:
  `libmediapipe_tasks_jni.so` tem 10,5 MB no arm64-v8a, mais ~5 MB do
  `pose_landmarker_lite.task`. Baixando o modelo sob demanda, a instalação sobe ~10 MB e o
  resto vem no primeiro scan.
- **A versão do MediaPipe importa mais do que parece.** A 0.10.14 **não publica `x86_64`**, o que
  a torna impossível de rodar em emulador moderno — só a 0.10.35 cobre a ABI. Fixar a versão e
  conferir as ABIs do `tasks-core` é parte do trabalho, não detalhe.
- **Todo aluno consente de novo.** A `POLICY_VERSION` sobe para `1.2`, e quem já autorizou é
  perguntado outra vez antes do próximo scan. É o preço de o texto passar a ser verdade.
- Roupa larga passa a produzir número **preciso e errado**, que é pior que impreciso e errado,
  porque parece confiável. A mitigação é o tutorial, não o código — e vale registrar que isso
  atinge o modelo do mesmo jeito: ele também só vê o tecido.

**O que isto bloqueia**

- Circunferência medida substituir a do modelo depende de validação contra as fitas já gravadas em
  `physical_assessments`: 5 pessoas, tolerância ±3 cm em cintura e quadril. Reprovando, essa parte
  não entra e o resto segue valendo.
- Rastreio de exercício usa a mesma engine e **não** entra aqui. A interface do módulo é desenhada
  só para o body scan; o segundo consumidor paga o seam.

**Consequência administrativa**

Como não há nada em produção, o método antigo **sai do código junto** — sem coluna de método, sem
`compareScans` checando procedência, sem rótulo na tela. Um marcador para distinguir de um método
recém-apagado seria seam hipotético. Os scans de teste vão junto, no molde da 0037: avaliação
incompleta se apaga, não se completa.

## Como reverter (se necessário)

Se o módulo nativo se mostrar insustentável — build quebrando a cada SDK, ou desempenho abaixo do
que o laço de voz exige —, o caminho de volta é a **Opção B**: o módulo sai, `expo-camera` volta a
desenhar a preview, e o prompt volta a pedir a proporção. Custa reescrever `BodyScanCamera` e
perder a régua.

O que **não** se reverte é `temperature: 0` nem a saída de `muscle_mass_kg` como massa em quilos
estimada por foto. Essas duas não são trade-off; são defeito.

---

## `body_scans.muscle_mass_kg` vira `lean_mass_kg`

O nome mente hoje. O valor sai de `peso × (1 − gordura)`, e essa conta devolve **massa magra** —
que inclui osso, órgão e água. Chamar isso de massa muscular afirma uma discriminação de tecido
que nenhum dos dois lados do cálculo faz.

E a interface já sabia disso antes do banco: `ScanComparison` no mobile e `BodyScanHistory` no web
já rotulam o campo como **"Massa magra"**. Quem estava desalinhado era o schema.

Junto com o nome muda a origem: o valor deixa de ser um número livre que o modelo devolve e passa
a ser **derivado** de peso conhecido e da gordura estimada. Determinístico, com a conta explícita.

**A coluna homônima de `physical_assessments` NÃO é renomeada.** Lá a massa vem do protocolo
Jackson-Pollock de 7 dobras, medido com adipômetro pelo especialista — é medida por protocolo
validado, não inferência sobre foto. Renomear as duas por simetria apagaria justamente a
diferença que importa.

Pela [ADR-0019](0019-coluna-substituida-sai-na-mesma-migration.md), a coluna antiga sai na mesma
migration que cria a nova. Alcance do rename: `body_scans.muscle_mass_kg`, os tipos em
`bodyScan.types.ts`, `ComparableField`, `database.types.ts`, o schema Drizzle, `muscleMass` no
contrato do BFF, e as chaves de rótulo nas duas telas — cujo texto visível já está certo.
