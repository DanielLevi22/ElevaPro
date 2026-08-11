# PRD: rls-security-hardening

**Data de criação:** 2026-08-11
**Status:** approved
**Branch:** feature/rls-security-hardening
**Autor:** Daniel Levi

---

## As 3 perguntas obrigatórias

> Nenhuma linha de código é escrita sem estas 3 perguntas respondidas.

### O quê?
Habilitar Row Level Security nas **18 tabelas que não têm**, com políticas que
isolem cada aluno e cada especialista, e uma guarda em CI que impeça uma tabela
nova de nascer desprotegida.

### Por quê?
Hoje o isolamento entre usuários existe apenas no `WHERE` da aplicação. Quem
tiver um token de qualquer conta autenticada — inclusive um aluno — consegue ler
e escrever nas tabelas desprotegidas direto pela API REST do Supabase, sem
passar pelo nosso código.

Isso inclui as fotos corporais de todos os alunos, todas as anamneses, todas as
avaliações físicas e todo o histórico de treino. E inclui a tabela de vínculos,
o que abre um caminho de escalonamento descrito abaixo.

O `LGPD_COMPLIANCE.md` já registra, na seção 1, que RLS mal configurado é falha
do **controlador**, não do operador. Não é dívida técnica de conveniência: é
exposição de dado sensível de titular, com responsabilidade nominal.

### Como saberemos que está pronto?
- [x] As 27 tabelas têm `rowsecurity = true` — verificado por query em
      `pg_tables`, não por leitura de migration
- [x] Um aluno autenticado não lê nenhuma linha de outro aluno, em nenhuma
      tabela — teste automatizado com dois alunos reais
- [x] Um especialista não lê dado de aluno sem vínculo `active` — teste com dois
      especialistas e o mesmo aluno
- [x] Um especialista desvinculado perde acesso na mesma consulta, sem job de
      limpeza
- [x] Um aluno não consegue inserir linha em `student_specialists` que o vincule
      a outra pessoa
- [x] Um aluno não consegue alterar nem apagar o próprio registro em
      `student_consents`
- [x] CI falha se uma migration criar tabela sem RLS
- [x] Nenhuma tela do web ou do mobile quebra — suíte atual passando

---

## Contexto

Levantado em 2026-08-11 durante o `/lgpd-check` do PRD do briefing (ainda na
branch `feature/briefing`), que precisava ler `workout_sessions` e parou nisso.

Auditoria das migrations em `supabase/migrations/`:

| | Tabelas |
|---|---|
| **Com RLS** | 9 — `ai_chat_sessions`, `ai_chat_messages`, `workout_session_sets`, `diet_plans`, `diet_meals`, `diet_meal_items`, `meal_logs`, `foods`, `health_daily_metrics` |
| **Sem RLS** | 18 — `profiles`, `student_specialists`, `student_consents`, `student_link_codes`, `student_anamnesis`, `physical_assessments`, `body_scans`, `workout_sessions`, `workout_session_exercises`, `workout_exercises`, `workouts`, `training_periodizations`, `training_plans`, `exercises`, `specialist_services`, `achievements`, `daily_goals`, `student_streaks` |

Não existe **nenhum** `GRANT` ou `REVOKE` nas migrations. As tabelas ficam com o
grant padrão que o Supabase concede ao papel `authenticated` — leitura e escrita
liberadas, com o RLS sendo a única barreira que deveria existir. Onde ele não
existe, não há barreira.

O `0000_snapshot.json` do Drizzle confirma: `"isRLSEnabled": false` em todas.

### Por que isso passou

O PRD [database-audit-and-refactor](database-audit-and-refactor.md) está marcado
como ✅ done com a descrição "Schema limpo: 21 tabelas, RLS, RPC, seeds". O RLS
foi previsto, mas entrou só nas tabelas que features posteriores tocaram —
nutrição (0013), métricas de saúde (0015), chat de IA (0003). As tabelas do
núcleo, criadas na 0000, nunca receberam política.

Ninguém percebeu porque a aplicação sempre filtra por `auth.uid()` no `WHERE`. O
sistema se comporta corretamente **pelo cliente oficial**. O buraco só aparece
quando alguém fala direto com a API.

---

## O achado mais grave: escalonamento por `student_specialists`

As políticas que **já existem** dependem dessa tabela. Exemplo real, de
`0013_nutrition_rls.sql`:

```sql
CREATE POLICY "specialist_read_linked_meal_logs" ON meal_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM student_specialists ss
      WHERE ss.student_id = meal_logs.student_id
        AND ss.specialist_id = auth.uid()
        AND ss.status = 'active'
    )
  );
```

