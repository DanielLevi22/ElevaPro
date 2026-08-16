# PRD: body-scan-integrity

**Data de criação:** 2026-08-12
**Status:** done
**Branch:** feature/body-scan-integrity
**Autor:** Daniel Levi

---

## As 3 perguntas obrigatórias

> Nenhuma linha de código é escrita sem estas 3 perguntas respondidas.

### O quê?
Fazer a análise corporal por imagem entregar só o que uma foto permite medir,
guardar o resultado, e não mandar foto do corpo para os Estados Unidos sem
consentimento.

### Por quê?
Hoje a feature promete o que não pode cumprir e não guarda o que produz.

O prompt de `/api/ai/body-scan` pede ao modelo:

```
"metrics": { "height": number (cm), "weight": number (kg), ... }
...
Estime com base nas imagens disponíveis.
```

**Peso não é inferível de uma foto**, e altura tampouco sem referência de
escala. O modelo não recusa — devolve número plausível, porque é isso que a
instrução manda. O `bmi` é calculado sobre os dois valores inventados. E a tela
apresenta o conjunto como *"um método extremamente preciso para coleta de
medidas"*.

Isso é dado de saúde inventado, apresentado como medição, para um aluno que vai
tomar decisão em cima dele.

Some-se: **o resultado não é salvo em lugar nenhum** — `body_scans` existe, tem
RLS desde a `0017`, e nenhuma linha do código escreve nela. E a foto vai para a
Anthropic **sem verificação de consentimento**, que é pendência já registrada na
seção 10 do `LGPD_COMPLIANCE.md`.

### Como saberemos que está pronto?
- [x] Nenhum campo devolvido pela análise é fisicamente inestimável a partir de
      imagem — peso e altura passam a ser entrada do usuário, não saída do modelo
- [x] As circunferências saem em proporção calibrada pela altura informada, e a
      tela diz que são estimativas
- [x] O resultado é gravado em `body_scans` e sobrevive a fechar o app
- [x] A foto não sai do dispositivo sem `student_consents` vigente
- [x] A tela de introdução diz que a imagem é enviada a um serviço de IA externo
- [x] Resposta truncada do modelo deixa de virar erro genérico
- [x] Falha na análise mostra mensagem humana e permite tentar de novo

---

## Contexto

Levantado em 2026-08-12, a pedido, sobre o fluxo de análise corporal do mobile:
`BodyScanIntroduction` → `BodyScanCamera` → `BodyScanProcessing` →
`AIBodyScanService` → `/api/ai/body-scan`.

### F1 — A IA estima o que não dá para estimar 🔴

O `SYSTEM_PROMPT` pede `height`, `weight`, `bodyFat`, `muscleMass`, `bmi`, mais
oito circunferências em centímetros, e encerra com *"Estime com base nas imagens
disponíveis"*.

Foto sem escala não permite medida absoluta. O que uma imagem sustenta é
**proporção** — a razão entre cintura e quadril, a simetria entre os lados, o
alinhamento postural. Um centímetro só existe se houver referência conhecida no
enquadramento.

O texto da tela agrava: *"método extremamente preciso"*.

### F2 — Nada é persistido 🔴

`body_scans` tem RLS, política de dono e de especialista vinculado, e índice.
Nenhuma linha do código escreve nela — procurado em `app/src` e `web/src`.

O resultado vive no Zustand, e o `partialize` guarda só a anamnese:

```ts
partialize: (state) => ({
  anamnesisResponses, currentSectionIndex, isAnamnesisSubmitted,
})
```

`lastResult` e `history` somem ao fechar o app. Não há evolução, não há
comparação entre escaneamentos, e o especialista nunca vê o resultado.

### F3 — Foto de corpo para os EUA sem consentimento 🔴

A rota faz só `getAuthenticatedUserId`. A seção 10 do `LGPD_COMPLIANCE.md` já
registra as duas pendências, com estas palavras:

> Rota `/api/ai/body-scan` deve verificar `student_consents` (tipo
> `health_data_collection`) antes de processar.
>
> O consentimento da tela de Body Scan deve mencionar explicitamente envio de
> fotos a serviço de IA externo.

Nenhuma das duas foi feita. Foto corporal é o dado mais sensível do sistema.

