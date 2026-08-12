# PRD: ai-coach-workout-stage

**Data de criação:** 2026-08-12
**Status:** approved
**Branch:** feature/ai-coach-workout-stage
**Autor:** Daniel Levi

---

## As 3 perguntas obrigatórias

> Nenhuma linha de código é escrita sem estas 3 perguntas respondidas.

### O quê?
Fazer o coach de IA do especialista enxergar o aluno de verdade, e completar o
estágio que falta: criar treino e prescrever exercício dentro da conversa.

### Por quê?
Hoje o coach prescreve às cegas. Verificado ao vivo em 2026-08-12, com uma aluna
cuja anamnese registrava **"Hérnia de disco L5-S1 — proibido agachamento livre"**
e **"Hipertensão controlada com losartana"**, mais avaliação física de 82,5 kg:

> **Pergunta:** Resuma o que você sabe sobre a Joana: lesões, condições de
> saúde, peso e objetivo.
>
> **Coach:** *Infelizmente, o perfil da Joana está bem vazio por aqui. 😕
> Lesões: Nenhuma registrada. Condições de saúde: Nenhuma registrada.
> Peso/Avaliação física: Nenhuma avaliação registrada.*

O prompt manda o modelo *"USE OS DADOS DA ANAMNESE… lesões, restrições"*. O
modelo obedece — e o que chega é vazio. Um coach que não sabe da hérnia sugere
agachamento livre com convicção.

Isso não é lacuna de produto, é risco de prescrição. E é anterior à ferramenta
de treino que falta: entregar a criação de treino sobre um contexto cego seria
industrializar o erro.

### Como saberemos que está pronto?
- [ ] Com anamnese preenchida, o coach cita a lesão e a restrição quando
      perguntado — verificado com dado semeado, não por leitura de código
- [ ] Com avaliação física registrada, o coach informa peso e altura corretos
- [ ] Falha de consulta no contexto aparece como erro, nunca como "não
      registrado"
- [ ] `query_exercises` devolve resultado para os nove grupos que existem no
      banco, incluindo ombro, bíceps, tríceps, glúteos e abdômen
- [ ] O especialista cria treino com exercícios pela conversa, revisa e salva
- [ ] Nenhum dado de saúde vai para a Anthropic sem consentimento vigente
      registrado em `student_consents`
- [ ] Um especialista sem vínculo ativo não abre conversa sobre o aluno
- [ ] Mensagem de erro do chat não expõe texto técnico ao usuário

---

## Contexto

Levantado em 2026-08-12 a partir de dois relatos do uso real: *"faltam as
ferramentas de criação de treinos e exercícios"* e *"ele me disse que o banco
não tinha exercícios, retornando termos técnicos"*.

Investigando os dois, apareceram quatro defeitos, e o mais grave não era nenhum
dos relatados.

### D1 — O contexto do aluno chega vazio 🔴

Duas causas independentes, as duas silenciosas.

**A anamnese é lida no lugar errado.** `formatContextForPrompt` lê campos do
topo da linha:

```ts
if (a.objective) lines.push(`Objetivo: ${a.objective}`);
if (a.injuries) lines.push(`Lesões/Restrições: ${a.injuries}`);
```

`student_anamnesis` não tem essas colunas. Tem `responses jsonb`, e é lá dentro
que os campos moram. Todo `if` dá falso e a seção sai como "Não preenchida".

**A avaliação física consulta colunas que não existem.**

```ts
.select("weight, height, body_fat_percentage, created_at")
```

O banco tem `weight_kg`, `height_cm`, `body_fat_pct`. O PostgREST responde:

```
42703: column physical_assessments.weight does not exist
```

E o loader **descarta o erro** — `assessmentRes.data` fica nulo, a seção vira
"Nenhuma avaliação registrada". Falha e ausência ficam indistinguíveis, exatamente
como no achado A1 do [api-security-hardening](api-security-hardening.md).

### D2 — A busca de exercícios ensina o modelo a errar 🟠

O banco tem 57 exercícios. A descrição de `query_exercises` manda usar
`"Peito, Costas, Pernas, Ombros, Braços"`, e o banco guarda em minúsculo,
singular, sem acento. Testado termo a termo:

