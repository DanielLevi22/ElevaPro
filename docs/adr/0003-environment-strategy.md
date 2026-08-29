# Estratégia de Ambientes (Local → Preview → Production)

**Data:** 2026-04-12
**Status:** accepted

---

## Contexto

O projeto não tinha separação de ambientes. Todo desenvolvimento acontecia diretamente contra o banco de produção no Supabase. Qualquer erro de migration ou bug afetava dados reais de usuários.

O plano gratuito do Supabase permite **2 projetos ativos por organização** — exatamente o necessário para separar preview de produção sem custo adicional.

## Opções consideradas

### Opção A — 1 projeto Supabase (estado atual)
- **Prós:** Zero configuração
- **Contras:** Dev e produção no mesmo banco. Migration errada afeta dados reais. Sem ambiente para validar antes de subir.

### Opção B — Supabase CLI local + 1 projeto cloud (produção)
- **Prós:** Banco local gratuito e isolado para desenvolvimento
- **Contras:** Sem ambiente intermediário (preview). Código vai direto de local para produção sem validação em ambiente real. Requer Docker sempre rodando.

### Opção C — 2 projetos Supabase free (preview + produção) + local opcional
- **Prós:** 3 camadas claras. Preview valida em ambiente real antes de chegar em produção. Custo zero. Supabase CLI local é opcional para trabalho offline.
- **Contras:** Projeto preview pode pausar após 7 dias sem acesso (reativa com 1 clique, sem perda de dados).

## Decisão

**Adotamos a Opção C — 3 ambientes: Local → Preview → Production.**

```
LOCAL          →   PREVIEW              →   PRODUCTION
feature/*          development branch       main branch
Banco Preview      Supabase Projeto 1       Supabase Projeto 2
(ou CLI local)     Vercel Preview URL       Vercel Produção
```

O fator decisivo: 2 projetos gratuitos cobrem exatamente o necessário. Preview é o ambiente onde código integrado é validado antes de chegar em usuários reais — sem isso, `development` e `main` colidem no mesmo banco.

## Consequências

- Mais fácil: erros de migration são detectados no Preview antes de afetar produção
- Mais fácil: desenvolvedores trabalham localmente contra o banco Preview (sem risco)
- Mais fácil: custo zero — 2 projetos free cobrem preview + produção
- Mais difícil: migrations precisam ser aplicadas nos 2 projetos (Preview e Production)
- Atenção: projeto Preview pode pausar após 7 dias sem acesso — reativar é 1 clique

## Variáveis de ambiente por contexto

| Contexto | Variável | Aponta para |
|---|---|---|
| Local / feature branches | `SUPABASE_URL` | Projeto Preview (ou localhost via CLI) |
| Branch `development` | `SUPABASE_URL` | Projeto Preview |
| Branch `main` | `SUPABASE_URL` | Projeto Production |

## Mapeamento de branches

| Branch | Ambiente | Supabase | Vercel |
|---|---|---|---|
| `feature/*` | Local | Preview project | — |
| `development` | Preview | Preview project | Preview URL |
| `main` | Production | Production project | Production URL |

## Como reverter (se necessário)

Apontar todas as variáveis para o projeto de produção. Custo: baixo tecnicamente, mas perde a separação de ambientes — só faz sentido se o projeto for encerrado.