### F4 — `max_tokens: 1024` não cabe a resposta 🟠

O JSON pedido tem métricas, oito segmentos, três notas, **quatro arrays de
feedback** com título, risco e texto, e um bloco de recomendações. Isso fica na
fronteira do teto e passa dela sempre que o modelo escreve um pouco mais.

Quando estoura, o JSON vem cortado e a rota devolve `502 Failed to parse AI
response` — sem distinguir "o modelo falhou" de "a resposta não coube".

### F5 — Erro sem saída 🟡

`throw new Error('body-scan BFF error: 500')` leva a store para
`AssessmentStatus.ERROR`, e a tela mostra o estado sem explicação nem botão de
tentar de novo. O aluno tirou quatro fotos e fica sem nada.

### F6 — Dois caminhos de foto que divergem 🟢

`PostureAnalysis` envia para o bucket `assessments` (criado na `0021`); o body
scan manda base64 direto ao BFF e não guarda imagem. São fluxos irmãos com
destinos diferentes.

---

## A decisão que organiza o resto

Duas saídas honestas:

**A. Medida calibrada por escala informada.** O usuário informa a altura e o
peso — altura vira a régua da imagem, peso vem da balança. A IA entrega
proporção, simetria, postura e circunferências **estimadas** a partir dessa
régua.

**B. Só análise qualitativa.** Postura, simetria e distribuição, sem nenhum
número em centímetro ou quilo.

**Este PRD adota a A.** Preserva o valor do produto — o especialista quer as
medidas — sem afirmar precisão que não existe, e usa o dado que o sistema já
tem: `physical_assessments` guarda `weight_kg` e `height_cm`.

Se a decisão for a B, muda o escopo inteiro: as circunferências saem, o cartão
vira só postura, e `body_scans` guarda menos colunas. Está registrado para não
se perder.

---

## Parecer LGPD

> Aplicado o `/lgpd-check`. Esta é a rota que trata **foto do corpo** — o dado
> mais sensível do sistema, e o único que é biométrico por natureza.

**Bloco A — Necessidade e Finalidade** ⚠️
A finalidade é legítima: acompanhar composição corporal. O que falta é
minimização no envio — hoje vão quatro imagens em base64, sem recorte nem
redução além do `resize(800)` do cliente. Não há como reduzir mais sem perder a
análise, então a minimização real está em **não guardar a imagem** e guardar só
o resultado derivado. É o que este PRD faz.

**Bloco B — Base Legal** ❌ **BLOQUEADOR**
Foto corporal é dado sensível (Art. 5°, II). Base: Consentimento Explícito
(Art. 11, I), como o mapa já registra. **A rota não verifica nada.** Precisa
verificar `student_consents` antes de a imagem ser lida do dispositivo — não
depois de enviada.

**Bloco C — Segurança e Acesso** ⚠️
A rota não usa `service_role`, então a guarda `check-api-auth.js` não a cobre —
e ela também não precisa de vínculo, porque o aluno analisa a si mesmo. Mas ao
passar a gravar em `body_scans`, o `student_id` tem que sair do token, nunca do
corpo da requisição.

**Bloco D — Direitos dos Titulares** ⚠️
Hoje não há o que exportar nem excluir, porque nada é guardado. Ao persistir,
`body_scans` já tem `ON DELETE CASCADE` a partir de `profiles`, então a exclusão
de conta elimina junto. Falta a seção 7 registrar a retenção.

**Bloco E — Prevenção e Transparência** ❌
1. A tela promete *"extremamente preciso"*. Sobre estimativa de IA, isso é
   informação enganosa — e o Art. 6°, VI exige transparência.
2. O texto não diz que a imagem vai para um serviço externo.
3. A Anthropic segue fora da Política de Privacidade como sub-processadora.

**Atualizações necessárias em `docs/LGPD_COMPLIANCE.md`**
- [x] Seção 7: retenção de `body_scans`
- [x] Seção 10: marcar as duas pendências de body-scan como resolvidas
- [x] Seção 10: registrar que a imagem **não é persistida**, só o resultado

---

## Escopo

### Incluído

