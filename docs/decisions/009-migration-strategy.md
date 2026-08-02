# ADR-009: Migrations aplicadas pelo pipeline, não à mão

**Data:** 2026-08-02
**Status:** accepted

---

## Contexto

O [ADR-003](003-environment-strategy.md) definiu 3 ambientes (Local → Preview →
Production) e registrou como consequência: *"mais difícil: migrations precisam
ser aplicadas nos 2 projetos"*. Identificou a dor, mas não definiu o mecanismo.

Sem mecanismo, virou tarefa manual. E tarefa manual que ninguém faz produz
exatamente o que encontramos em 2026-08-02: o projeto Supabase de **Preview
estava vazio** — todas as tabelas retornavam 404, as 16 migrations nunca tinham
sido aplicadas. Qualquer deploy de preview subia e quebrava em toda tela.

Nenhum workflow em `.github/workflows/` mencionava Supabase.

Havia ainda três armadilhas latentes:

- `app/drizzle.config.ts` apontava `dbCredentials.url` para `EXPO_PUBLIC_DATABASE_URL`,
  variável que **não existia em nenhum `.env`**. Qualquer comando drizzle-kit que
  conectasse ao banco falhava. Só `generate` funcionava, por não usar credencial.
- O mesmo arquivo vivia em `app/`, embora o schema seja de `shared/` e a saída de
  `supabase/` — nada ali pertence ao mobile.
- `supabase/seed.sql` usava `insert` puro, sem guard. Rodar duas vezes duplicaria
  os 44 `foods` e 57 `exercises`, o que impedia usá-lo em pipeline.

## Opções consideradas

### Opção A — Manter aplicação manual via `supabase db push` local
- **Prós:** zero configuração; controle total sobre o momento
- **Contras:** é o que já falhou. Depende de alguém lembrar, em 2 ambientes, a
  cada merge. Divergência entre schema versionado e schema real não é detectável
  até quebrar em runtime.

### Opção B — Aplicar no pipeline, junto ao deploy
- **Prós:** migration e código promovem pelo mesmo caminho e na mesma ordem;
  divergência é impossível por construção; o mecanismo é exercitado a cada merge
- **Contras:** exige secrets por ambiente; um erro de migration passa a derrubar
  o deploy (que é o comportamento desejado, mas assusta na primeira vez)

### Opção C — Supabase Branching (branches de banco gerenciadas)
- **Prós:** banco efêmero por PR, isolamento real
- **Contras:** requer plano pago. O ADR-003 escolheu deliberadamente a topologia
  de 2 projetos free.

## Decisão

**Escolhemos a Opção B — migrations aplicadas pelo pipeline, antes do deploy.**

O fator decisivo é a ordem. Código novo contra schema velho quebra em runtime, e
não existe conserto rápido depois que o deploy saiu. Amarrar o deploy à migration
via `needs` torna a sequência correta a única sequência possível — não uma
convenção que depende de disciplina.

```
shared/src/database/schema/*.ts     ← fonte da verdade (Drizzle)
  ↓ npm run db:generate
supabase/migrations/NNNN_*.sql      ← artefato versionado, revisado em PR
  + RLS e policies escritas à mão    (drizzle-kit não gera isso)
  ↓ supabase db push (CI)
development → Preview     main → Production
```

Regras que acompanham a decisão:

1. **Forward-only.** Migration aplicada nunca é editada. Erro se corrige com
   migration nova.
2. **Migration antes do deploy**, sempre, via `needs`.
3. **Produção exige aprovação humana** — o job usa `environment: production`,
   cujas *required reviewers* são configuradas em Settings → Environments.
4. **Migration retrocompatível.** Deploy e migration não são atômicos: por alguns
   segundos o schema novo convive com o código velho. Isso obriga expand/contract
   — adicionar coluna agora, remover a antiga só na release seguinte.
5. **Nunca `drizzle-kit push`.** Ele altera o banco ignorando o versionamento de
   migrations. `generate` produz o arquivo; quem aplica é o supabase CLI.

## Secrets necessários

Escopados por **environment** (`preview` e `production`), não por repositório.
Mesmos nomes, valores distintos — impede um run de preview enxergar credencial de
produção, o que os sufixos `_PREVIEW`/`_PROD` no escopo do repo não garantem.

| Secret | Onde obter |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | Account → Access Tokens |
| `SUPABASE_PROJECT_REF` | Project Settings → General → Reference ID |
| `SUPABASE_DB_PASSWORD` | senha do banco definida na criação do projeto |
| `SUPABASE_DB_URL` | Settings → Database → Connection string (URI), para o seed |

## Consequências

- Mais fácil: schema de Preview e Production não pode divergir do versionado
- Mais fácil: o primeiro run popula o Preview vazio sem intervenção
- Mais difícil: migration quebrada agora barra o deploy — desejável, mas exige
  que migrations sejam testadas localmente com `supabase db reset` antes do PR
- Mais difícil: seed precisa ser idempotente para sempre (guard `where not exists`)
- Bloqueia: aplicar hotfix de schema direto no dashboard. Se alguém fizer, o
  próximo `db push` encontra divergência e falha — por design.

## Como reverter (se necessário)

Remover o job `migrate` dos workflows e voltar ao `db push` manual. Custo técnico
baixo, mas retoma exatamente o problema que originou este ADR. Só faz sentido se
o projeto migrar para Supabase Branching (Opção C), que resolve o mesmo problema
por outro caminho.
