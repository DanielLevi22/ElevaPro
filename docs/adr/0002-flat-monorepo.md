# Flat Monorepo com /packages/ na raiz (sem Turborepo)

**Data:** 2026-04-12
**Status:** accepted

---

## Contexto

O projeto tem `web/` e `app/` na raiz, cada um com sua própria cópia de `src/packages/core` e `src/packages/supabase`. Estas cópias já divergiram (quote style diferente, `DietPlan.status` com tipos diferentes). O problema vai piorar com o tempo.

Turborepo foi tentado anteriormente mas causou falhas no build do Metro Bundler do React Native por causa de symlinks e caminhos relativos ao mover o app para `apps/mobile/`.

## Opções consideradas

### Opção A — Turborepo com estrutura `apps/`
- **Prós:** Ferramenta robusta de monorepo, cache de builds, pipelines
- **Contras:** Metro Bundler quebra com symlinks quando o app está em `apps/mobile/`. Já foi tentado e falhou. Custo de debug alto.

### Opção B — Flat Monorepo com npm workspaces e `/packages/` na raiz
- **Prós:** `web/` e `app/` ficam na raiz (Metro funciona). Um único `packages/core` e `packages/supabase` compartilhados. npm workspaces já suportado pelo `package.json` raiz. Sem ferramenta extra.
- **Contras:** Sem cache de build do Turborepo. Build pipeline mais manual.

### Opção C — Manter duplicação atual
- **Prós:** Sem trabalho de migração
- **Contras:** Já divergiu. Vai gerar bugs de inconsistência entre plataformas. Inaceitável a longo prazo.

## Decisão

**Migraremos para Flat Monorepo: `/packages/core` e `/packages/supabase` na raiz, referenciados via npm workspaces.**

Estrutura alvo:
```
/MeuPersonal
  /packages
    /core        → @elevapro/core
    /supabase    → @elevapro/supabase
  /web           → importa @elevapro/core
  /app           → importa @elevapro/core
  package.json   → workspaces: ["web", "app", "packages/*"]
```

O fator decisivo: a duplicação já causou divergência real (tipos com aspas diferentes, `DietPlan.status` pode divergir em semântica). Cada semana sem migrar aumenta o custo.

## Consequências

- Mais fácil: mudança em `core` reflete em web e mobile simultaneamente
- Mais fácil: garantia de consistência de tipos e regras de negócio entre plataformas
- Mais difícil: migração inicial requer atualizar path aliases em ambos os projetos
- Regra: nenhum código de domínio (tipos, serviços, regras de negócio) pode existir fora de `/packages/`

## Como reverter (se necessário)

Copiar `/packages/core` de volta para `web/src/packages/core` e `app/src/packages/core`. Custo: baixo, mas indesejável pela duplicação que retorna.