**Fase 1 — consentimento e transparência**
- Verificar `student_consents` antes de ler a imagem do dispositivo
- Sem consentimento, a tela explica e oferece o fluxo de consentimento
- Texto da introdução reescrito: o que a análise faz, o que ela estima, e que a
  imagem é enviada a um serviço de IA externo

**Fase 2 — honestidade da medida**
- `height` e `weight` saem da resposta do modelo e entram como parâmetro, vindos
  da última `physical_assessments` ou digitados
- O prompt passa a receber a altura como escala e a pedir circunferência
  **estimada**, com a incerteza declarada
- A tela rotula as circunferências como estimativa, não medição

**Fase 3 — o resultado passa a existir**
- Gravar em `body_scans`, com `student_id` vindo do token
- Histórico e comparação entre escaneamentos na tela
- O especialista vê pelo vínculo, com a RLS que já existe

**Fase 4 — falhar direito**
- `max_tokens` dimensionado para a estrutura pedida
- Resposta truncada distinguida de resposta inválida
- Mensagem humana e opção de tentar de novo sem refazer as fotos

**Fase 5 — captura mais curta e sem ruído**
- A silhueta sobreposta sai da câmera: ela promete um alinhamento que o sistema
  não verifica, e atrapalha o enquadramento em vez de ajudar
- Três fotos em vez de quatro — frente, costas e **uma** lateral. As duas
  laterais davam a mesma informação para a análise e dobravam o incômodo de se
  fotografar, que é onde o aluno desiste

**Fase 6 — a análise chega a quem decide**
- Aba no perfil do aluno no web, para o especialista vinculado, com histórico e
  comparação entre escaneamentos. A RLS de `body_scans` já cobre esse recorte
  desde a `0017`
- Ferramenta `query_body_scan` nos dois coaches de IA: o contexto passa a
  mencionar que existem N análises e a data da última, e o modelo busca o
  detalhe quando for usar. Índice no contexto, detalhe por ferramenta — somar o
  scan inteiro a todo turno encareceria a conversa sem necessidade

**Fase 7 — captura guiada e calibrada** (arquitetura em `ADR-010`)
- Marcas fixas na tela (10% e 90% da altura) e nível pelo acelerômetro. O aluno
  encaixa cabeça e pés; o disparo só libera com o aparelho nivelado
- `physical_assessments.height_cm` vira a régua do frame: altura real sobre
  altura em pixels dá `px_por_cm`, e qualquer largura na imagem converte para
  centímetro por regra de três
- Circunferência sai da elipse entre largura de frente e profundidade de lado —
  aproximação com erro conhecido (5 a 10%), não número escolhido pelo modelo
- Os parâmetros do enquadramento ficam gravados no scan, para o próximo
  escaneamento reproduzir a mesma distância
- Detecção de pose no dispositivo fica **fora** desta fase: exige dev build e,
  no iOS, que o app seja buildado pela primeira vez. Entra quando houver dois
  escaneamentos reais mostrando que a comparação é ruidosa

### Fora do escopo (explicitamente)

- **Guardar a foto.** O resultado derivado basta para o acompanhamento, e não
  guardar é a maior minimização possível para um dado biométrico. Se um dia for
  necessário, exige bucket com política própria — ver dívida 24.
- **Substituir a avaliação física manual.** Fita métrica continua sendo a
  medida; a análise por imagem é acompanhamento entre avaliações.
- **Análise postural clínica.** O que o modelo devolve é indicativo, e o texto
  precisa dizer isso — diagnóstico é do profissional.
- **Unificar com o `PostureAnalysis`.** São dois fluxos com destinos diferentes;
  juntá-los é outro trabalho.

---

## Fluxo de dados

```
Aluno tira 4 fotos
  → student_consents            ← ANTES de ler a imagem   ◀ NOVO
  → altura e peso conhecidos    ← physical_assessments ou entrada
  → POST /api/ai/body-scan      ← imagens + escala
      → Anthropic
      ← proporção, simetria, postura, circunferência estimada
  → body_scans                  ← só o resultado, nunca a imagem   ◀ NOVO
```

## Tabelas do banco envolvidas

| Tabela | Operação | Observação |
|---|---|---|
| `student_consents` | SELECT | Porta de entrada |
| `physical_assessments` | SELECT | Altura e peso conhecidos, para calibrar |
| `body_scans` | INSERT, SELECT | Passa a ser usada; RLS já existe desde a `0017` |

