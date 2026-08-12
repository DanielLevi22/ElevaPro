# Feature: ai-coach-workout-stage

**Status:** active
**PRD:** [ai-coach-workout-stage](../PRDs/ai-coach-workout-stage.md)
**Plataformas:** web
**Última atualização:** 2026-08-12

---

## O que é

O coach de IA do especialista: conversa que monta periodização, fases e agora
também os treinos com exercícios — enxergando o histórico de saúde do aluno,
com consentimento verificado.

## Por que existe

O coach prescrevia às cegas. Uma aluna com *"Hérnia de disco L5-S1 — proibido
agachamento livre"* registrada chegava ao modelo como "Lesões: nenhuma
registrada", e o prompt manda usar exatamente esse campo para decidir a
prescrição.

E o estágio de treino existia pela metade: o cartão de proposta sem importador,
a rota de salvar lendo uma proposta que nada produzia.

---

## Fluxo de dados

```
Especialista → POST /api/ai/chat/[studentId]
  → authorizeLinkedSpecialist       ← vínculo ativo
  → student_consents                ← consentimento vigente
      sem consentimento → contexto sem saúde, e o coach avisa
  → loadStudentContext              ← só os campos que o prompt usa
  → prompt SEM o nome do titular
  → Anthropic

  tool propose_workouts
    → phaseOwnedBy                  ← a fase é deste aluno?
    → unknownExerciseNames          ← todo exercício existe?
    → state.pendingWorkoutProposal  ← guardado no servidor
    → SSE workout_proposal          → cartão na conversa

  botão Aprovar → POST /save-workouts → grava a cópia guardada
```

## Tabelas do banco

| Tabela | Operação |
|---|---|
| `student_consents` | SELECT — porta de entrada do contexto de saúde |
| `student_anamnesis` | SELECT `responses` |
| `physical_assessments` | SELECT `weight_kg, height_cm, body_fat_pct, assessed_at` |
| `training_periodizations`, `training_plans` | SELECT |
| `exercises` | SELECT — catálogo, sem INSERT pela IA |
| `workouts`, `workout_exercises` | INSERT na aprovação |
| `ai_chat_sessions`, `ai_chat_messages` | SELECT, INSERT, UPDATE |

---

## Implementação

| Arquivo | Responsabilidade |
|---|---|
| `services/specialistContextLoader.ts` | Consentimento, contexto e a formatação para o prompt |
| `services/exerciseCatalog.ts` | Resolve grupo muscular e valida nome de exercício |
| `services/chatService.ts` | Estado da sessão, `phaseOwnedBy`, gravação da periodização |
| `tools/workoutTools.ts` | As quatro ferramentas do chat |
| `prompts/specialist.prompts.ts` | Estágios 1 e 2, e as regras de restrição |
| `app/api/ai/chat/[studentId]/route.ts` | Orquestra e valida cada tool call |
| `components/AiCoachChat.tsx` | Cartões de proposta e aprovação |

---

## Regras de negócio

1. **Sem consentimento vigente, dado de saúde não sai do banco.** A checagem
   vem antes da leitura, não depois.
2. **Sem consentimento a conversa não morre, emagrece.** O coach avisa e é
   proibido de afirmar que o aluno "não tem lesões" — afirmar ausência sem
   saber é o que leva à prescrição perigosa.
3. **O nome do titular não vai para o modelo.** Ele diz "o aluno".
4. **Restrição declarada é intransponível**, e o coach precisa dizer qual
   exercício tirou e por quê.
5. **Exercício vem do catálogo.** Nome que não existe faz a proposta ser
   recusada, com a lista do que faltou — a IA não cria exercício, porque o
   catálogo é compartilhado entre todos os especialistas.
6. **A fase é validada** contra o aluno e o especialista antes de a proposta ser
   guardada.
7. **A aprovação salva a cópia guardada no servidor**, não a que está na tela.

## Decisões técnicas não-óbvias

- **`propose_workouts` sem `save_workouts`.** O PRD previa as duas. Uma só é
  melhor: a proposta fica em `pendingWorkoutProposal` e a aprovação salva a
  cópia guardada. Pedir ao modelo para reemitir 4 treinos × 6 exercícios num
  segundo tool call abriria espaço para divergir do que o especialista aprovou
  olhando o cartão.

- **`muscle_group` é `enum` no schema da ferramenta.** Descrever os valores em
  prosa foi o que produziu `Ombros` e `Braços`, que não existem.

- **`unknownExerciseNames` lê o catálogo inteiro.** O modelo reescreve a caixa
  do que leu ("Supino Reto com Barra" ← "Supino reto com barra"), então um `in`
  exato acusaria como inexistente tudo que ele propõe. São 57 linhas de uma
  coluna; comparar normalizado sai mais barato que errar.

- **O id da fase aparece no contexto.** Sem ele o modelo inventa um slug —
  `"fase-1-adaptacao"` — e a gravação morre com `invalid input syntax for type
  uuid`.

- **Erro do chat é mensagem humana; o técnico vai para o log**, e o log
  registra a sessão, nunca o conteúdo do contexto.

## Verificação

Testes: 20 em `exerciseCatalog`, 11 em `specialistContextLoader`, 8 em
`chatService`.

E a conversa exercitada ponta a ponta contra o banco local, com aluna que tem
hérnia registrada:

```
proposta? SIM — 3 treinos       phase_id: (correto)
exercícios: Supino reto com barra | … | Face pull no cabo   (19)
contraindicados na lista: nenhum
aprovação -> HTTP 200 {"saved":[3 treinos]}
no banco: Treino A [6 ex] | Treino B [6 ex] | Treino C [7 ex]
```

O coach excluiu agachamento livre, levantamento terra e stiff por causa da
hérnia, e disse por quê antes de propor.

## Pendências conhecidas

- Texto do consentimento não menciona envio a terceiro para prescrição
  assistida — depende de Legal.
- A Anthropic precisa constar como sub-processadora na Política de Privacidade.
- `ai_chat_messages` guarda a conversa inteira, incluindo o que o modelo repetir
  sobre lesão. Falta política de retenção e a tela "Meus Dados".
- Sem rate limit (dívida 29).
