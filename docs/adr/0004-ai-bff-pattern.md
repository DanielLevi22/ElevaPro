# IA centralizada no BFF — nunca chamar Anthropic do mobile

**Data:** 2026-04-19
**Status:** accepted

---

## Contexto

O mobile já tinha um `WorkoutAIService` usando Gemini com um único agente e muitas tools. O contexto ficou muito grande, os resultados degradaram, e a API key do Gemini estava exposta no bundle do app. Ao escalar para uma arquitetura multi-agente com Claude, a decisão de onde rodar a lógica de IA precisou ser revisitada.

Opções: rodar no mobile (Expo), rodar em Edge Functions do Supabase, ou rodar no Next.js (BFF).

## Opções consideradas

### Opção A — Manter IA no mobile
- **Prós:** Zero latência de rede para o orchestrador
- **Contras:** API key exposta no bundle (qualquer pessoa pode extrair). Sem prompt caching server-side. Sem tool use confiável. Contexto gigante cresce sem controle. Já falhou na prática.

### Opção B — Supabase Edge Functions
- **Prós:** Próximo ao banco, serverless
- **Contras:** Limite de CPU e memória que inviabiliza chamadas encadeadas de IA. Timeout de 10s incompatível com streaming de chat. Sem suporte nativo a SSE de longa duração.

### Opção C — Next.js API Routes como BFF
- **Prós:** Node.js completo sem limites de CPU/memória. SSE nativo com `ReadableStream`. Chave da Anthropic apenas server-side. Mobile e web chamam o mesmo endpoint. Prompt caching funciona server-side. Deploy já existe (Vercel).
- **Contras:** Um hop de rede a mais do mobile para o BFF. Aceitável dado o ganho em segurança e controle.

## Decisão

**Toda lógica de IA roda no BFF (`web/src/app/api/ai/`). Mobile e web chamam os mesmos endpoints via HTTP.**

```
Mobile (Expo)  ──HTTP──▶  /api/ai/chat/[studentId]  ──▶  Anthropic API
Web (Next.js)  ──HTTP──▶  /api/ai/chat/[studentId]  ──▶  Anthropic API
```

O fator decisivo: segurança (API key nunca no cliente) + prompt caching server-side (economia de ~85% por sessão) + SSE funciona nativamente em Node.js.

## Consequências

- **Mais seguro:** chave da Anthropic nunca exposta no bundle do app
- **Mais barato:** prompt caching funciona corretamente server-side
- **Mais fácil:** um único lugar para toda lógica de IA (sem duplicação mobile/web)
- **Restrição:** toda chamada de IA deve criar um endpoint em `/api/ai/` — proibido importar o SDK da Anthropic em qualquer arquivo fora dessa pasta
- **WorkoutAIService (mobile):** será depreciado gradualmente, não quebrado imediatamente

## Como reverter (se necessário)

Mover os orchestradores para Supabase Edge Functions quando (e se) o limite de timeout for aumentado e SSE for suportado nativamente. Custo de migração: médio.
