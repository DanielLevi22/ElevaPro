# Arquitetura de IA — Abstração de Provider e Hierarquia de Orquestradores

**Data:** 2026-05-02
**Status:** accepted
**Contexto:** Expansão do módulo de IA para suportar coach do aluno (Student Coach) além do coach do especialista (já implementado)

---

## Contexto

O módulo de IA atual (`web/src/modules/ai/`) foi construído para o especialista:
- `workoutOrchestrator.ts` — Claude Sonnet 4.6, tool use, SSE streaming
- `contextLoader.ts` — carrega contexto do estudante para o especialista
- `chatService.ts` — persiste sessões e mensagens no Supabase

Agora precisamos adicionar o Student Coach, que:
1. Usa os mesmos modelos de linguagem mas com system prompts e contexto diferentes
2. Se comporta de forma diferente dependendo da persona do aluno (Expresso vs. Analítico, tracks de 16 a 32 perguntas)
3. Precisará de features adicionais: análise visual, explanation cards, adaptação de treino
4. Em algum momento, pode precisar trocar o provider de LLM (custo, contrato, desempenho)

O código atual referencia `Anthropic` e `claude-sonnet-4-6` diretamente em múltiplos lugares. Se precisarmos trocar de provider, a mudança seria cirúrgica em cada arquivo.

---

## Decisão

### 1. Camada de abstração de provider (AIProvider interface)

Criar uma interface `AIProvider` que encapsula toda comunicação com o LLM. Todos os orquestradores usam apenas essa interface — nunca o SDK do Anthropic/OpenAI diretamente.

```typescript
// web/src/modules/ai/providers/types.ts
interface AIProvider {
  complete(options: LLMCompletionOptions): Promise<LLMResponse>;
  stream(options: LLMCompletionOptions): AsyncIterable<LLMStreamChunk>;
  completeWithVision(options: LLMVisionOptions): Promise<LLMResponse>;
}
```

Um arquivo de configuração central (`ai.config.ts`) instancia os providers e exporta os que cada orquestrador usa:

```typescript
// web/src/modules/ai/ai.config.ts
export const aiProviders = {
  reasoning: new AnthropicProvider('claude-sonnet-4-6'),
  fast:      new AnthropicProvider('claude-haiku-4-5-20251001'),
  vision:    new AnthropicProvider('claude-sonnet-4-6'),
} as const;
```

Para trocar de Anthropic para OpenAI: alterar apenas `ai.config.ts`. Nenhum orquestrador muda.

### 2. Hierarquia de orquestradores (BaseOrchestrator)

Criar uma classe abstrata `BaseOrchestrator` que implementa o loop de orchestration (context loading → system prompt → tool loop → SSE events) e deixa para as subclasses apenas o que é específico: o system prompt e as tools disponíveis.

```
BaseOrchestrator (abstract)
  ├── WorkoutOrchestrator       (especialista — já existe, refatorar)
  ├── StudentCoachOrchestrator  (aluno — novo)
  └── NutritionOrchestrator     (futuro — especialista de nutrição)
```

### 3. Context loaders separados por ator

Especialista e aluno precisam de contextos muito diferentes:
- **Especialista**: lista de alunos, planos existentes, histórico de sessões do aluno que está sendo atendido
- **Aluno**: própria anamnese, próprio assessment, próprio plano ativo, histórico de check-ins, preferências de coaching

Manter context loaders separados:
- `SpecialistContextLoader` — contexto para o coach do especialista
- `StudentContextLoader` — contexto para o coach do aluno (novo)

### 4. Persona e modo como parâmetros de configuração do orquestrador

O `StudentCoachOrchestrator` recebe `mode` e `track` no construtor e usa isso para compor o system prompt. Não há dois orquestradores separados por modo — a diferença é o prompt, não a lógica de orchestration.

```typescript
new StudentCoachOrchestrator({
  provider: aiProviders.reasoning,
  contextLoader: new StudentContextLoader(studentId),
  mode: 'analytical',
  track: 'intermediate',
})
```

---

## Alternativas consideradas

### Alternativa A: Manter código como está, duplicar para Student Coach

**Rejeitada.** Resultaria em dois `workoutOrchestrator.ts` quase idênticos divergindo ao longo do tempo. Trocar de provider ainda exigiria editar múltiplos arquivos.

### Alternativa B: Um único orquestrador universal com flags para tudo

**Rejeitada.** Um único objeto com 20 parâmetros opcionais e branches internos para especialista/aluno/expresso/analítico é mais difícil de testar e de entender do que uma hierarquia clara.

### Alternativa C: Função pura em vez de classe para orchestration

**Considerada.** Funções são mais fáceis de testar de forma isolada. Porém, o loop de orchestration mantém estado (histórico de mensagens, context cacheado, contador de tool calls) que se beneficia de encapsulamento em objeto. Classes venceram aqui.

---

## Consequências

**Positivas:**
- Trocar de Claude para GPT-4o (ou qualquer provider futuro) é uma mudança em `ai.config.ts`
- Adicionar um novo orquestrador (ex: `NutritionOrchestrator`) requer apenas implementar `buildSystemPrompt` e `getTools`
- Context loaders separados evitam que dados do especialista vazem para o contexto do aluno e vice-versa
- `mode` e `track` como parâmetros de construção tornam o comportamento do orquestrador determinístico e testável

**Negativas/trade-offs:**
- Refatoração do `workoutOrchestrator.ts` existente para estender `BaseOrchestrator` — trabalho não-trivial mas necessário antes de criar o Student Coach
- A interface `AIProvider` pode precisar de extensão quando um provider suportar feature que outro não suporta (ex: thinking tokens do Claude)

---

## Referências

- Implementação: issue [#148](https://github.com/DanielLevi22/ElevaPro/issues/148)
- Sub-PRDs afetados: todos os `ai-student-coach-*.md`
- Código existente: `web/src/modules/ai/services/workoutOrchestrator.ts`
