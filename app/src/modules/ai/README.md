# Módulo AI — cliente do BFF

## Visão Geral

O mobile **não chama provedor de IA diretamente**. Toda inteligência vive no BFF
do web (`web/src/app/api/ai/*`), e este módulo é apenas o cliente HTTP dessas
rotas. A decisão está registrada em
[ADR-004](../../../../docs/decisions/004-ai-bff-pattern.md).

O motivo é simples: chave de provedor embarcada no bundle do app é chave
vazada. `EXPO_PUBLIC_*` vai para o binário e qualquer um extrai.

## Estrutura

```
src/modules/ai/
├── services/
│   └── AssistantService.ts   # cliente HTTP do BFF
├── components/
│   └── PlanProposalCard.tsx
└── index.ts                  # exports centralizados
```

## AssistantService

**Responsabilidade**: falar com o BFF. Nada mais.

A base vem de `EXPO_PUBLIC_API_URL` — sem ela nenhuma feature de IA funciona,
porque não há fallback local por design.

```typescript
import { AssistantService } from '@/modules/ai';

const plan = await AssistantService.generateWorkoutPlan(studentId, prompt);
```

## Consumidores

| Módulo | Uso |
|---|---|
| `modules/nutrition/services/AnalysisService.ts` | análise nutricional |
| `modules/workout/services/WorkoutAIService.ts` | geração de treino |

## O que NÃO fazer aqui

- Chamar Anthropic, Gemini ou qualquer provedor direto. Se precisar de uma
  capacidade nova de IA, ela nasce como rota no BFF.
- Guardar chave de provedor em `EXPO_PUBLIC_*`.

> `GeminiService`, `AiToolRegistry` e `workoutTools` foram removidos em
> 2026-08-02: haviam ficado órfãos após a migração para o BFF e ninguém os
> importava.
