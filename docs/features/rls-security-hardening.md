# Feature: rls-security-hardening

**Status:** active
**PRD:** [rls-security-hardening](../PRDs/rls-security-hardening.md)
**Plataformas:** ambos (é banco — não tem UI)
**Última atualização:** 2026-08-11

---

## O que é

Row Level Security habilitada nas 27 tabelas do schema, com políticas que
isolam cada aluno e cada especialista, e uma guarda no pre-commit e no CI que
impede uma tabela nova de nascer desprotegida.

## Por que existe

O isolamento entre usuários vivia apenas no `WHERE` da aplicação. `supabase-js`
no navegador fala direto com o PostgREST usando a chave anônima e o JWT do
usuário — a mesma porta que um `curl` usa. Sem RLS, o `WHERE` do nosso código é
uma sugestão que o cliente pode não seguir.

Verificado em 2026-08-11 com uma conta de aluno recém-criada, sem vínculo
nenhum: leu 9 perfis, 3 anamneses, 1 consentimento e 29 treinos, e teve o INSERT
de vínculo aceito. Depois da correção, as mesmas consultas retornam zero linhas
e os dois caminhos de escalonamento são recusados.

---

## Fluxo de dados

```
Cliente (web ou mobile)
  → PostgREST / supabase-js       ← o buraco ficava aqui
      → GRANT do papel            ← a tabela existe para authenticated?
          → RLS                   ← quais linhas ele vê?
              → tabela
```

Os dois níveis são independentes e ambos necessários: o GRANT decide se a tabela
**existe** para o papel; a RLS decide **quais linhas**. Uma tabela sem GRANT
responde 401 mesmo com política perfeita; uma tabela com GRANT e sem RLS entrega
tudo.

## Tabelas do banco

| Tabela | Dono escreve | Especialista vinculado | Migration |
|---|---|---|---|
| `student_specialists` | — (só a RPC) | SELECT + UPDATE→`inactive` | 0016 |
| `profiles` | UPDATE do próprio | SELECT | 0016 |
| `student_consents` | INSERT + UPDATE (revogar) | SELECT | 0016 |
| `student_link_codes` | ALL do próprio | nenhum acesso | 0016 |
| `student_anamnesis` | ALL | SELECT | 0017 |
| `physical_assessments` | SELECT | SELECT + INSERT (sem UPDATE/DELETE) | 0017 |
| `body_scans` | ALL | SELECT | 0017 |
| `workout_sessions` | ALL | SELECT | 0017 |
| `workout_session_exercises` | ALL (via sessão) | SELECT | 0017 |
| `workout_session_sets` | ALL (0011) | SELECT | 0017 |
| `training_periodizations` | — | ALL do próprio; aluno lê | 0018 |
| `training_plans` | — | ALL do próprio; aluno lê | 0018 |
| `workouts` | — | ALL do próprio; aluno lê | 0018 |
| `workout_exercises` | — | ALL do próprio; aluno lê | 0018 |
| `exercises` | catálogo: todos leem | escreve quem criou | 0018 |
| `specialist_services` | — | ALL do próprio; aluno vinculado lê | 0018 |
| `achievements` | ALL | SELECT | 0019 |
| `daily_goals` | ALL | SELECT | 0019 |
| `student_streaks` | ALL | SELECT | 0019 |

As 8 restantes (`diet_plans`, `diet_meals`, `diet_meal_items`, `meal_logs`,
`foods`, `health_daily_metrics`, `ai_chat_sessions`, `ai_chat_messages`) já
tinham RLS das migrations 0003, 0013 e 0015 — mas dependiam de
`student_specialists`, então na prática só passaram a valer com a 0016.

---

## Implementação

### Banco (`supabase/migrations/`)

| Arquivo | Responsabilidade |
|---|---|
| `0016_rls_core_access.sql` | Schema `private`, helpers, tabelas de acesso, RPC `link_student_by_code` |
| `0017_rls_health_data.sql` | Dado de saúde e execução de treino |
| `0018_rls_prescription_and_catalog.sql` | Prescrição e catálogo de exercícios |
| `0019_rls_gamification.sql` | Conquistas, metas e ofensivas |
| `0020_api_role_grants.sql` | GRANTs de `authenticated` e `service_role`, REVOKE de `anon`, default privileges |

### Guardas (`scripts/`)