`student_specialists` **não tem RLS**. Qualquer autenticado pode inserir nela.
Basta inserir uma linha com `specialist_id` = o próprio id, `student_id` = a
vítima e `status = 'active'` para que essa política — e as de
`health_daily_metrics`, `diet_plans`, `diet_meals`, `diet_meal_items` — passem a
conceder acesso legitimamente.

Ou seja: **proteger as 18 não é só fechar 18 buracos. É o que sustenta as 9 que
já estão fechadas.** Enquanto a tabela de vínculo for escrivível, a proteção
existente é decorativa.

Por isso `student_specialists` é a primeira da fila, não uma a mais na lista.

---

## Escopo

### Incluído

**Fase 1 — a base do controle de acesso**
- `student_specialists` — a keystone. Aluno lê os próprios vínculos; especialista
  lê os seus. **INSERT e UPDATE só por função `SECURITY DEFINER`**, nunca direto
- `profiles` — cada um lê e edita o próprio; especialista lê o perfil de aluno
  com vínculo ativo
- `student_consents` — aluno lê o próprio. **Sem UPDATE nem DELETE para ninguém**:
  é registro de prova, e prova que o titular pode apagar não prova nada
- `student_link_codes` — código de vínculo. Sem leitura ampla; resgate por função

**Fase 2 — dado de saúde**
- `student_anamnesis`, `physical_assessments`, `body_scans`, `workout_sessions`,
  `workout_session_exercises`
- Padrão já validado em `meal_logs` e `health_daily_metrics`: dono tem tudo;
  especialista tem **SELECT** e só com `student_specialists.status = 'active'`
- Especialista não escreve dado de execução no lugar do aluno

**Fase 3 — prescrição e catálogo**
- `workouts`, `workout_exercises`, `training_periodizations`, `training_plans` —
  especialista dono escreve, aluno vinculado lê
- `exercises` — catálogo: leitura para todos, escrita só de quem criou ou admin
- `specialist_services` — cada especialista gere os próprios

**Fase 4 — gamificação**
- `achievements`, `daily_goals`, `student_streaks` — do aluno, com leitura para
  o especialista vinculado

**Fase 5 — guarda contra recorrência**
- Estender `scripts/check-schema-refs.js`, ou script irmão, para falhar quando
  uma tabela existir sem `rowsecurity = true`
- Rodar no mesmo job de CI que já valida referências de schema

**Testes de isolamento**
- Suíte que autentica como dois alunos e dois especialistas distintos e afirma
  que nenhum enxerga o dado do outro, tabela a tabela
- Sem isso, "RLS habilitado" é afirmação sem prova — habilitar RLS **sem
  política** bloqueia tudo, e habilitar com política errada não bloqueia nada

### Fora do escopo (explicitamente)

- **Acesso do admin.** Continua sendo assunto do
  [admin-panel-restore](admin-panel-restore.md), que já decidiu: admin não lê
  dado de saúde. Este PRD não cria política de admin em tabela sensível.
