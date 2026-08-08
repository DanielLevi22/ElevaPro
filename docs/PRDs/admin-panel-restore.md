# PRD: admin-panel-restore

**Data de criação:** 2026-08-08
**Status:** draft
**Branch:** feature/admin-panel-restore
**Autor:** Daniel Levi

---

## As 3 perguntas obrigatórias

> Nenhuma linha de código é escrita sem estas 3 perguntas respondidas.

### O quê?
Tornar o painel `/admin` funcional — hoje ele é inacessível para qualquer usuário,
inclusive um admin legítimo — sem conceder ao admin acesso a dados de saúde.

### Por quê?
Não existe hoje forma de administrar a plataforma: aprovar especialistas
pendentes, suspender contas, ou ver métricas de uso. O painel existe em código,
mas toda query dele falha.

### Como saberemos que está pronto?
- [ ] Um usuário com `account_type = 'admin'` entra em `/admin` sem ser redirecionado
- [ ] A listagem de usuários mostra todos os perfis
- [ ] Admin consegue alterar `account_status` de um usuário
- [ ] Admin **não** consegue ler `physical_assessments`, `student_anamnesis`,
      `health_daily_metrics`, `meal_logs` nem `diet_plans` — verificado com
      `set local role authenticated` no banco
- [ ] Métricas de uso funcionam sem que o admin leia linha de tabela sensível
- [ ] Teste de RLS cobrindo cada afirmação acima
- [ ] `npm run lint`, `tsc --noEmit` e `db:check-refs` limpos

---

## Contexto

Levantado em 2026-08-08 ao tentar criar o primeiro usuário admin.

### O painel está morto — nenhum usuário entra

O [`admin/layout.tsx:32`](../../web/src/app/admin/layout.tsx) faz:

```ts
.select("account_type, is_super_admin, email")
```

`is_super_admin` **não existe** em `profiles`. O PostgREST rejeita a query, `profile`
fica `null`, e a checagem `profile?.account_type !== "admin"` redireciona **todos**
para `/dashboard`. Falha fechada — não é brecha, mas o painel é inalcançável.

### Quatro colunas fantasma em `profiles`

| Coluna | Usada em | Deve existir? |
|---|---|---|
| `is_super_admin` | `admin/layout`, `admin/users`, `admin/users/[id]` | **Não** — decidido: só existe `admin` |
| `last_login_at` | as 3 acima + `useAnalytics` | A decidir |
| `invite_code` | `admin/users` | A decidir |
| `admin_notes` | `admin/users/[id]` | A decidir |

Colunas reais: `id, email, full_name, avatar_url, account_type, account_status,
created_at, coach_mode, persona_track`.

Consequência além do portão: `useAnalytics` calcula "usuários ativos em 7/30 dias"
com `last_login_at`, então esse número também está quebrado.

### Zero policies concedem acesso a admin

```sql
select count(*) from pg_policies
 where schemaname='public' and (qual ilike '%admin%' or with_check ilike '%admin%');
-- 0
```

O CASL concede `can('manage', 'all')` para admin, mas isso é camada de aplicação.
No banco o admin é apenas mais um `authenticated`, e a RLS filtra tudo por
`auth.uid()` ou vínculo de specialist. Mesmo com o portão corrigido, o admin veria
listas vazias.

---

## Resultado do /lgpd-check — acesso de admin

### Blocos conformes
- **Bloco A** ✅ — administrar contas tem finalidade específica e legítima
- **Bloco B** ✅ — dados administrativos (`profiles`) têm base em execução de
  contrato (Art. 7°, V); métricas agregadas em legítimo interesse (Art. 7°, IX)

### Bloqueadores (não implementar sem resolver)

❌ **Conceder ao admin RLS de leitura em tabelas de saúde viola requisito já
documentado.** A seção 4.7 do `LGPD_COMPLIANCE.md` diz textualmente:

> "Admin não acessa dados de saúde de alunos sem necessidade"

E a seção 6 restringe dados de saúde a "apenas o próprio aluno e especialistas com
vínculo `active`". A proposta original — policies de admin em
`physical_assessments`, `student_anamnesis`, `health_daily_metrics`, `meal_logs`,
`diet_plans` — contraria as duas. **Fica fora do escopo.**

### Itens que precisam de atenção

⚠️ **Métricas exigem contagem sobre tabelas que o admin não pode ler.** Resolvido
pelo desenho abaixo: função `SECURITY DEFINER` que devolve apenas números, nunca
linhas.

⚠️ **`admin_notes` é anotação sobre um titular.** Se existir, é dado pessoal com
finalidade de suporte — precisa entrar no mapa de dados e ser visível ao titular
no exercício do direito de acesso (Art. 18, II).

⚠️ **Acesso administrativo deveria ser auditável.** A seção 6 pede logs de acesso
para endpoints de saúde. Como este PRD nega acesso de admin a saúde, a auditoria
fica menos crítica — mas alteração de `account_status` por admin é ação sobre
terceiro e merece registro. Fora do escopo aqui; vira PRD próprio se necessário.