| Arquivo | O que prova | Onde roda |
|---|---|---|
| `check-rls.js` | Toda tabela criada por migration habilita RLS **e** tem ao menos uma política | pre-commit + CI (`schema-refs`) |
| `test-rls-isolation.mjs` | Quem enxerga o quê, com 4 usuários reais falando com o PostgREST | manual: `npm run db:test-rls` |

`check-rls.js` lê as migrations, não o banco — o CI não tem credencial. A
limitação é assumida: ele prova que a política **existe**, nunca que está
**correta**. Quem prova comportamento é o teste de isolamento.

### Aplicação (`shared/`)

| Arquivo | Mudança |
|---|---|
| `src/services/students.service.ts` | `linkStudent` passa a chamar a RPC; os 5 passos que rodavam no cliente saíram |

---

## Regras de negócio

1. Vínculo entre aluno e especialista **não nasce por INSERT**. Só pela função
   `public.link_student_by_code(p_code)`, que tira o especialista de
   `auth.uid()` no servidor.
2. Encerrar vínculo é direito dos dois lados, mas o `WITH CHECK` trava o destino
   em `inactive` — ninguém reativa um vínculo encerrado para recuperar acesso.
3. Especialista **lê** dado de execução (sessões, séries, body scans); não
   escreve. Quem executou o treino foi o aluno.
4. `physical_assessments` é a exceção: quem avalia é o especialista, então ele
   insere e o aluno lê. Mas **só INSERT** — a avaliação é imutável pelo cliente,
   e medida errada se corrige com avaliação nova, não reescrevendo a antiga.
5. `student_consents` não tem DELETE para ninguém. Revogar é gravar
   `revoked_at`.
6. O especialista não lê `student_link_codes`. Se lesse, listaria todos os
   códigos válidos do sistema.
7. Desvínculo tira o acesso na mesma consulta seguinte — a política avalia
   `status = 'active'` em tempo de leitura, sem job de limpeza.

## Decisões técnicas não-óbvias

- **Helpers `SECURITY DEFINER` em schema `private`, com `EXECUTE` para
  `authenticated`.** A expressão de uma política roda com o papel de *quem
  consulta*. Revogar EXECUTE de `authenticated` — como sugere o exemplo comum da
  documentação — faz toda leitura falhar com `permission denied for function`
  (42501), não com lista vazia. É seguro conceder porque a função lê `auth.uid()`
  internamente em vez de receber o chamador por parâmetro: o papel pode
  executá-la, mas não pode mentir sobre quem é. O schema `private` não é exposto
  pelo PostgREST (`config.toml` lista só `public` e `graphql_public`), então isso
  não cria endpoint novo.

- **`(SELECT auth.uid())` em vez de `auth.uid()` puro.** A forma com subquery é
  avaliada uma vez por consulta; a forma nua roda por linha.

- **Índices em `(specialist_id, status)` e `(student_id, status)`.** Sem eles,
  cada checagem de vínculo vira seq scan em toda leitura de tabela protegida.

- **A migration 0020 existe porque migration não concede acesso.** As tabelas
  nascem pertencendo a `postgres`, e o `pg_default_acl` do schema `public` só
  cobre objetos criados por `supabase_admin`. Num `db reset` limpo,
  `authenticated` não tinha nem SELECT — toda tela abriria vazia. O
  `ALTER DEFAULT PRIVILEGES FOR ROLE postgres` faz a 28ª tabela já nascer
  acessível.

- **Habilitar RLS e criar política no mesmo arquivo, sempre.** RLS ligada sem
  política nega tudo, inclusive para o dono do dado. Separar em duas migrations
  cria uma janela em que o sistema está quebrado. `check-rls.js` falha nesse
  caso também, não só na ausência de RLS.

## Divergências web ↔ mobile

Nenhuma. As duas plataformas usam o mesmo `students.service.ts` do `shared/` e
falam com o mesmo banco.

## Pendências conhecidas

- **Bucket do Storage.** `body_scans` guarda a URL da foto, não o binário. A RLS
  protege a linha; o arquivo precisa de política própria no Storage. Se a URL
  vazar, a foto vaza.
- **Aplicar em preview e produção.** Verificado apenas em local até aqui.
- **`ranking_scores`** não existe no schema; criar já com RLS quando o
  leaderboard for para produção.
