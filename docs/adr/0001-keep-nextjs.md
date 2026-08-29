# Manter Next.js no web (não migrar para Vite/React puro)

**Data:** 2026-04-12
**Status:** accepted

---

## Contexto

O dashboard web roda em Next.js 16. A maior parte das features atuais são Client Components com TanStack Query — praticamente nenhuma feature usa SSR, SSG ou Image Optimization do Next.js. Surgiu a dúvida: faz sentido manter Next.js e pagar o custo de complexidade, ou migrar para Vite + React puro que seria mais leve?

A decisão foi tomada em conjunto com o roadmap de I.A. orquestrada, que exige um ambiente Node.js server-side seguro.

## Opções consideradas

### Opção A — Migrar para Vite + React puro
- **Prós:** Bundle menor, build mais rápido, menos abstração
- **Contras:** Sem ambiente Node.js server-side. Para I.A. orquestrada precisaríamos criar um servidor separado (Express/Fastify), que aumenta a complexidade de infra, deploy e manutenção. Chaves de API de LLMs ficariam expostas ou exigiriam serviço extra.

### Opção B — Manter Next.js e usar API Routes como BFF
- **Prós:** API Routes (`app/api/`) rodam Node.js server-side — lugar ideal para lógica de agentes I.A., chamadas seguras a LLMs, e compartilhamento de recursos entre web e mobile. Um único deploy. Sem chaves expostas.
- **Contras:** Overhead do Next.js para features que não usam SSR. Curva de aprendizado de Server vs Client Components.

## Decisão

**Mantemos o Next.js porque ele será o BFF (Backend-for-Frontend) da estratégia de I.A. orquestrada.**

O fator decisivo não é o que usamos hoje, mas o que vamos precisar em 3 meses. Mobile e Web precisarão chamar os mesmos agentes de I.A. — centralizar isso em `web/src/app/api/ai/` é mais simples do que criar e manter um servidor separado.

## Consequências

- Mais fácil: lógica de I.A. em um único lugar, acessível por mobile e web via HTTP
- Mais fácil: deploy único (Vercel já configurado)
- Mais difícil: time precisa entender a distinção Server/Client Components
- Regra: sempre marcar `"use client"` explicitamente quando necessário, sem depender do comportamento padrão

## Como reverter (se necessário)

Revisar se a estratégia de I.A. mudar para Supabase Edge Functions ou serviço externo dedicado. Custo de migração: médio (mover API Routes para servidor próprio, adaptar chamadas do mobile).