| Termo que a ferramenta sugere | Resultado |
|---|---|
| Peito · Costas · Pernas | 6 · 7 · 12 |
| **Ombros** | **0** — o banco tem `ombro` |
| **Braços** | **0** — o banco tem `biceps` e `triceps` |
| Glúteos · Abdômen | 0 · 0 — `gluteos`, `abdomen` |

Daí a frase que o especialista viu: *"ainda não há exercícios de ombros
cadastrados"*. Na mesma instalação, para peito, o coach lista os 6 corretos.

Some-se que a consulta também descarta o erro e tem `.limit(15)` sem ordenação:
com 57 exercícios, o modelo vê 15 arbitrários e conclui que é tudo.

### D3 — O estágio de treino existe pela metade 🟠

As ferramentas do chat são três: `propose_periodization`, `save_periodization`,
`query_exercises`. Nenhuma cria treino ou exercício.

E as peças da etapa que falta existem, desligadas:

| Peça | Estado |
|---|---|
| `BulkWorkoutProposalCard` | existe; **nenhum arquivo importa** |
| `/api/ai/chat/[id]/save-workouts` | existe e funciona |
| `sessionState.pendingWorkoutProposal` | declarado no tipo; **nada escreve** |
| `/api/ai/workout/batch` e `/negotiate` | existem; só o **mobile** chama |

A rota de salvar lê uma proposta que ninguém produz. O próprio prompt confessa:
tem só `ESTÁGIO 1`, mas manda *"SIGA A ORDEM DOS ESTÁGIOS"*, no plural, e fecha
com *"não pergunte sobre exercícios **neste** estágio"*.

### D4 — Erro técnico na bolha do chat 🟡

`AiCoachChat.tsx` renderiza `Erro: ${event.message}`, e a mensagem vem crua da
exceção. O prompt proíbe o modelo de falar em termos técnicos, mas este caminho
não passa pelo modelo.

---

## Parecer LGPD

> Aplicado o `/lgpd-check` contra `docs/LGPD_COMPLIANCE.md`. Esta seção é o
> centro do PRD, não um anexo: a entrega **cria** um fluxo de dado sensível para
> terceiro que hoje não existe.

### O ponto de partida, que muda tudo

Como o D1 deixa o contexto vazio, **hoje quase nenhum dado de saúde chega à
Anthropic** — vai o nome do aluno e a lista de periodizações. Consertar o D1 é
obrigatório por segurança de prescrição, e no mesmo movimento passa a enviar
lesão, condição de saúde, peso, altura e percentual de gordura para um
sub-processador nos Estados Unidos.

Ou seja: **o controle precisa existir antes do conserto, não depois.** É a mesma
ordem do [rls-security-hardening](rls-security-hardening.md) — lá o briefing foi
segurado até a RLS existir, porque agregar dado sensível numa tela só transforma
buraco latente em exposição real.

**Correção de registro:** a dívida 32 do `STATUS.md` afirma que
`loadStudentContext` "manda a anamnese inteira para o prompt". Está errada. O
`select("*")` lê tudo do banco, mas o formatador escolhe seis campos — e hoje
não envia nenhum, porque os lê do lugar errado. A dívida vira: reduzir o
`select` ao que é usado.

### Bloco A — Necessidade e Finalidade (Art. 6°, I e III) ⚠️

| Campo | Vai para a Anthropic? | Justificativa |
|---|---|---|
| `injuries`, `health_conditions` | **Sim** | É o que impede prescrição contraindicada — é a finalidade |
| `objective`, `training_experience`, `training_frequency`, `available_days` | Sim | Definem volume e divisão |
| `weight_kg`, `height_cm`, `body_fat_pct` | Sim | Ajustam carga e progressão |
| Nome completo do aluno | **Não deve ir** | O modelo não precisa saber quem é para montar treino |
| Demais campos de `responses` | Não | O `select("*")` para de existir |

**Ação:** trocar o nome por um rótulo neutro no prompt ("o aluno"), e recortar o
`select` aos campos acima. O modelo perde zero capacidade e o payload deixa de
identificar o titular.

### Bloco B — Base Legal (Art. 7° e Art. 11) ❌ **BLOQUEADOR**

`injuries` e `health_conditions` são dado sensível de saúde: base é
Consentimento Explícito (Art. 11, I), a mesma de `student_anamnesis`.