### Atualizações necessárias em docs/LGPD_COMPLIANCE.md
- [ ] Registrar em 2.1 as colunas novas de `profiles` que forem aprovadas
- [ ] Documentar base legal do acesso administrativo a `profiles`
- [ ] Registrar explicitamente que admin **não** acessa dados de saúde

---

## Escopo

### Incluído

**Fase 1 — destravar o painel** (sem schema, sem RLS)
- Remover as 3 referências a `is_super_admin` e a prop `isSuperAdmin` do
  `AccountTypeBadge` e do `UserContext` do CASL
- Corrigir os `select` para pedir só colunas existentes

**Fase 2 — colunas**
- Migration para as colunas aprovadas na decisão pendente abaixo
- `last_login_at` populado por trigger em `auth.users` ou no fluxo de login

**Fase 3 — RLS de admin, restrita a dados administrativos**
- Helper `private.is_admin()` em `SECURITY DEFINER`
- Policies de admin **apenas** em `profiles` (SELECT, e UPDATE de
  `account_status`/`admin_notes`)
- Função `SECURITY DEFINER` devolvendo agregados para as métricas

**Fase 4 — criar o primeiro admin**
- Via Dashboard do Supabase + `update` pontual, documentado em
  `docs/features/`

### Fora do escopo (explicitamente)
- **Acesso de admin a dados de saúde.** Bloqueado pelo `/lgpd-check` acima.
- **Admin no `seed.sql`.** O seed roda em preview e produção pelo pipeline, e o
  repositório é público — admin com senha conhecida ali é backdoor.
- Log de auditoria de ações administrativas.
- As 4 páginas de admin removidas no PR #79 (`audit/logs`, `content/reports`,
  `settings`) — dependiam de tabelas que nunca existiram.

---

## Fluxo de dados

```
[Admin abre /admin]
  → layout consulta profiles (só colunas reais)
  → RLS: private.is_admin() permite ler todos os perfis
  → métricas via rpc('admin_usage_metrics')
      → SECURITY DEFINER conta linhas de tabelas sensíveis
      → devolve apenas números, nunca conteúdo
```

## Tabelas do banco envolvidas

| Tabela | Operação do admin | Observação |
|--------|-------------------|------------|
| `profiles` | SELECT, UPDATE parcial | única com policy de admin |
| `physical_assessments`, `student_anamnesis`, `health_daily_metrics`, `meal_logs`, `diet_plans` | **nenhuma** | só contagem, via RPC |

## Impacto em outros módulos

- `web/src/app/admin/**` — todas as telas
- `web/src/shared/hooks/useAnalytics.ts` — passa a usar a RPC
- `web/src/packages/supabase/abilities.ts` — remove `isSuperAdmin` do contexto
- `app/src/modules/auth/store/authStore.ts` — idem no mobile

---

## Decisões técnicas

**`private.is_admin()` em `SECURITY DEFINER`, não subquery na policy.** Uma policy
em `profiles` que consultasse `profiles` para saber se o usuário é admin entraria
em recursão infinita de RLS. `SECURITY DEFINER` ignora RLS nas tabelas que toca,
o que quebra o ciclo. Segue o padrão da skill `supabase-postgres-best-practices`:
schema privado, `set search_path = ''`, checagem de `auth.uid()` dentro do corpo,
e `revoke execute` de `anon`/`authenticated`.

**`(select auth.uid())`, não `auth.uid()`.** Sem o `select`, a função é chamada uma
vez por linha; com ele, o planner avalia uma vez só. Diferença de ordem de
grandeza em tabela grande.

**Métricas por RPC agregadora, não por policy de leitura.** É o que permite atender
"quantos alunos têm plano ativo" sem que o admin possa ler um plano. A função
devolve `count(*)`, e nenhuma linha atravessa a fronteira.

**Admin não entra no seed.** O `seed.sql` roda em produção a cada deploy pelo
pipeline do ADR-009, e o repositório é público.

---

## Decisão pendente (bloqueia a Fase 2)

Quais das três colunas devem existir de fato:

| Coluna | Argumento a favor | Argumento contra |
|---|---|---|
| `last_login_at` | métrica de usuários ativos depende dela | `auth.users.last_sign_in_at` já existe e pode ser lida por RPC |
| `admin_notes` | suporte precisa registrar contexto | é dado pessoal sobre terceiro; entra no mapa LGPD |
| `invite_code` | — | nenhum fluxo usa; provável resquício |

Recomendação: `last_login_at` via RPC sobre `auth.users` em vez de coluna nova,
`admin_notes` só se o suporte for usar de fato, e `invite_code` descartada.

---

## Checklist de done

> Só muda o Status para `done` quando TODOS estão marcados.

- [ ] Código funciona e passou em lint + typecheck + testes
- [ ] PR mergeado em `development`
- [ ] `docs/features/admin-panel-restore.md` criado ou atualizado
- [ ] `docs/STATUS.md` atualizado
- [ ] `docs/LGPD_COMPLIANCE.md` atualizado