- **Auditoria de acesso.** Registrar quem leu o quê é outra feature.
- **Rotação de chave ou revisão do `service_role`.** Fora do recorte de RLS.
- **Consolidar `sets_data` × `workout_session_sets`** (dívida #9). Vizinho, mas
  outro problema.
- **Criptografia em repouso de foto corporal.** `body_scans` guarda URL, não
  binário; proteger o bucket do Storage é trabalho próprio — e fica **registrado
  como pendência**, porque RLS na tabela não protege o arquivo se a URL vazar.

---

## Fluxo de dados

```
Cliente (web ou mobile)
  → PostgREST / supabase-js  ← é AQUI que o buraco existe hoje
      → RLS  ← barreira que precisa existir em toda tabela
          → tabela
```

O ponto central: hoje o desenho assume que todo acesso passa pelo nosso código.
Não passa. `supabase-js` no navegador fala direto com o PostgREST usando a chave
anônima e o JWT do usuário — a mesma porta que um `curl` usa.

## Tabelas do banco envolvidas

As 18 sem RLS, listadas em "Contexto". Nenhum campo novo, nenhuma tabela nova.
Só `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` e `CREATE POLICY`.

Uma exceção: as fases 1 e 2 devem introduzir funções `SECURITY DEFINER` em
schema `private` para os casos em que a política precisa consultar a própria
tabela que está protegendo — vínculo e resgate de código. Sem isso, a política
entra em recursão.

## Impacto em outros módulos

**Todos.** É a mudança de maior alcance possível sem tocar em uma linha de UI.

O risco real e assimétrico: uma política **restritiva demais** quebra tela em
produção; uma **permissiva demais** não quebra nada e deixa o buraco aberto. A
segunda é silenciosa, então os testes de isolamento importam mais que a suíte
atual passar.

Ordem obrigatória: aplicar no ambiente local, rodar a suíte inteira do web e do
mobile, depois preview, e só então produção.

---

## Decisões técnicas

**`student_specialists` primeiro, não junto.** É a única tabela cuja ausência de
RLS invalida a proteção de outras cinco. Vai sozinha na fase 1 para que o efeito
seja verificável isoladamente.

**Vínculo não se cria por INSERT direto.** Se o aluno ou o especialista puder
inserir em `student_specialists`, qualquer política que dependa dela vira
sugestão. A criação passa a ser função `SECURITY DEFINER` que valida o código de
convite — o que também resolve `student_link_codes`.

**`student_consents` é imutável para o titular.** Parece contraintuitivo negar
DELETE ao dono do dado, mas o registro existe para provar que o consentimento foi
dado. Revogar é gravar `revoked_at`, não apagar a linha. A revogação continua
disponível; a adulteração do histórico, não.

**Especialista lê, não escreve, dado de execução.** Mesmo padrão de `meal_logs`.
Quem executou o treino foi o aluno; deixar o especialista escrever ali corrompe a
proveniência do dado de saúde.

**Testar contra o banco, não contra a migration.** Ler o `.sql` e concluir que a
política está certa é o erro que produziu esta situação — o PRD anterior dizia
"RLS" e ninguém verificou tabela a tabela. O critério de pronto é query em
`pg_tables` e teste com dois usuários reais.

**A guarda antes da limpeza.** Mesma lição do
[schema-drift-alignment](schema-drift-alignment.md) e do
[design-system-unification](design-system-unification.md): sem CI, a 28ª tabela
nasce sem RLS e ninguém percebe até o próximo `/lgpd-check`.

---

## Descobertas durante a implementação

**O banco construído só pelas migrations não serve nada.** O PRD dizia que as
tabelas ficam com "o grant padrão que o Supabase concede ao papel
`authenticated`". Não ficam. As tabelas nascem pertencendo a `postgres`, e o
`pg_default_acl` do schema `public` só cobre objetos criados por
`supabase_admin` — então, num `db reset` limpo, `authenticated` não tem nem
SELECT. Sem RLS isso ficava escondido porque o ambiente atual foi montado antes
das migrations atuais; com RLS ligada em tudo, a primeira tela abre vazia.

Daí a migration `0020_api_role_grants.sql`, fora do escopo original: grants
explícitos para `authenticated` e `service_role`, `REVOKE` de `anon` em tudo, e
`ALTER DEFAULT PRIVILEGES FOR ROLE postgres` para que a 28ª tabela já nasça
acessível. RLS decide **quais linhas**; o GRANT decide **se a tabela existe**
para o papel. Precisa dos dois.

**Política RLS roda com os privilégios de quem consulta.** As funções de
`private` precisam de `GRANT EXECUTE ... TO authenticated`, ao contrário do que
o exemplo da documentação sugere — revogar de `authenticated` faz toda consulta
falhar com `permission denied for function`. É seguro porque a função lê
`auth.uid()` por dentro em vez de aceitar o chamador por parâmetro; o papel pode
executá-la, mas não pode mentir sobre quem é.

---

## Riscos

| Risco | Mitigação |
|---|---|
| Política restritiva demais derruba tela em produção | Aplicar local → preview → produção, com a suíte rodando em cada etapa |
| Recursão de política ao consultar a tabela protegida | Funções `SECURITY DEFINER` em schema `private` |
| RLS habilitado sem política bloqueia tudo | Habilitar e criar política no **mesmo** arquivo de migration, nunca em migrations separadas |
| Mobile quebrar sem ninguém ver | O app usa as mesmas tabelas; rodar a suíte do `app/` também |
| Achar que terminou porque a migration existe | Critério de pronto é `pg_tables` + teste de isolamento |

---

## Checklist de done

> Só muda o Status para `done` quando TODOS estão marcados.

- [x] 27 tabelas com `rowsecurity = true`, verificado por query
- [x] Testes de isolamento passando: 2 alunos, 2 especialistas, tabela a tabela
- [x] Guarda de CI falhando em tabela nova sem RLS
- [x] Suíte do web e do mobile passando
- [ ] Aplicado em preview e verificado antes de produção
- [ ] `docs/LGPD_COMPLIANCE.md` — seção 10 atualizada com o estado real por módulo
- [ ] Código funciona e passou em lint + typecheck + testes
- [ ] PR mergeado em `development`
- [ ] `docs/features/rls-security-hardening.md` criado ou atualizado
- [ ] `docs/STATUS.md` atualizado