**A rota `/api/ai/chat/[studentId]` não verifica consentimento nenhum** — e não
está sequer listada no mapa de rotas de IA da seção 10 do
`LGPD_COMPLIANCE.md`, que cataloga `body-scan`, `adherence`, `recipe` e outras.
A rota que passará a enviar o dado mais sensível do sistema é a única fora do
mapa.

**Ação obrigatória:** verificar `student_consents` do tipo
`health_data_collection`, vigente e não revogado, antes de montar o contexto. Sem
consentimento, a conversa continua — sem dado de saúde, e dizendo isso ao
especialista.

### Bloco C — Segurança e Acesso (Art. 6°, VII) ✅ com ressalva

O IDOR foi fechado no PR #99: a rota exige `authorizeLinkedSpecialist`. O
critério de pronto reafirma isso por teste, porque a entrega mexe justamente
nessa rota.

Ressalva: `ai_chat_sessions.specialist_id` é `ON DELETE SET NULL`. Uma sessão
órfã guarda conversa sobre um aluno sem dono identificado.

### Bloco D — Direitos dos Titulares (Art. 18) ⚠️

`ai_chat_messages.content` é texto livre e **persiste a conversa inteira** —
inclusive o que o modelo repetir sobre lesão e medicação. Na prática, é uma
segunda cópia de dado de saúde, fora da tabela que o mapa de dados descreve.

O cascade funciona: `ai_chat_sessions` cai com o `profiles` do aluno e
`ai_chat_messages` cai com a sessão. Exclusão de conta elimina de verdade.

O que falta: a seção 7 (retenção) não menciona `ai_chat_*`, e a tela "Meus
Dados" não mostra essas mensagens.

**Ação:** registrar retenção e incluir no mapa de dados. Exportação e tela ficam
para a feature de direitos do titular, já pendente.

### Bloco E — Prevenção e Transparência (Art. 6°, VI e VIII) ❌

1. A Anthropic precisa estar na Política de Privacidade como sub-processadora —
   já é pendência aberta da seção 10, e esta entrega a torna mais urgente.
2. O aluno não sabe que a conversa do especialista com a IA usa a anamnese dele.
   O texto do consentimento fala de coleta, não de envio a terceiro para
   prescrição assistida.
3. **Nada de dado de saúde em log.** O contexto montado nunca vai para
   `console.log`; erro registra o identificador da sessão, não o conteúdo.

### Bloqueadores (não implementar sem resolver)
- ❌ Consentimento não verificado em `/api/ai/chat/[studentId]` → **resolver
  nesta entrega, antes de ligar o contexto**
- ❌ Rota ausente do mapa de rotas de IA → registrar na seção 10
- ⚠️ Texto do consentimento não cobre envio a terceiro para prescrição → ajuste
  de texto, com Legal; a entrega registra a pendência

### Atualizações necessárias em `docs/LGPD_COMPLIANCE.md`
- [ ] Seção 2.2: incluir `ai_chat_messages.content` como local secundário de
      dado sensível
- [ ] Seção 7: retenção de `ai_chat_sessions` e `ai_chat_messages`
- [ ] Seção 10: incluir `/api/ai/chat/[studentId]` no mapa, com o recorte real
      do que trafega
- [ ] Seção 10: corrigir a dívida 32 — o `select("*")` não chega ao prompt

---

## Escopo

### Incluído

**Fase 1 — o contexto passa a existir, com consentimento na frente**
- Verificar `student_consents` vigente antes de montar contexto de saúde
- Ler a anamnese de dentro de `responses`, com os nomes reais das colunas de
  `physical_assessments`
- `select` recortado aos campos que o prompt usa; nome do aluno fora do payload
- Erro de consulta vira erro visível, não "não registrado"

**Fase 2 — busca de exercícios que funciona**
- Descrição da ferramenta lista os nove grupos reais do banco
- Normalizar acento, plural e caixa antes de comparar
- Erro deixa de ser confundido com lista vazia
- Paginação ou contagem, no lugar do `.limit(15)` mudo

**Fase 3 — o estágio que falta**
- `propose_workouts` e `save_workouts` como ferramentas do chat
- Ligar `BulkWorkoutProposalCard` e `pendingWorkoutProposal` à rota que já existe
- Estágio 2 no prompt, com o mesmo protocolo de confirmação da periodização

**Fase 4 — erro apresentável**
- Mensagem humana na bolha; o técnico vai para o log do servidor

### Fora do escopo (explicitamente)

