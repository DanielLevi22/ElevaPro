# PRD: technical-debt-remediation

**Data de criação:** 2026-08-27
**Status:** approved
**Branch:** feature/technical-debt-remediation
**Autor:** Daniel Levi

---

## As 3 perguntas obrigatórias

### O quê?

Inventário completo e plano de quitação da dívida técnica das três bases do Eleva Pro
(`app/`, `web/`, `shared/`), levantado por auditoria direta do código em 2026-08-27 —
não por leitura do `STATUS.md`. Cada item traz evidência com arquivo e linha, o efeito
observável, e a guarda que impede a recorrência.

### Por quê?

O alvo é Abril de 2026 com cobrança recorrente. Três coisas tornam a dívida atual
incompatível com esse alvo:

1. **Existe defeito ativo em produção**, não só risco. Duas páginas do dashboard chamam
   hooks dentro de `.map()` — o React quebra quando a lista de alunos muda de tamanho.
   O cadastro de aluno pelo mobile chama uma Edge Function que não existe no repositório.
2. **A rede de proteção tem buracos conhecidos.** A cobertura real é 17,5% no web e 9,1%
   no mobile, sem nenhum limite mínimo configurado. O `biome.json` desliga `noExplicitAny`
   e seis regras de acessibilidade no web, então duas regras do `CLAUDE.md` não são
   verificadas por ninguém.
3. **A causa-raiz de metade das dívidas já resolvidas segue de pé.** O cliente Supabase do
   mobile é construído sem o genérico `Database` — `types.ts` exporta `Database = any`.
   Toda consulta do app é `any`. Foi isso que deixou as dívidas #7, #10, #40 e #44
   nascerem, e nada impede a próxima.

Cobrar assinatura de um personal trainer por um app onde "criar aluno" não funciona e o
PDF entregue ao cliente final diz "MEUPERSONAL ENGINE" é risco de produto, não de código.

### Como saberemos que está pronto?

- [ ] `web/src/app/dashboard/nutrition/overview/page.tsx` e `page.tsx` renderizam com 0, 1 e
      N alunos sem violar as Rules of Hooks — verificado por teste que muda a lista entre renders
- [ ] `npx tsc --noEmit` no `app/` passa com o cliente Supabase tipado por `Database` gerado,
      sem `any` e sem `Record<string, unknown>`
- [ ] `createStudent` do mobile grava um aluno real, com teste de integração
- [ ] Cobertura: `shared/src/services` ≥ 80%, web ≥ 45%, mobile ≥ 30%, com `thresholds`
      configurados no vitest e no jest — o CI falha abaixo disso
- [ ] `biome.json` sem `noExplicitAny: off` e sem as seis regras de a11y desligadas; lint limpo
- [ ] Todas as 16 rotas `/api/ai/*` com rate limit por usuário e registro de tokens consumidos
- [ ] Zero ocorrências de `as never` em chamada de navegação no `app/`
- [ ] Zero ocorrências de "Meu Personal" / `meupersonal` em código de produção
- [ ] Migrations `0016`–`0033` aplicadas e verificadas em produção
- [ ] `next build` e a suíte Maestro rodando no CI

---

## Contexto

### Como esta auditoria foi feita

Varredura direta do código em 2026-08-27, na `development` limpa (`5ad2ff1`):

| Verificação | Método |
|---|---|
| Tamanho e forma | `wc -l` sobre 642 arquivos `.ts`/`.tsx` |
| Tipagem | `tsc --noEmit` nos dois workspaces + contagem de `any`, `as never`, `as unknown as` |
| Testes | `vitest run --coverage` e `jest --coverage` executados de verdade |
| Duplicação | `diff` par a par entre `app/src/packages` e `web/src/packages` |
| Código morto | reverse-grep de cada arquivo não-index contra todos os imports |
| Regras do `CLAUDE.md` | grep por cada proibição explícita (inline style, import módulo→módulo, `any`, rota literal) |
| Segurança | rotas do BFF × `service_role` × `api-auth`; `user_metadata`; rate limit |
| Banco | 34 migrations, índices, `select("*")` |

### Tamanho da base

| | Arquivos | Linhas | Testes | Cobertura real |
|---|---|---|---|---|
| `app/` (mobile) | 276 | 41.314 | 113 | **9,06%** |
| `web/` (Next.js) | 337 | 41.346 | 376 | **17,48%** |
| `shared/` | 29 | 3.522 | 2 arquivos | — |

527 commits desde 2025-11-21. 34 migrations. 23 rotas de API. 21 arquivos acima de 500
linhas (o limite do `CLAUDE.md`), 63 acima de 300.

### O que já está bom — e não entra neste PRD

A auditoria confirmou que estas frentes estão sólidas e não precisam de trabalho:

- **Web sem import módulo→módulo.** Zero violações. A regra de arquitetura está sendo obedecida.
- **Nenhum Supabase inline em componente do web** fora de `CreateWorkoutModal`.
- **`tsc --noEmit` passa nos dois workspaces.** Nenhum erro de tipo pendente.
- **`web/src/lib/api-auth.ts`** é um trabalho bem feito: o tipo `AuthResult` torna impossível
  ler `caller` sem passar pela checagem, e o `check-api-auth.js` guarda a regra no CI.
- **Índices do banco:** 25 índices cobrindo as chaves estrangeiras quentes.
- **Guardas de CI existentes** (`check-refs`, `check-columns`, `check-rls`, `check-api-auth`,
  `test-rls-isolation`) são o motivo de esta auditoria encontrar menos drift de schema do que
  encontraria há um mês.
- **`.env` fora do controle de versão.** Nenhuma chave vazada no histórico rastreado.
- **376 testes do web e 113 do mobile passam.** Nenhuma suíte quebrada ou pulada.

---

## Inventário da dívida

Legenda de esforço: **P** ≤ meio dia · **M** 1–3 dias · **G** > 3 dias.
"Novo" = encontrado nesta auditoria. "#N" = já listado em `docs/STATUS.md`.

---

### 🔴 Crítica — defeito ativo ou risco de produção

#### DT-01 · Hooks dentro de `.map()` quebram o dashboard de nutrição · **Novo** · M

Duas páginas chamam `useDietPlans` e `useStudentNutritionStats` dentro de um `.map()`:

