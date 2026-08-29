# Sonnet para orquestração, Haiku para tarefas estruturadas

**Data:** 2026-04-19
**Status:** accepted

---

## Contexto

O Eleva Pro usa a Anthropic API para múltiplas funções: orquestração de chat multi-turn, geração de JSON estruturado, análise de imagens, assistente diário, briefings e reviews automáticos. Cada função tem características diferentes de complexidade, latência e custo. Usar o mesmo modelo para tudo é ou caro demais ou inadequado.

## Opções consideradas

### Opção A — Sonnet para tudo
- **Prós:** Qualidade máxima em todas as interações
- **Contras:** 10x mais caro que Haiku para tarefas onde Haiku entrega o mesmo resultado. Custo inviabiliza o modelo de preços planejado (R$0,67/usuário/mês ficaria R$6,70+).

### Opção B — Haiku para tudo
- **Prós:** Mínimo custo
- **Contras:** Haiku não tem raciocínio suficiente para orquestração multi-turn com tool use complexo. Qualidade do chat degradaria significativamente.

### Opção C — Modelo por função (Sonnet + Haiku + Vision)
- **Prós:** Custo ótimo. Cada modelo faz o que faz bem. Margem alta com qualidade mantida.
- **Contras:** Complexidade de configuração. Time precisa saber qual modelo usar onde.

## Decisão

**Adotamos Opção C: modelo selecionado por função.**

| Função | Modelo | Justificativa |
|---|---|---|
| Orquestrador de chat (treino/nutrição) | Claude Sonnet 4.6 | Multi-turn complexo, tool use encadeado, raciocínio profundo |
| Análise de check-in com foto | Claude Sonnet 4.6 + Vision | Único com vision nativa no Claude |
| Assistente diário, briefing, review | Claude Haiku 4.5 | Q&A simples, geração estruturada — Haiku suficiente |
| Sub-agentes (gerar JSON de entidades) | Claude Haiku 4.5 | Input estruturado → output estruturado: Haiku é 10x mais barato e igualmente capaz |

**Constante obrigatória no código — nunca hardcodar strings:**
```typescript
export const AI_MODELS = {
  ORCHESTRATOR: "claude-sonnet-4-6",
  SUBAGENT:     "claude-haiku-4-5-20251001",
} as const;
```

O fator decisivo: custo estimado com Haiku para tarefas simples é ~R$0,67/usuário/mês. Com Sonnet para tudo seria ~R$6,70+. A diferença inviabiliza os planos de R$19–39/mês.

## Consequências

- **Mais barato:** custo de IA por usuário dentro da margem aceitável
- **Mesma qualidade:** Haiku entrega qualidade equivalente ao Sonnet para tarefas estruturadas (gerar JSON, resumir dados, responder perguntas contextuais)
- **Regra de desenvolvimento:** ao criar qualquer chamada de IA, o desenvolvedor deve justificar o modelo escolhido. Usar Sonnet onde Haiku serve é bug de performance.
- **Revisão:** rever esta decisão se a Anthropic lançar modelos com melhor relação custo/qualidade.

## Como reverter (se necessário)

Substituir `AI_MODELS.SUBAGENT` por `AI_MODELS.ORCHESTRATOR` globalmente. Custo imediato: aumento de ~10x no custo de IA. Impacto na margem: significativo.