- **Criar exercício novo no catálogo pela conversa.** `exercises` é catálogo
  compartilhado; deixar a IA inserir cria lixo que todo especialista vê. O
  estágio prescreve o que existe.
- **Tela "Meus Dados" e exportação da conversa.** Direito do titular, feature
  própria.
- **Unificar o coach do aluno com o do especialista.** São personas distintas.
- **Rate limit.** Dívida 29, vale para todas as rotas de IA.
- **Texto novo de consentimento.** Depende de Legal; a entrega registra.

---

## Fluxo de dados

```
Especialista → POST /api/ai/chat/[studentId]
  → authorizeLinkedSpecialist          ← vínculo ativo (PR #99)
  → student_consents                   ← consentimento vigente  ◀ NOVO
      sem consentimento → contexto sem saúde, e o coach diz isso
  → loadStudentContext                 ← só os campos que o prompt usa
  → prompt sem o nome do titular
  → Anthropic (EUA)
  → ai_chat_messages                   ← a conversa persiste aqui
```

## Tabelas do banco envolvidas

| Tabela | Operação | Observação |
|---|---|---|
| `student_consents` | SELECT | Porta de entrada do contexto de saúde |
| `student_anamnesis` | SELECT | Campos de dentro de `responses`, não `*` |
| `physical_assessments` | SELECT | `weight_kg`, `height_cm`, `body_fat_pct` |
| `exercises` | SELECT | Catálogo; sem INSERT pela IA |
| `training_periodizations`, `training_plans` | SELECT | Contexto |
| `workouts`, `workout_exercises` | INSERT | Fase 3 |
| `ai_chat_sessions`, `ai_chat_messages` | SELECT, INSERT | Conversa |

Nenhuma tabela nova, nenhum campo novo.

## Impacto em outros módulos

- **AI (web)** — contexto, ferramentas, prompt e o card desligado
- **Mobile** — nenhum: usa `/workout/batch` e `/negotiate`, que não mudam
- **Briefing** — nenhum

---

## Decisões técnicas

**Consentimento antes do contexto, não depois.** A checagem fica antes de
`loadStudentContext`, não dentro dele: o dado sensível não deve nem ser lido do
banco se não pode ser usado.

**Sem consentimento, a conversa não morre — emagrece.** Recusar a tela inteira
empurra o especialista para fora da ferramenta. O coach responde sobre estrutura
e volume, e diz que não tem acesso ao histórico de saúde daquele aluno.

**O nome do titular sai do prompt.** O modelo chama de "o aluno". Não custa
capacidade nenhuma e tira a identificação do payload que atravessa a fronteira.

**A IA prescreve, não cria catálogo.** `exercises` é compartilhado entre todos os
especialistas; deixar o modelo inserir polui a base de todo mundo.

**Erro de contexto é erro, não silêncio.** Os dois defeitos do D1 sobreviveram
porque falha e ausência tinham a mesma aparência. Toda consulta do contexto passa
a distinguir as duas.

---

## Riscos

| Risco | Mitigação |
|---|---|
| Ligar o contexto e vazar dado de saúde sem base legal | Consentimento é a primeira coisa da fase 1; o critério de pronto verifica |
| A IA prescrever contra a restrição mesmo com o dado | O prompt passa a exigir citar a restrição ao propor; teste com dado semeado |
| Especialista achar que o coach "esqueceu" o aluno sem consentimento | O coach diz explicitamente que não tem acesso, em vez de agir como se não houvesse dado |
| Proposta de treino salvar exercício inexistente | `save_workouts` valida os ids contra `exercises` antes de gravar |

---

## Checklist de done

- [ ] D1 fechado — verificado com anamnese e avaliação semeadas
- [ ] D2 fechado — os nove grupos respondem
- [ ] D3 entregue — treino criado e salvo pela conversa
- [ ] D4 fechado — erro sem termo técnico
- [ ] Consentimento verificado antes de qualquer dado de saúde ir para o prompt
- [ ] Nome do titular fora do payload
- [ ] `docs/LGPD_COMPLIANCE.md` — seções 2.2, 7 e 10 atualizadas
- [ ] Código funciona e passou em lint + typecheck + testes
- [ ] PR mergeado em `development`
- [ ] `docs/features/ai-coach-workout-stage.md` criado
- [ ] `docs/STATUS.md` atualizado