- [nutrition/overview/page.tsx:17-20](../../web/src/app/dashboard/nutrition/overview/page.tsx#L17-L20) — e ainda por cima **dentro de um `useMemo`**, onde hook nenhum pode ser chamado
- [nutrition/page.tsx:328-331](../../web/src/app/dashboard/nutrition/page.tsx#L328-L331)

As quatro ocorrências estão silenciadas com `biome-ignore lint/correctness/useHookAtTopLevel`
e um `TODO` de extrair o componente.

**Efeito:** o número de hooks executados é `2 × quantidade de alunos`. Assim que a lista muda
de tamanho — aluno criado, filtro aplicado, `useStudents` resolvendo de cache vazio para N
itens — o React lança *"Rendered more hooks than during the previous render"* e a página
morre. Um especialista com zero alunos que cadastra o primeiro reproduz isso na hora.
Além disso são 2N queries por render, sem batch.

**Correção:** extrair `StudentNutritionRow` / `StudentPlanStats` — um componente por aluno,
hooks no topo dele. Remover os quatro `biome-ignore`. Teste que renderiza com 0 → 1 → 3 alunos.

#### DT-02 · Produção nunca recebeu as migrations `0016`–`0033` · **#25** · M

18 migrations, incluindo as cinco que ligaram RLS em 18 tabelas, só entram no push para `main`.
O preview se autoverifica com `scripts/verify-rls.sql`; produção não.

**Efeito:** o banco de produção segue no estado pré-auditoria de segurança — tabelas sem RLS,
`workout_exercises` invisível para o aluno, `sets_data` ainda presente.

**Correção:** aplicar e rodar `verify-rls.sql` contra produção. Este item bloqueia qualquer
lançamento; nada mais no PRD faz sentido antes dele.

#### DT-03 · O mobile inteiro consulta o banco sem tipo — causa-raiz de #7, #10, #40 e #44 · **Novo** · G

Dois tipos `Database` conflitantes no mesmo pacote, ambos inúteis:

- [packages/supabase/types.ts:2](../../app/src/packages/supabase/types.ts#L2) — `export type Database = any`, com `biome-ignore` e o comentário *"placeholder until Supabase CLI generates the type"*
- [packages/supabase/client.ts:78](../../app/src/packages/supabase/client.ts#L78) — `export type Database = Record<string, unknown>`

E [client.ts:59](../../app/src/packages/supabase/client.ts#L59) chama `createClient(...)` **sem
genérico**. O `database.types.ts` gerado (1.537 linhas) existe só em `web/src/lib/`.

**Efeito:** toda chamada `.from().select()` do mobile devolve `any`. Coluna inexistente,
tabela renomeada, nulabilidade errada — nada disso é erro de compilação no app. As dívidas
#7 (12 tabelas fantasma), #10 (colunas fantasma no admin), #40 (schema 4 colunas atrás) e
#44 (nenhum caminho gravava `physical_assessments`) são todas o mesmo defeito visto de
ângulos diferentes. `check-column-refs.js` é hoje a única barreira, e ela é textual.

**Correção:** mover `database.types.ts` para `shared/src/database/`, consumir dos dois lados,
`createClient<Database>` no mobile, apagar os dois placeholders. Script `db:types` que
regenera, e guarda de CI que falha se o gerado divergir do banco.

#### DT-04 · "Criar aluno" no mobile chama uma função que não existe · **#31** · P

[students.service.ts:200](../../shared/src/services/students.service.ts#L200) faz
`supabase.functions.invoke("create-student")`. **`supabase/functions/` não existe** — o
diretório inteiro está ausente do repositório.

**Efeito:** ou `CreateStudentScreen` está morto desde sempre, ou existe uma Edge Function
publicada com `service_role` cujo código ninguém revisa e ninguém versiona. As duas
possibilidades são inaceitáveis; a segunda é um furo de segurança.

**Correção:** apontar o mobile para `POST /api/students`, que já existe, é autorizado por
`api-auth` e é o caminho que o web usa. Se a função existir no projeto Supabase, despublicar.

#### DT-05 · Nenhum rate limit em 16 rotas de IA · **#29** · M

Zero ocorrências de rate limit em `web/src`. As 16 rotas sob `/api/ai/` (8 chamando o SDK
Anthropic direto, 8 via orquestrador) aceitam qualquer conta autenticada à vontade.
`/api/ai/body-scan` e `/api/ai/workout/batch` pedem `max_tokens: 4096` com Sonnet.

**Efeito:** conta trial em loop esgota o orçamento de IA do mês. Não é vazamento; é a conta
da Anthropic.

**Correção:** rate limit por `caller.id` em `@/lib/api-auth`, teto diário por conta, e o
registro de tokens do DT-15 para enxergar o consumo.

---

### 🟠 Alta — a rede de proteção não pega o que deveria

#### DT-06 · O `biome.json` desliga as regras que o `CLAUDE.md` exige · **Novo** · M

O override de `web/**` em [biome.json:57-77](../../biome.json#L57-L77) desliga:

| Regra | Consequência |
|---|---|
| `suspicious/noExplicitAny` | "Nunca `any`" do `CLAUDE.md` não é verificado no web |
| `correctness/useExhaustiveDependencies` | dependências de efeito erradas passam |
| `a11y/useButtonType` | 183 `<button>` sem `type` |
| `a11y/noLabelWithoutControl` | 57 `<input>` sem label associado |
| `a11y/useKeyWithClickEvents`, `noStaticElementInteractions`, `useSemanticElements`, `noSvgWithoutTitle` | acessibilidade sem nenhuma verificação |

**Efeito:** duas regras escritas no `CLAUDE.md` como obrigatórias não têm dono. Foi assim que
26 `any` entraram no web sem ninguém ver.

**Correção:** religar uma por uma, corrigindo o que acusar. `noExplicitAny` primeiro (26
ocorrências, 12 fora de teste), a11y depois, junto do DT-12.

#### DT-07 · 8 rotas de API com autorização copiada à mão, 6 delas descartando o erro · **Novo / #27 parcial** · M

Estas rotas não importam `@/lib/api-auth`:

```
api/ai/body-scan          api/ai/nutrition/adherence   api/ai/nutrition/assistant
api/ai/nutrition/recipe   api/ai/workout/batch         api/ai/workout/negotiate
api/auth/register         api/auth/register/student
```

Cada uma reimplementa `getAuthenticatedUserId` ou `authenticateStudent`, e seis usam o padrão
que o próprio `api-auth.ts` foi criado para eliminar:

```ts
const { data } = await client.auth.getUser(token);   // erro descartado
return data.user?.id ?? null;
```

— [workout/batch/route.ts:40](../../web/src/app/api/ai/workout/batch/route.ts#L40),
[body-scan/route.ts:102](../../web/src/app/api/ai/body-scan/route.ts#L102), e mais quatro.

**Efeito:** essas rotas só provam *que existe um usuário*, nunca *qual papel ele tem* nem *se
ele tem vínculo com o aluno em questão*. `check-api-auth.js` não as pega porque não tocam
`supabaseAdmin` — mas `/api/ai/workout/batch` gera prescrição de treino para quem pedir.

**Correção:** migrar as 8 para `authorizeUser` / `authorizeLinkedSpecialist`, e ampliar
`check-api-auth.js` para exigir `api-auth` em toda rota sob `/api/`, não só nas que usam
`service_role`.

#### DT-08 · As permissões CASL já divergiram entre mobile e web · **#1** · M

`diff` normalizado de `abilities.ts`:

```diff
- can('manage', 'Periodization');   // app/src/packages/supabase/abilities.ts
+ // ausente no web
```

O papel `member` gerencia periodizações no mobile e não no web. Os seis arquivos de
`packages/` divergem; `getUserContextJWT` difere também na política de retry (8 tentativas
com backoff no mobile, 3 fixas no web).

**Efeito:** a mesma conta vê botões diferentes em plataformas diferentes. A dívida #1 previu
"já divergiram"; esta é a instância concreta, e ela é de controle de acesso.

**Correção:** `abilities.ts` e `getUserContextJWT.ts` migram para `shared/src/`. `packages/`
das duas plataformas viram reexport. Teste de tabela cobrindo os 4 papéis × 14 subjects.

#### DT-09 · Cobertura de 17,5% no web e 9,1% no mobile, sem limite mínimo · **#4** · G

Medido, não estimado:

| Alvo | Statements | Observação |
|---|---|---|
| `web/src` total | **17,48%** | 376 testes passando |
| `web/src/shared/hooks` | 10,08% | 14 dos 17 hooks a 0% |
| `web/src/shared/utils` | 6,51% | `exportDietPDF` (324 linhas) a 0% |
| `app/src` total | **9,06%** | 113 testes passando |
| `app/src/app/**` | **0%** | todas as 72 rotas |
| `shared/src/services` | — | 7 dos 8 serviços sem arquivo de teste |

Nem `jest.config.js` nem `vitest.config.ts` têm `coverageThreshold`. A cobertura é coletada,
publicada como artefato e ignorada.

O ponto mais grave é `shared/src/services`: são os serviços centralizados que as duas
plataformas consomem — `workouts` (493 linhas), `nutrition` (487), `briefing` (244),
`students` (209), `auth` (183), `gamification` (181), `health` (108). Só `bodyScan` tem teste.

**Correção:** `shared/src/services` primeiro, com threshold de 80%. Depois threshold global
subindo por degraus (web 25% → 35% → 45%; mobile 15% → 25% → 30%), cada degrau num PR.

#### DT-10 · O CI não constrói o web nem roda a suíte E2E · **#12 + Novo** · M

`.github/workflows/ci.yml` roda lint, typecheck e testes unitários. Não roda `next build`, e
os quatro fluxos Maestro (`app/.maestro/`) não aparecem em workflow nenhum.

**Efeito:** erro de prerender só aparece no deploy, depois do merge — foi o caso do
`useSearchParams` em `/auth/register`. E os únicos testes que exercitam login, execução de
treino e registro de refeição de ponta a ponta nunca rodaram automaticamente.

**Correção:** job `web-build` rodando `next build` com o filtro de path do web; job Maestro
noturno (não por PR — é lento) contra o preview.

#### DT-11 · 157 `as never` neutralizam as rotas tipadas, e um deles esconde rota inexistente · **Novo** · M

`typedRoutes: true` está ligado em [app.json:103](../../app/app.json#L103). Mesmo assim há 157
`as never` no mobile, 33 deles em `router.push`/`router.replace` com string literal — os dois
lados da regra do `CLAUDE.md` ("`router.push(ROUTES.X)` — nunca string literal solta")
quebrados de uma vez.

Confirmado por comparação com a árvore de rotas:

```
PhysicalAssessment.tsx:125 → router.push('/assessment/anamnesis' as never)
```

**A rota `/assessment/anamnesis` não existe.** Existem `student/anamnesis.tsx` e
`students/anamnesis.tsx`, nenhuma em `assessment/`. O `as never` transformou um erro de
compilação em botão morto.

**Correção:** varrer as 33 chamadas contra a árvore real, consertar os destinos, e trocar por
`ROUTES` (já existe em [navigation/types.ts:1](../../app/src/navigation/types.ts#L1),
subutilizado). Regra de lint proibindo `as never` em `app/src`.

#### DT-12 · Acessibilidade sem cobertura em nenhuma das duas pontas · **Novo** · G

| Plataforma | Medida |
|---|---|
| Mobile | 844 `TouchableOpacity`/`Pressable` · **2** `accessibilityLabel` |
| Web | 183 `<button>` sem `type` · 57 `<input>` sem label · regras de a11y desligadas (DT-06) |

**Efeito:** o app é inoperável com TalkBack/VoiceOver. Para um SaaS de saúde vendido no
Brasil isso é exposição real, não só qualidade.

**Correção:** `accessibilityLabel` e `accessibilityRole` nos componentes compartilhados de
`components/ui` primeiro (pega a maior parte por herança), regras de a11y do Biome religadas
no web, e a skill `web-design-guidelines` rodada sobre o dashboard.

---

### 🟡 Média — atrito diário e risco de regressão

#### DT-13 · 500 linhas de PDF mortas e `@/lib/utils` ambíguo · **Novo** · P

- `web/src/lib/utils/exportDietPDF.ts` (256 linhas) — **nenhum import**. O vivo é `shared/utils/exportDietPDF.ts` (324 linhas).
- `web/src/lib/utils/exportPeriodizationPDF.ts` **e** `web/src/shared/utils/exportPeriodizationPDF.ts` (249 + 251 linhas) — **nenhum dos dois é importado**. 500 linhas totalmente mortas.
- `cn` existe idêntico em `web/src/lib/utils.ts` e `web/src/shared/utils/cn.ts`; 6 arquivos usam o primeiro, 3 o segundo.
- Coexistem `web/src/lib/utils.ts` **e** `web/src/lib/utils/` — `@/lib/utils` resolve para o arquivo hoje, e passa a resolver para o diretório no dia em que alguém criar `utils/index.ts`.

**Correção:** apagar `lib/utils/` inteiro, manter `cn` só em `shared/utils/`, reapontar os 6 imports.

#### DT-14 · A marca antiga vai no PDF que o aluno recebe · **Novo (ADR-006)** · P

O PDF de dieta **em uso** carrega a marca anterior:

- [shared/utils/exportDietPDF.ts:118-124](../../web/src/shared/utils/exportDietPDF.ts#L118-L124) — cabeçalho `"MEU"` + `"PERSONAL"`
- [:318](../../web/src/shared/utils/exportDietPDF.ts#L318) — rodapé `AUTENTICADO POR MEUPERSONAL ENGINE`

E mais:

| Local | Ocorrência |
|---|---|
| [WorkoutShareCard.tsx:32](../../app/src/components/workout/WorkoutShareCard.tsx#L32) | `MEU PERSONAL` no card compartilhado em rede social |
| [ForgotPasswordScreen.tsx:26](../../app/src/modules/auth/screens/ForgotPasswordScreen.tsx#L26) | deep link `meupersonal://reset-password` — **conflita com `"scheme": "elevapro"`** do `app.json` |
| [ai/workout/batch:74](../../web/src/app/api/ai/workout/batch/route.ts#L74), [negotiate:69](../../web/src/app/api/ai/workout/negotiate/route.ts#L69) | prompt diz `app "Meu Personal"` — o modelo pode repetir isso ao aluno |
| `pending-approval` (web e mobile) | `suporte@meupersonal.app` |

O link de recuperação de senha é o mais grave: o esquema declarado é `elevapro`, então o
`redirectTo` provavelmente não volta para o app.

**Correção:** varredura única + teste de fluxo de recuperação de senha no device.

#### DT-15 · Modelos de IA cravados em 8 rotas, com `ai.config.ts` ignorado e zero telemetria · **Novo** · M

Existe [ai.config.ts](../../web/src/modules/ai/ai.config.ts) declarando `reasoning` e `fast`.
As 8 rotas que chamam o SDK direto **não o usam** — repetem o id do modelo na mão:

```
claude-sonnet-4-6            body-scan, student/scan-food
claude-haiku-4-5-20251001    adherence, assistant, recipe, nutribot, workout/batch, workout/negotiate
```

Nenhum lugar lê `response.usage` — não há registro de `input_tokens`/`output_tokens`. Trocar
de modelo hoje é editar 10 arquivos, e não existe número de custo por conta ou por rota.

**Nota:** `claude-sonnet-4-6` está atrás da geração atual (família Claude 5). Vale revisar a
escolha de modelo junto com a centralização, não antes.

**Correção:** todas as rotas passam por `ai.config.ts`; middleware que grava
`{ rota, conta, modelo, input_tokens, output_tokens }`. É esse número que torna o DT-05
ajustável em vez de chutado.

#### DT-16 · 21 arquivos acima do limite de 500 linhas · **Novo** · G

| Arquivo | Linhas |
|---|---|
| [PhaseDetailsScreen.tsx](../../app/src/modules/workout/screens/PhaseDetailsScreen.tsx) | 1.254 |
| [DietDetailsScreen.tsx](../../app/src/modules/nutrition/screens/DietDetailsScreen.tsx) | 1.084 |
| [PostureAnalysis.tsx](../../app/src/modules/assessment/screens/PostureAnalysis.tsx) | 764 |
| [FoodSearchScreen.tsx](../../app/src/modules/nutrition/screens/FoodSearchScreen.tsx) | 759 |
| [workoutStore.ts](../../app/src/modules/workout/store/workoutStore.ts) | 733 |
| [StudentNutritionScreen.tsx](../../app/src/modules/nutrition/screens/StudentNutritionScreen.tsx) | 732 |
| +15 outros | 501–663 |

63 arquivos passam de 300 linhas. 18 dos 21 maiores estão no mobile — as telas do web foram
quebradas, as do mobile não.

**Correção:** não refatorar em bloco. Regra: arquivo acima de 500 linhas que for tocado por
qualquer motivo sai do PR abaixo de 500. Guarda de lint avisando (não bloqueando) a partir de 500.

#### DT-17 · A regra de estilização do mobile não tem guarda e é violada em 77 arquivos · **#16 ampliado** · G

`CLAUDE.md`: *"Estilização: só NativeWind com tokens do design system. StyleSheet e inline
proibidos."*

| Violação | Ocorrências |
|---|---|
| `style={{ ... }}` inline | **379**, em 77 arquivos |
| `StyleSheet.create` | 8 arquivos, incluindo `TabBar.tsx` e `LiveWorkoutOverlay.tsx` |
| Hex cravado | **879** no mobile (58 no web) |

E o conflito de cor primária segue: [tailwind.config.js:11](../../app/tailwind.config.js#L11)
sobrescreve `primary` com `tailwindColors.primary` de `src/constants/colors.ts`, enquanto
`src/global.css:83` define `--primary: 84 100% 50%` (lime `#CCFF00`). `bg-primary` e
`var(--color-primary)` devolvem cores diferentes na mesma tela.

**Correção:** resolver o conflito de token primeiro (uma fonte só), depois converter por
módulo, com regra de lint proibindo `style={{}}` e hex literal em `app/src` ligada ao final
de cada módulo convertido.

#### DT-18 · 24 imports módulo→módulo no mobile · **Novo** · M

Proibido pelo `CLAUDE.md`; o web tem **zero**, o mobile tem 24. Os piores:

```
nutrition/services/AnalysisService.ts   → @/modules/ai
workout/services/WorkoutAIService.ts    → @/modules/ai/services/AssistantService
students/screens/StudentAnamnesisScreen → @/modules/assessment/data + services + types
ai/components/PlanProposalCard.tsx      → @/modules/workout/store/workoutStore
```

Nove são `@/modules/auth/store/authStore` — o `authStore` virou dependência global de fato.
Outros seis são um módulo importando **a si mesmo** por caminho absoluto em vez de relativo.

**Correção:** `authStore` (ou o pedaço dele que interessa) sobe para `shared/`. Os cruzamentos
reais passam pelo `index.ts` do módulo de destino. Os auto-imports viram relativos.
Regra de lint `noRestrictedImports` fechando a porta.

#### DT-19 · 335 `console.*` e nenhum logger · **Novo** · P/M

266 no mobile, 70 no web (fora de teste). `CLAUDE.md` pede *"JSON estruturado para
observabilidade"* — não existe logger nenhum nas duas bases.

**Efeito:** um erro em produção não deixa rastro consultável. Como boa parte do `catch`
apenas loga (289 blocos `catch` no total), falha silenciosa é o modo de falha padrão.

**Correção:** `shared/src/logger.ts` com nível e saída JSON no servidor; substituição
mecânica; regra `noConsole` ligada com exceção só para scripts de CLI.

#### DT-20 · Rotas do mobile duplicadas e sobras do template Expo · **Novo** · M

Três caminhos para executar treino, dois para anamnese, dois para detalhe de treino:

```
(tabs)/workouts/execute/[id].tsx   student/execute-workout.tsx   student/workout-execute/[id].tsx
student/anamnesis.tsx              students/anamnesis.tsx
(tabs)/workouts/[id].tsx           workouts/[id].tsx  (raiz, 636 linhas)
```

Mais o template nunca removido: `modal.tsx`, `+html.tsx`, `EditScreenInfo.tsx`,
`useClientOnlyValue.ts`/`.web.ts`, `useColorScheme.web.ts` — este último num app cujo
`package.json` desabilita o alvo web explicitamente.

**Efeito:** deep link ambíguo, e a próxima correção de bug de execução de treino tem 1/3 de
chance de cair no arquivo certo.

**Correção:** mapear qual caminho é o vivo (cruzar com os 33 `router.push` do DT-11), apagar
os mortos, apagar as sobras do template.

#### DT-21 · Cinco hooks reimplementados em paralelo nas duas plataformas · **Novo** · M

`useWorkouts`, `useWorkoutMutations`, `useNutrition`, `useExercises`, `useExerciseMutations`
existem com o mesmo nome em `app/src/hooks/` e `web/src/shared/hooks/`, com implementações
independentes sobre as mesmas tabelas.

**Efeito:** cada mudança de regra de negócio precisa ser feita duas vezes, e ninguém é
avisado quando só uma foi feita. É o DT-08 se repetindo numa camada acima.

**Correção:** a lógica de query desce para `shared/src/services` (que já existe e já é o
padrão para students/auth/workouts/nutrition/gamification); os hooks viram cascas finas de
TanStack Query sobre o serviço.

#### DT-22 · Toolchain divergente entre os três workspaces · **Novo** · M

| | raiz | `app/` | `web/` |
|---|---|---|---|
| TypeScript | `~5.9.2` | `~6.0.3` | `^5` |
| React | — | `19.2.3` | `19.2.0` |
| Tailwind | — | `3.4.18` | `4` |
| Biome | `^2.3.11` | `2.4.10` | `2.4.10` |

Três `package-lock.json`, três `npm ci` no CI, nenhum `workspaces` no `package.json` da raiz
— apesar do [ADR-002](../decisions/002-flat-monorepo.md) e de `shared/` ser compilado dentro
dos dois.

**Efeito:** `app/` compila com um TypeScript major à frente do que a raiz lint. O mesmo código
de `shared/` é verificado por dois compiladores diferentes. Tailwind 3 e 4 têm sintaxe de
tema incompatível, o que alimenta o DT-17.

**Correção:** alinhar TypeScript e React nos três; migrar o mobile para Tailwind 4 junto do
DT-17; avaliar `npm workspaces` num ADR próprio (não decidir dentro deste PRD).

#### DT-23 · Schema Drizzle atrás do banco em 4 colunas e na nulabilidade · **#40** · P

`training_periodizations.level`/`duration_weeks` e `training_plans.duration_weeks`/`focus`
vieram na `0004` e nunca entraram em `shared/src/database/schema/workouts.ts`. Pior: o
`start_date` das duas tabelas é `NOT NULL` no banco (`0024`) e nulável no schema — um insert
que o tipo aceita, o banco recusa.

**Correção:** resolvido de graça pelo DT-03 se `database.types.ts` virar a fonte única e o
Drizzle for verificado contra ele no CI.

#### DT-24 · 59 `select("*")` · **Novo** · M

Incluindo `profiles` ([auth.service.ts:141](../../shared/src/services/auth.service.ts#L141)) e
`physical_assessments`
([assessments/route.ts:84](../../web/src/app/api/students/%5Bid%5D/assessments/route.ts#L84)) —
tabela sensível pela `LGPD_COMPLIANCE.md`.

**Efeito:** duplo. Tráfego desnecessário, e — o que importa — dado de saúde saindo do banco
para camadas que não pediram por ele. `specialistContextLoader.ts` já foi corrigido
exatamente por isso (#32); os outros 58 não.

**Correção:** priorizar os que tocam tabela sensível (`physical_assessments`,
`student_anamnesis`, `workout_sessions`, `diet_logs`, `health_daily_metrics`), com
`/lgpd-check` antes. Guarda em `check-column-refs.js` recusando `select("*")` nessas cinco.

#### DT-25 · Bucket das fotos de body scan sem política versionada · **#24** · M · **LGPD**

`body_scans` tem RLS; o arquivo no Storage não. Se a URL vazar, a foto vaza.

#### DT-26 · Não existe caminho de exportação nem de exclusão de dados · **Novo** · G · **LGPD**

Varredura por `deleteAccount`, `anonymize`, exportação de dados: **nada**. Não há rota, tela
ou RPC que atenda os direitos do titular do art. 18 da LGPD — acesso, portabilidade,
eliminação — num produto que guarda anamnese, avaliação física, fotos corporais e métricas
de saúde diárias.

O único vestígio é
[admin/users/[id]/page.tsx:435](../../web/src/app/admin/users/%5Bid%5D/page.tsx#L435):
`// TODO: Implement delete`.

**Correção:** invocar `/lgpd-check` e escrever PRD próprio. Este item é grande demais para ser
uma linha aqui — mas precisa aparecer no inventário, porque é bloqueador de lançamento
comercial, não dívida de código.

#### DT-27 · iOS nunca foi buildado · **#15** · G

`app/ios` não existe. O caminho HealthKit, o `background delivery` e as permissões declaradas
no `app.json` seguem sem uma única verificação em device.

#### DT-28 · `/api/students/[id]` contorna a imutabilidade de `physical_assessments` · **#26** · P

A rota faz UPDATE via `service_role`, atravessando a regra que a RLS impõe ao cliente.

#### DT-29 · Cadastro público cria especialista já ativo e verificado · **#30** · P

`email_confirm: true` e `account_status: 'active'` — sem verificação de e-mail e pulando a
aprovação que o `/admin` implementa.

#### DT-30 · 13 consultas ainda descartam o `error` · **Novo / #10 parcial** · P

Seis são as rotas do DT-07. As outras sete incluem
[useStudentDashboardData.ts:63](../../web/src/modules/student-dashboard/hooks/useStudentDashboardData.ts#L63),
[useStudentProfile.ts:16](../../web/src/modules/students/hooks/useStudentProfile.ts#L16),
[chatService.ts:164](../../web/src/modules/ai/services/chatService.ts#L164) e
[anamnesisService.ts:66](../../app/src/modules/assessment/services/anamnesisService.ts#L66) —
todas em caminhos que devolvem "vazio" quando deveriam devolver erro. É a assinatura exata
das dívidas #10, #36 e #44.

**Correção:** regra de lint recusando `const { data } = await` quando a expressão é
`supabase.*` ou `client.auth.*`.

---

### 🟢 Baixa — limpeza

| # | Item | Evidência |
|---|---|---|
| DT-31 | 16 arquivos nunca importados | `streakService.ts`, `useVoiceChat.ts`, `DeleteStudentModal.tsx`, `card.tsx`, `AchievementBadge.tsx`, `BodyHeatmap2D.tsx`, `WeeklyBarChart.tsx`, `SupabaseStorageService.ts`, `proxy.ts`, `lib/constants/meals.ts`, +6 |
| DT-32 | `app/src/lib/supabase.ts` deprecado ainda importado por 4 arquivos; `setSupabaseStorage` é no-op documentado | [client.ts:73](../../app/src/packages/supabase/client.ts#L73) |
| DT-33 | `app/src/store/gamificationStore.ts` tem 2 linhas e duplica `modules/gamification/store` | — |
| DT-34 | `--forceExit` no pre-push mascara handles abertos (o Jest avisa a cada run) | `.husky/pre-push` |
| DT-35 | 44 alimentos com `category` NULL | #41 |
| DT-36 | 10 periodizações com data corrompida (ano de 5 dígitos) | #18 |
| DT-37 | `useProgressionAnalysis` monta, itera e descarta (`void effectiveItem`) | #35 |
| DT-38 | Barra de XP sem fonte de dados; sparklines inexistentes; `CreateWorkoutModal` com casca própria | #8, #19, #20 |
| DT-39 | 86 `biome-ignore` — 46 em `suspicious/*`, 26 em `correctness/*` (4 são o DT-01) | — |
| DT-40 | 6 tabelas removidas do código podem ser features legítimas nunca feitas | #14 |

---

## Escopo

### Incluído

- As cinco dívidas críticas (DT-01 a DT-05), inteiras
- As sete dívidas altas (DT-06 a DT-12), inteiras
- Média: DT-13 a DT-24 e DT-28 a DT-30
- Baixa: DT-31 a DT-34 e DT-39 (limpeza mecânica, entra de carona)
- Uma guarda automatizada nova para cada classe de defeito quitada

### Fora do escopo (explicitamente)

- **DT-26 (exportação/exclusão LGPD)** — entra no inventário porque é bloqueador de
  lançamento, mas é feature, não dívida. PRD próprio, precedido de `/lgpd-check`.
- **DT-27 (build iOS)** — decisão de produto sobre plataforma, não de dívida técnica.
- **DT-25 (política do bucket)** — pertence ao `rls-security-hardening`, que já está aberto.
- **DT-35, DT-36, DT-40** — dependem de decisão de produto (curadoria de alimentos, o que
  fazer com registros corrompidos, quais das 6 tabelas são features reais).
- **`npm workspaces`** — mudança estrutural de monorepo merece ADR próprio.
- **Reescrever os 21 arquivos gigantes de uma vez.** O DT-16 é uma regra de manutenção
  contínua, não um mutirão.

---

## Fluxo de dados

```
Auditoria (grep + tsc + coverage + diff)
  → Inventário DT-01..DT-40 (este PRD)
  → Fase por fase, um PR por fase
  → Cada PR: correção + teste de regressão + guarda automatizada
  → docs/STATUS.md: dívida riscada com o PRD e a guarda que a fecha
  ← A guarda impede a recorrência (foi assim que #7, #10, #21 e #27 foram fechadas)
```

## Fases

Ordenadas por *o que destrava o quê*, não por severidade pura.

| Fase | Conteúdo | Por que nesta ordem |
|---|---|---|
| **0 — Parar o sangramento** | DT-02, DT-01, DT-04 | Produção sem RLS, página que quebra, cadastro morto. Nada mais importa antes. |
| **1 — Fundação de tipos** | DT-03, DT-23 | Destrava tudo que vem depois: sem `Database` no mobile, cada correção posterior é feita no escuro. |
| **2 — Fechar as guardas** | DT-06, DT-07, DT-09 (thresholds + `shared/src/services`), DT-10, DT-30 | Antes de limpar, garantir que a sujeira não volta. Cobertura em `shared/services` primeiro — é o código que as duas plataformas compartilham. |
| **3 — Unificar o compartilhado** | DT-08, DT-21, DT-22 | CASL, hooks e toolchain. Aqui a divergência entre plataformas acaba. |
| **4 — Custo e observabilidade** | DT-05, DT-15, DT-19 | Rate limit precisa do registro de tokens para ser calibrado, que precisa de logger. |
| **5 — Superfície do produto** | DT-14, DT-11, DT-20, DT-12 | Marca, navegação, rotas e acessibilidade — o que o usuário final encontra. |
| **6 — Higiene** | DT-13, DT-17, DT-18, DT-24, DT-28, DT-29, DT-31–34, DT-39, DT-16 (regra contínua) | Limpeza, agora sob todas as guardas das fases 2 e 3. |

## Guardas a criar

Cada uma fecha uma classe inteira, não uma ocorrência. É o padrão que já funcionou:
`check-column-refs.js` nasceu do #10 e impediu a recorrência.

| Guarda | Fecha | Onde |
|---|---|---|
| `db:types` + diff contra o banco | DT-03, DT-23 | CI + pre-commit |
| `coverageThreshold` / `thresholds` | DT-09 | jest + vitest |
| `noExplicitAny`, `useExhaustiveDependencies`, 6 regras de a11y religadas | DT-06, DT-12 | `biome.json` |
| `check-api-auth.js` exigindo `api-auth` em **toda** rota `/api/` | DT-07 | CI + pre-commit |
| Lint: `const { data } = await supabase*` proibido | DT-30 | Biome custom |
| Lint: `as never` proibido em `app/src` | DT-11 | Biome |
| Lint: `noRestrictedImports` módulo→módulo no mobile | DT-18 | Biome |
| Lint: `style={{}}` e hex literal proibidos em `app/src` | DT-17 | Biome |
| Lint: `noConsole` fora de scripts | DT-19 | Biome |
| Job `web-build` (`next build`) | DT-10 | CI |
| Job Maestro noturno contra o preview | DT-10 | CI |
| `check-column-refs.js` recusando `select("*")` em tabela sensível | DT-24 | CI + pre-commit |
| Aviso (não bloqueio) acima de 500 linhas | DT-16 | CI |

## Tabelas do banco envolvidas

| Tabela | Operação | Observação |
|--------|----------|------------|
| todas (34 migrations) | DDL | DT-02: aplicar `0016`–`0033` em produção |
| `profiles` | SELECT | DT-24: `select("*")` em `auth.service.ts:141` |
| `physical_assessments` | SELECT, UPDATE | DT-24 (`select("*")`), DT-28 (UPDATE por `service_role`) — **sensível** |
| `student_anamnesis` | SELECT | DT-24 — **sensível** |
| `workout_sessions`, `diet_logs`, `health_daily_metrics` | SELECT | DT-24 — **sensíveis** |
| `body_scans` | SELECT | DT-25: arquivo no Storage sem política |
| `training_periodizations`, `training_plans` | — | DT-23: schema Drizzle atrás em 4 colunas |
| `students` (via Edge Function) | INSERT | DT-04: função inexistente |

Nenhuma tabela nova, nenhuma coluna nova. **`/lgpd-check` não é bloqueador deste PRD** —
exceto para o DT-26, que está fora do escopo justamente por isso.

## Impacto em outros módulos

Todos. Por ordem de exposição:

- **`shared/`** — recebe `Database`, `abilities`, `getUserContextJWT`, `logger` e a lógica dos
  5 hooks duplicados. É onde o PRD mais mexe.
- **`app/` (mobile)** — recebe o maior volume: tipos, rotas, estilização, imports, acessibilidade.
- **`web/`** — DT-01, DT-06, DT-07 e a limpeza de código morto.
- **`/api/ai/*`** — 16 rotas passam a ter rate limit e telemetria.
- **CI** — dois jobs novos, cinco guardas novas.

## Decisões técnicas

**Por que corrigir a causa e não a ocorrência.** As dívidas #7, #10, #40 e #44 foram
fechadas uma a uma; todas eram o mesmo defeito (DT-03). Enquanto o cliente do mobile for
`any`, a quinta aparece. Por isso a fase 1 é fundação de tipos e não limpeza.

**Por que guardas antes de limpeza (fase 2 antes da 6).** Limpar sob lint frouxo é retrabalho
garantido. Religar `noExplicitAny` depois de remover os `any` significa que os próximos entram
livremente durante a limpeza.

**Por que `shared/src/services` é o primeiro alvo de teste.** É o código que as duas
plataformas executam. Um bug ali aparece duas vezes; um teste ali vale por dois. 7 dos 8
serviços sem teste é a pior relação risco/esforço da base.

**Por que DT-16 não é um mutirão.** 21 arquivos, ~14.000 linhas. Reescrever tudo de uma vez,
com 9% de cobertura no mobile, é trocar dívida conhecida por regressão desconhecida. A regra
"tocou, quebra" faz o mesmo trabalho distribuído e sob teste.

**Por que DT-26 fica de fora.** Direito do titular é feature de produto com fluxo, tela,
prazo legal e trilha de auditoria. Enfiar isso num PRD de dívida técnica entrega os dois mal.

## Métricas — antes e depois

| Métrica | Hoje | Meta |
|---|---|---|
| Cobertura web | 17,48% | ≥ 45% |
| Cobertura mobile | 9,06% | ≥ 30% |
| Cobertura `shared/src/services` | 1 de 8 com teste | ≥ 80% |
| `any` fora de teste | 12 | 0 |
| `as never` (mobile) | 157 | 0 |
| Regras do Biome desligadas no web | 9 | 0 |
| Rotas `/api/` sem `api-auth` | 8 | 0 |
| Rotas de IA sem rate limit | 16 | 0 |
| `const { data } = await` sem `error` | 13 | 0 |
| `console.*` fora de teste | 335 | 0 |
| `style={{}}` no mobile | 379 | 0 |
| Imports módulo→módulo (mobile) | 24 | 0 |
| Arquivos > 500 linhas | 21 | ≤ 5 |
| Arquivos nunca importados | 16 | 0 |
| `accessibilityLabel` (mobile) | 2 / 844 touchables | ≥ 1 por elemento interativo compartilhado |
| Ocorrências de "Meu Personal" | 8 arquivos | 0 |
| Jobs de CI | lint, typecheck, test | + build, + E2E |

## Checklist de done

- [ ] Código funciona e passou em lint + typecheck + testes
- [ ] Todas as guardas da tabela "Guardas a criar" estão no CI **e** no pre-commit
- [ ] Cada dívida quitada foi riscada em `docs/STATUS.md` com a guarda que a fecha
- [ ] PR mergeado em `development`
- [ ] `docs/features/technical-debt-remediation.md` criado
- [ ] `docs/STATUS.md` atualizado

---

## ⚠️ Pendências do Daniel — o que só você pode fazer

Tudo aqui está **fora** do que o agente executa: ou é ação em painel externo, ou
exige device físico, ou é decisão de produto. Marcado conforme for resolvido.

### 🔴 Bloqueadores — travam o resto do PRD

- [ ] **DT-02 · Aplicar as migrations `0016`–`0033` em produção.**
      18 migrations, incluindo as cinco que ligaram RLS em 18 tabelas, nunca
      chegaram ao banco de produção. Dois caminhos: merge `development` → `main`
      (dispara `supabase-migrations.yml` no environment `production`, que exige
      aprovação), ou `workflow_dispatch` na branch `main` para reverificar sem
      push. `db push` é forward-only e `verify-rls.sql` termina em `ROLLBACK`,
      então repetir é seguro.
      **Confirmar que o passo _Verificar RLS no ambiente_ passou verde.** Se ele
      falhar em produção e passar em preview, a causa provável é a diferença de
      `pg_default_acl` que a `0020` existe para resolver — não force, investigue.
      *Nenhuma fase seguinte deve ser mergeada antes disso: código novo contra
      schema velho quebra em runtime e não tem conserto rápido.*

- [ ] **DT-04 · Conferir se existe uma Edge Function `create-student` publicada.**
      O código já não a chama mais, mas se ela existir no projeto Supabase é
      código rodando com `service_role` que ninguém versiona nem revisa.
      Painel Supabase → Edge Functions. Se existir: **despublicar**.

### 🟠 Decisões de produto — preciso da sua resposta para seguir

- [ ] **DT-08 · O papel `member` deve gerenciar `Periodization`?**
      Hoje o mobile concede (`can('manage', 'Periodization')`) e o web não. Ao
      unificar o CASL em `shared/`, uma das duas semânticas vira a verdade. Não é
      decisão de código — é o que o produto oferece a quem treina sozinho.

- [ ] **RPC `create_student_account` — apagar ou implementar?**
      Achado fora do inventário original: `shared/src/services/auth.service.ts:106`
      chama `supabase.rpc("create_student_account")`, e essa função **não existe em
      nenhuma migration**. É o mesmo defeito do DT-04 num segundo caminho. Ou a
      RPC nasce numa migration, ou o método sai do serviço.

- [ ] **Vocabulário de `account_status`: mapear ou estender o enum?**
      Achado na Fase 1. O enum do banco é `active | inactive | invited`, e o
      código usava `pending`, `rejected` e `suspended` — três valores que nunca
      existiram. As consequências eram todas silenciosas:
      a lista de aprovações do `/admin` filtrava por `account_status = 'pending'`
      e **vinha sempre vazia** ("Tudo em dia!" mesmo com especialistas
      esperando); os botões *Suspender* e *Rejeitar* gravavam valores que o enum
      recusa com 22P02; o login do mobile bloqueava `rejected`/`suspended` e
      deixava **conta `inactive` entrar normalmente**; e o badge de status
      exibia todo usuário como "Ativo" pelo fallback.
      **Adotei o mapeamento para o enum existente** (`pending`→`invited`,
      `rejected`/`suspended`→`inactive`), que restaura o comportamento
      pretendido sem migration e é reversível. *Se você quiser os três estados
      de verdade* — separar "recusado" de "desativado", por exemplo — isso é
      migration + revisão de RLS, e vira decisão sua.

- [ ] **Colunas fantasma no `/admin` de conteúdo: remover da UI ou criar no banco?**
      Achado na Fase 1, mesma classe da dívida #10. `exercises` não tem
      `category`, `equipment`, `difficulty`, `instructions` nem `status`;
      `foods` não tem `status` nem `is_verified`. Os formulários mandavam esses
      campos no INSERT/UPDATE, então **criar e editar exercício e alimento pelo
      admin nunca funcionou** — o PostgREST recusava a escrita inteira com
      42703 e a tela mostrava "Falha ao salvar".
      **Removi os campos inexistentes da UI** e liguei o que a tabela realmente
      tem (`description`, `video_url`, `is_verified` em exercícios; `is_custom` e
      `source` em alimentos). Nenhum dado foi perdido: esses campos nunca
      chegaram a ser gravados. *Se categoria, equipamento e dificuldade forem
      features desejadas*, elas voltam como migration — e aí é decisão de
      produto, não de dívida.

- [x] **DT-31 · Código morto — decidido: apagar.** Daniel autorizou em
      2026-08-28 remover qualquer arquivo que não esteja sendo usado, sem
      perguntar caso a caso. O histórico do git guarda o que foi apagado, então
      o custo de errar é um `git revert`, e o custo de manter é ler código que
      não roda a cada varredura.
      **Regra permanente deste PRD:** arquivo comprovadamente não importado por
      nenhum caminho vivo pode ser apagado direto. "Comprovadamente" é o critério
      — a verificação (grep por todos os nomes de import, não só pelo caminho) é
      obrigatória antes de apagar; teste que só exercita código morto vai junto.

- [ ] **DT-35 / DT-36 / DT-40 (fora do escopo, mas represados):** curadoria dos 44
      alimentos com `category` NULL; o que fazer com as 10 periodizações de data
      corrompida (ano de 5 dígitos); quais das 6 tabelas removidas do código são
      features legítimas nunca feitas.

### 🟡 Verificações em device — teste unitário não cobre

Ao final da fase indicada, precisam de app rodando de verdade:

- [ ] **Fase 0 · Dashboard de nutrição.** Logar como especialista com **zero**
      alunos e cadastrar o primeiro. Antes, era exatamente esse passo que lançava
      *"Rendered more hooks than during the previous render"* e matava a página.
- [ ] **Fase 0 · Cadastro de aluno.** `CreateStudentScreen` no device → o aluno
      precisa aparecer no dashboard web.
- [ ] **Fase 5 · Recuperação de senha.** Pedir reset no device, abrir o link do
      e-mail e confirmar que **volta para o app**. O `app.json` declara
      `"scheme": "elevapro"` e o código mandava `meupersonal://reset-password` —
      o fluxo provavelmente está quebrado hoje.
- [ ] **Fase 5 · Deep links.** Um por fluxo consolidado, confirmando que abre a
      tela viva (hoje há 3 caminhos para executar treino e 2 para anamnese).
- [ ] **Fase 5 · Acessibilidade.** Navegação completa de um fluxo com TalkBack
      (Android) e VoiceOver (iOS). Hoje são 844 elementos tocáveis e 2
      `accessibilityLabel`.
- [ ] **Fase 4 · Rate limit.** Chamar uma rota de IA em loop com conta trial e
      confirmar o 429 e o registro de tokens.

### 🔧 Configuração de infra que eu não alcanço

- [ ] **Fase 2 · Secrets do job Maestro noturno.** O workflow novo roda contra o
      preview e precisa de credencial de conta de teste no environment. Sem isso
      ele entra vermelho na primeira madrugada.
- [ ] **Fase 2 · Branch protection.** Ao entrar o job `web-build`, conferir que o
      required status check continua sendo só o `ci-success` — ele já agrega os
      demais, mas o job novo precisa estar dentro da verificação dele.

### 📋 PRDs próprios a abrir depois (fora deste PRD)

- [ ] **DT-26 · Exportação e exclusão de dados (LGPD art. 18).** Não existe hoje
      rota, tela ou RPC que atenda acesso, portabilidade ou eliminação, num
      produto que guarda anamnese, avaliação física, fotos corporais e métricas de
      saúde diárias. **É bloqueador de lançamento comercial**, não dívida de
      código. Precedido de `/lgpd-check`.
- [ ] **DT-27 · Build iOS.** `app/ios` não existe; HealthKit e background delivery
      seguem sem verificação em device. Decisão de plataforma.
- [ ] **DT-25 · Política do bucket de body scan.** Pertence ao
      `rls-security-hardening`, que já está aberto.
- [ ] **`npm workspaces`.** Mudança estrutural de monorepo — merece ADR próprio,
      não decisão enfiada num PRD de dívida.

---

## 🔍 A conferir juntos — decisões tomadas durante a execução

Pontos em que precisei escolher para destravar o trabalho. Todos são
**reversíveis** e nenhum exigiu migration. Revisar antes de considerar o PRD
fechado.

### `account_status` — mapeei o código para o enum existente

**O que fiz:** `pending` → `invited`, `rejected`/`suspended` → `inactive`.

**Por quê:** o enum do banco é `active | inactive | invited` e sempre foi. Os
três valores que o código usava nunca existiram, e o efeito era silencioso em
todos os pontos: a lista de aprovações do `/admin` filtrava por `pending` e vinha
sempre vazia, os botões *Suspender* e *Rejeitar* gravavam valor recusado com
22P02, o login do mobile deixava conta `inactive` entrar, e o badge exibia todo
usuário como "Ativo" pelo fallback.

O mapeamento restaura o comportamento pretendido **sem migration** e não toca em
dado nenhum.

**A decisão que fica com você:** se os três estados forem semanticamente
distintos no produto — separar "recusado na aprovação" de "desativado depois",
por exemplo —, aí é **migration no enum + revisão de RLS** (as políticas hoje
comparam contra `active`), e provavelmente `/lgpd-check`, porque muda o que
significa uma conta inativa. Enquanto isso não for decidido, o mapeamento atual
é o comportamento correto.

**Arquivos afetados:** `LoginScreen.tsx`, `PendingApprovalScreen.tsx`,
`CreateDietScreen.tsx` (mobile); `PendingApprovalsList.tsx`, `admin/users/page.tsx`,
`admin/users/[id]/page.tsx`, `auth/pending-approval/page.tsx` (web).

### Cobertura de `shared/` não é medida — e o threshold de lá foi removido

**O que fiz:** deixei o piso de cobertura só onde ele é real — `web/src` (18%,
no `vitest.config.ts`) e `app/src` (9%, no `jest.config.js`), os dois verificados
falhando de verdade abaixo do degrau.

**O que não deu:** o alvo prioritário do DT-09 é `shared/src/services` a 80% —
é o código que as duas plataformas executam, e 7 dos 8 serviços não têm teste.
Os testes de `shared/` **rodam** na suíte do web (o `include` do vitest os traz),
mas o provider v8 descarta da *medição* qualquer arquivo fora da raiz do Vite.
Um threshold apontado para `../shared/src/services/**` casa com zero arquivo e
passa sempre. Tentei `allowExternal: true` e o relatório inteiro foi a 0%.

Cheguei a configurar esse threshold antes de testar, e ele passou verde — foi
só ao forçá-lo a 95% que ficou claro que não media nada. **Removi**, porque
guarda que não pode falhar é pior que guarda nenhuma: dá a sensação de cobertura
sem cobrir.

**A decisão que fica com você:** medir `shared/` exige runner próprio para ele
(projeto separado do vitest, ou mover a raiz). É trabalho de configuração, não
de teste, e muda como o CI roda as duas suítes — por isso não decidi sozinho.
Enquanto isso, escrever os testes dos 7 serviços continua valendo: eles rodam e
protegem, só não entram no número.

### `member` × `Periodization`: resolvido pela RLS, não por decisão de produto

**O que fiz:** unifiquei o CASL na versão do web — `member` **não** gerencia
`Periodization`.

**Por quê:** a pergunta estava listada como decisão de produto, mas o banco já a
tinha respondido. A migration `0018` cria duas políticas em
`training_periodizations`: `periodizations_specialist_manage` (FOR ALL, onde
`specialist_id = auth.uid()`) e `periodizations_student_read` (**FOR SELECT**,
onde `student_id = auth.uid()`). O member só lê.

Conceder no CASL o que a RLS recusa não dá acesso — dá **botão que falha em
silêncio**, porque RLS não devolve erro, devolve zero linha. É exatamente o modo
de falha que este PRD inteiro persegue.

**A decisão que fica com você:** se o produto quiser mesmo que o member gerencie
a própria periodização, o caminho é migration criando a política de escrita
(algo como `student_id = auth.uid() AND specialist_id IS NULL` — a coluna já é
nulável desde a `0011`, e `studentCoachService` já grava assim via
`service_role`). Aí a linha no CASL volta, com a barreira real por trás. Não é
uma linha de permissão: é uma política.

### Dois hooks do mobile são código morto

`app/src/hooks/useWorkouts.ts` e `useWorkoutMutations.ts` não são importados por
nenhuma tela — só pelo próprio teste. Descobri ao atacar o DT-21: não dá para
"unificar" duplicação que não roda.

Não apaguei. É a mesma pergunta do DT-31 (feature abandonada ou não terminada?),
e apagar trabalho pela metade sem confirmar é decisão sua. Os hooks vivos —
`useExercises`, `useExerciseMutations` e `useNutrition` — já desceram para os
serviços compartilhados.

### Acessibilidade: o número do PRD estava subestimado, e por um motivo específico

O inventário falava em "183 `<button>` sem `type` e 57 `<input>` sem label" —
números de grep textual. Ao religar as regras, o Biome mostrou **20**. Pareceu
vitória fácil até eu perceber que 20 é exatamente o teto padrão de diagnósticos
da ferramenta. Com `--max-diagnostics=500`: **201**.

Todas corrigidas. A distribuição real foi outra: 113 SVGs decorativos sem
`aria-hidden`, 52 botões sem `type`, 26 rótulos sem controle associado.

**O achado que não era só conformidade:** os dias do `DatePicker` eram
`<div onClick>`. Sem `tabIndex`, sem `onKeyDown`, sem role — **quem navega por
teclado não conseguia escolher uma data**, em nenhum formulário do dashboard.
Viraram `<button>` com `aria-label` por extenso e `disabled` nos dias fora do
mês. Isso não é etiqueta de acessibilidade; é um campo que não funcionava.

Também saíram: um `role="link"` num `<tr>` que prometia ao leitor de tela um
controle que o HTML não entrega, e seis `<label>` de exibição no `/admin` que
anunciavam campos inexistentes (viraram `<dl>`/`<dt>`/`<dd>`).

**O que fica:** o mobile tem ~700 `TouchableOpacity` escritos direto nas telas.
Ataquei a raiz — `Button` agora deriva o rótulo do `label` que já recebe, e
`IconButton` exige `accessibilityLabel` no tipo (o compilador apontou os 10 usos)
—, mas os toques avulsos nas telas continuam mudos. É trabalho por tela, e o
próximo passo honesto é medir com TalkBack antes de sair anotando.

### O que sobrou da Fase 6, e por quê

Três itens **não** foram feitos, e nenhum por falta de tempo — cada um esbarra
numa decisão que não é minha:

**DT-17 · Estilização do mobile (379 `style={{}}`, 879 hex, Tailwind 3→4).**
O PRD manda resolver o conflito de token primeiro: `tailwind.config.js`
sobrescreve `primary` com o valor de `src/constants/colors.ts`, enquanto
`global.css` define `--primary` como o lime `#CCFF00`. `bg-primary` e
`var(--color-primary)` devolvem cores diferentes na mesma tela — então converter
antes de decidir qual é a verdadeira é converter para o valor errado. E a
migração do Tailwind 3 para o 4 muda a sintaxe de tema inteira. É trabalho de
design system com decisão de marca dentro, não limpeza mecânica.

**DT-18 · Os 17 imports módulo→módulo restantes.** Sete apontam para
`auth/store/authStore`. Movê-lo para `shared/` arrasta Zustand para lá e abre
risco de ciclo com os serviços — é decisão de arquitetura. A catraca
(`app:check-modules`) impede que o número cresça enquanto isso não é decidido.

**DT-29 · `email_confirm: true` no cadastro público.** A metade do
`account_status` foi resolvida (migration `0034`). Desligar a confirmação
automática exige SMTP configurado em produção, e não tenho como verificar isso
daqui — se não estiver, ninguém mais consegue se cadastrar.

### Um ajuste no inventário

O PRD dizia que `student/anamnesis` e `students/anamnesis` eram rotas
duplicadas. **Não são.** Uma é o aluno preenchendo a própria anamnese
(`AdaptiveAnamnesisScreen`/`AnamnesisWizardScreen`), a outra é o especialista
consultando a do aluno (`StudentAnamnesisScreen`), alcançada pelo
`StudentDetailsScreen`. São features distintas com caminhos parecidos demais —
o que é um problema de nomenclatura, não de duplicação.

### Testes de `shared/src/services` — feito, com uma ressalva

Os 8 serviços passaram de 1 arquivo de teste para 9, com 92 casos. Era o alvo
prioritário do DT-09 e ficou de fora da Fase 2 na primeira passada.

O que destravou foi um duplo do cliente Supabase (`__tests__/supabaseFake.ts`).
Sem ele, cada arquivo remontava o encadeamento do PostgREST em 40 linhas de
mock — e testava o mock, não o serviço. Duas decisões fazem ele valer: a
resposta é fixada no `.from()` e não quando a promise resolve (senão o
`Promise.all` de sete consultas do briefing daria teste intermitente), e tudo
que foi chamado fica registrado — tabela, colunas, payload —, que é como um
teste pega `select("*")` em tabela sensível.

**Escrever os testes achou mais um bug da família do DT-23.**
`createPeriodization` e `createTrainingPlan` declaravam `start_date` e
`end_date` opcionais e mandavam `null`; as duas colunas são NOT NULL desde a
`0024`/`0025`. Eu tinha corrigido os *chamadores* na Fase 1 e deixado passar a
raiz. Agora o tipo exige as datas, e o compilador apontou os call sites — foi
assim que apareceu também o campo "Observações" do modal de periodização, que
o formulário coletava e o serviço descartava em silêncio, porque
`training_periodizations` não tem coluna `notes`.

**A ressalva:** esses 92 testes rodam e protegem, mas **não entram no número de
cobertura**. O provider v8 descarta arquivo fora da raiz do Vite, e medir
`shared/` exige runner próprio para ele — trabalho de configuração que muda como
o CI roda as duas suítes, e que continua pendente.