Nenhuma tabela nova. A avaliar na implementação se `body_scans` precisa de
coluna para as notas de postura.

## Impacto em outros módulos

- **Mobile `assessment`** — introdução, processamento, store e serviço
- **Web** — a rota do BFF; o especialista passa a ver o histórico
- **Nutrition e Workout** — nenhum

---

## Decisões técnicas

**A régua é a altura do próprio aluno.** A referência de escala não precisa vir
da câmera nem de um objeto na mão — vem da pessoa. Foi por não enxergar isso que
o levantamento inicial concluiu que "sem referência não dá medida"; dá, e o dado
já está em `physical_assessments`.

**O vídeo é visor, não carga.** A orientação de captura roda no dispositivo e o
que atravessa a fronteira continuam sendo três fotos. Vídeo multiplicaria tokens
e latência sem melhorar a análise — o modelo não precisa de 300 frames de um
corpo parado — e ampliaria a exposição de dado sensível contra o Bloco A.

**A comparação não custa chamada de IA.** O delta entre dois escaneamentos é
subtração sobre linhas de `body_scans`. O histórico no web e o `query_body_scan`
no chat leem número gravado; nenhuma foto é reenviada.

**A análise vale pelo delta, não pelo valor absoluto.** Uma foto isolada dá um
número discutível. Duas fotos na mesma pose, separadas por semanas, dão uma
comparação confiável — o erro sistemático da estimativa se repete nas duas e se
cancela na diferença. É o argumento mais forte para persistir em `body_scans`, e
é o que a feature deve mostrar em primeiro lugar: o que mudou, não quanto é.

**Índice no contexto, detalhe por ferramenta.** O contexto do coach diz que
existem N análises e quando foi a última; o corpo do resultado vem por
`query_body_scan` só quando o modelo for usar. O contexto já carrega anamnese e
avaliação física em todo turno — somar o scan inteiro encareceria a conversa
para um dado que a maioria dos turnos não usa.

**A silhueta saiu porque prometia verificação.** Um contorno na câmera sugere
que o sistema confere o alinhamento. Ele não confere: a foto é aceita de
qualquer jeito. Guia que não valida é decoração que atrapalha o enquadramento.

**Peso e altura entram, não saem.** É o centro do PRD. Enquanto o prompt pedir
peso, o modelo devolve um número inventado — e ele não tem como saber que está
inventando.

**A imagem não é guardada.** Para dado biométrico, a minimização que vale é não
reter. O resultado derivado sustenta o acompanhamento.

**Consentimento antes de ler a imagem, não antes de enviar.** A diferença
importa: ler o arquivo já é tratamento.

**"Estimativa", não "medida", na tela.** A palavra muda o que o usuário faz com
o número. Chamar de precisão o que é inferência é o que torna o problema atual
uma questão de transparência, e não só de exatidão.

---

## Riscos

| Risco | Mitigação |
|---|---|
| Aluno sem avaliação física não tem altura para calibrar | A tela pede a altura antes de fotografar; sem ela, entrega só o qualitativo |
| A estimativa continuar sendo lida como medida exata | Rótulo na tela e faixa de incerteza no resultado, não um número seco |
| Perder o histórico já visto pelos usuários | Não há histórico: nada foi persistido até hoje |
| Consentimento barrar quem já usava | Quem já usava não tinha o dado guardado; a primeira execução pede o consentimento uma vez |

---

## Checklist de done

- [x] Nenhum campo inestimável na resposta do modelo
- [x] Consentimento verificado antes de a imagem ser lida
- [x] Texto da tela revisado — sem "extremamente preciso", com o envio a
      terceiro declarado
- [x] Resultado gravado em `body_scans` e visível no histórico
- [x] Erro com mensagem humana e nova tentativa sem refazer fotos
- [x] `docs/LGPD_COMPLIANCE.md` seções 7 e 10 atualizadas
- [x] Código funciona e passou em lint + typecheck + testes
- [ ] PR mergeado em `development`
- [x] `docs/features/body-scan-integrity.md` criado
- [x] `docs/STATUS.md` atualizado
