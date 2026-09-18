# CLAUDE.md — Eleva Pro

SaaS para Personal Trainers. Trial → assinatura Stripe/Asaas. Target: Abril 2026.

---

## Stack (trancada)

| Camada | Decisão |
|---|---|
| Mobile | React Native + Expo + Expo Router |
| Web | Next.js 16 (App Router) |
| Estado global | Zustand + MMKV |
| Estado servidor | TanStack Query |
| Backend | Supabase (PostgreSQL + Auth + Storage) |
| ORM | Drizzle ORM + drizzle-kit |
| Estilização | Tailwind CSS / NativeWind |
| Acesso | CASL (frontend) + RLS (banco) |
| Linting | Biome 2.4.10 (`/biome.json`) |
| Testes | Jest (mobile) · Vitest (web) |

---

## Estrutura do projeto

```
/app   → React Native (Expo)
/web   → Next.js dashboard
/docs  → Documentação
```

Cada feature vive em `src/modules/<feature>/`:
```
components/  hooks/  services/  store/  screens/  types.ts  index.ts
```

**Regras de import:**
```
✅ Módulo → shared/ | @elevapro/core | @elevapro/supabase
✅ Screen → Módulo (via index.ts)
❌ Módulo → Módulo direto
❌ shared/ → Módulo
```

**Path aliases — discrepância não-óbvia:**
- Mobile: `@/workout` → `modules/workout` (singular)
- Web:    `@/workout` → `modules/workouts` (plural)

**Naming:** pastas `lowercase` · componentes `PascalCase` · hooks `useXxx` · stores `xxxStore` · services `XxxService` · tipos `PascalCase`

**Idioma (ADR-0027):** identificador em inglês — tabela, coluna, enum, contrato, função,
tipo, componente, arquivo. Texto para gente em português — interface, comentário,
docs, commits. Ao tocar um arquivo com identificador em português, renomeie para inglês
o que a mudança já alcança.

---

## Code Style

- Funções: 4–20 linhas. Arquivos: < 500 linhas. Uma responsabilidade por módulo (SRP).
- Nomes específicos — evitar `data`, `handler`, `Manager` (< 5 grep hits no codebase).
- Tipos explícitos. **Nunca `any`** — use interface ou `unknown`.
- **Módulos de validação:** separe constantes, mensagens, schemas, tipos inferidos e funções de validação em arquivos por responsabilidade. Exponha apenas o necessário por um `index.ts`; telas e rotas não importam detalhes internos.
- Zero duplicação. Early returns. Máx 2 níveis de indentação.
- Mensagens de exceção incluem o valor ofensor e o formato esperado.
- Comentários: escreva o **porquê**, nunca o quê. Preserve em refatorações.
- Docstrings em funções públicas: intenção + exemplo de uso.
- Logging: JSON estruturado para observabilidade; texto simples para CLI.
- Formatador: Biome. Testes: todo serviço crítico ganha teste; bug fix ganha regressão.
- **Profundidade > tamanho.** Módulo bom é muito comportamento atrás de interface
  pequena. `< 500 linhas` não salva um módulo raso — 15 métodos que só repassam
  chamada continuam sendo dívida. Ao desenhar, perguntar: dá pra tirar um método?
  simplificar um parâmetro? esconder mais complexidade lá dentro?
- **Teste da deleção.** Apagar o módulo faz a complexidade sumir? Era passagem.
  Faz ela reaparecer em N chamadores? Estava se pagando.
- **Seam só existe quando algo varia.** Um adapter é seam hipotético; dois
  adapters é seam real. Não abstrair antes do segundo.
- **Testes batem na interface, nunca no interno.** Nada de mockar colaborador
  privado nem de conferir pelo banco o que a interface já expõe. O seam sob teste
  é acordado no PRD antes de codar — teste fora dele não entra.

---

## Regras não-óbvias por plataforma

**Mobile:**
- Estilização: só NativeWind com tokens do design system. StyleSheet e inline proibidos.
- Cor vem de `@/shared/design`. Em `className`, o token (`bg-primary`); em prop que
  não aceita classe, `useCores()`. Hexadecimal à mão falha no pre-commit (ADR-0025).
- **Medida é relativa, nunca pixel fixo.** O kit foi desenhado num telefone de 390pt
  e o aparelho de teste tem 448×997dp: pixel fixo não acompanha e o desenho aparece
  menor, com faixa vazia embaixo. Em classe, `rem` — `h-[3.125rem]`, não `h-[50px]`;
  o `metro.config.js` desliga o inline do `rem` para ele resolver em runtime. Em prop
  numérica (`size` de ícone), `useEscala()`. Fio de `0.5px` e borda de `1px` seguem
  em pixel: são constante do aparelho, e engrossariam numa tela grande.
- Ícones: `@expo/vector-icons`, e Lucide (`lucide-react-native`) na navegação — barra
  de abas, menu do + e botão redondo de cabeçalho —, onde o kit desenha o traço fino.
  Import ícone por ícone (`lucide-react-native/icons/house`): o Metro não faz
  tree-shaking, e o import do pacote leva os ~1.800 ícones para o bundle.
- Rotas: `router.push(ROUTES.X)` — nunca string literal solta.

**Web:**
- Server Component é o padrão. `'use client'` só com `useState`/`useEffect`/event handlers.
- Toda query passa pelo service do módulo — nunca Supabase inline em componente.
- TanStack Query (client) só para mutations, polling ou estado otimista.
- Fetches independentes: `Promise.all()`.
- UI compartilhada mora só em `web/src/shared/components/ui/`. **Procurar lá antes de
  criar componente** — já nasceram três tabelas duplicadas por não olhar primeiro.
- Classe do Tailwind precisa aparecer literal no fonte. Montar `text-${tom}` ou
  `${bp}:${w}` em runtime produz classe que não existe no CSS.
- Data sempre pelo utilitário de `shared/utils/formatDate.ts`, nunca `format` do
  date-fns direto: ele lança com data inválida, e `new Date("2026-08-01")` é lido
  como UTC e volta um dia em fuso negativo.

**Acesso:** toda ação protegida precisa de CASL (UI) + RLS (banco). Roles: `admin`, `specialist`, `student` — enum `account_type`, fonte da verdade em `shared/src/types/auth.types.ts`. O Student tem Guidance derivada do vínculo: `self_guided` ("Praticante", o modo principal — desenhe para ele primeiro) ou `specialist` ("Aluno"). O código ainda grava `member` até a migração do ADR-0028.

---

## Bloqueadores

- **Issue:** nenhuma feature começa sem uma issue `ready-for-agent` no GitHub. Rodar
  `node scripts/new-feature.js <numero-da-issue>` para abrir a branch. Spec vira issue
  pelo `/to-spec`, nunca arquivo em `docs/` (ADR-0013).
- **LGPD:** parar e invocar `/lgpd-check` antes de qualquer novo campo, nova tabela ou acesso a dados de saúde. Tabelas sensíveis: `physical_assessments`, `student_anamnesis`, `workout_sessions`, `diet_logs`.
- **Nova tabela Supabase:** RLS + políticas + tipos TS + CASL + LGPD antes de qualquer dado entrar.
- **Commits:** `--no-verify` proibido. Pre-commit: Biome + tsc. Pre-push: testes.
- **Feature done:** lint + testes limpos · PR mergeado · issue fechada · ADR em `docs/adr/`
  se houve decisão difícil de reverter que o código não explica — e nada, se não houve.

---

## Documentação de referência

| Documento | Propósito |
|---|---|
| `CONTEXT.md` | Linguagem ubíqua — consultar ao nomear |
| Issues do GitHub | O que está sendo construído — `gh issue list` |
| `docs/LGPD_COMPLIANCE.md` | Mapa de dados e base legal |
| `docs/adr/NNNN-*.md` | Decisões estruturais (ADRs) |

---

## Agent Skills

| Skill | Quando |
|---|---|
| `vercel-react-best-practices` | Qualquer componente React / página Next.js. **Crítico.** |
| `web-design-guidelines` | Revisão de UI. |
| `lgpd-check` | Novo schema, dados de saúde, onboarding, exclusão/exportação. |
| `supabase-postgres-best-practices` | Schema, migration, RLS, índice, query lenta. |
| `mattpocock-skills:grill-me` → `:to-spec` | Antes de preencher qualquer PRD. Passo 2.5 do `HOW_WE_WORK.md`. |
| `mattpocock-skills:code-review` | Antes de pedir aprovação no PR. Standards + Spec. |
| `mattpocock-skills:tdd` | Loop red→green nos seams do PRD. Alcançável pelo agente. |
| `mattpocock-skills:codebase-design` | Ao desenhar ou redesenhar interface de módulo. |
| `mattpocock-skills:diagnosing-bugs` | Bug difícil ou regressão de performance. |

Skill de terceiro **não revoga bloqueador do projeto**: PRD `approved`, `/lgpd-check`
e RLS continuam valendo por cima de qualquer uma delas.

### Issue tracker

Issues vivem como GitHub issues em `DanielLevi22/ElevaPro`, via CLI `gh`. Não substitui
o PRD `approved`. Ver `docs/agents/issue-tracker.md`.

### Triage labels

Os cinco papéis canônicos com os nomes padrão: `needs-triage`, `needs-info`,
`ready-for-agent`, `ready-for-human`, `wontfix`. Ver `docs/agents/triage-labels.md`.

### Domain docs

Single-context, no padrão das skills: `CONTEXT.md` na raiz e ADRs em `docs/adr/`
numerados `0001-*`. Ver `docs/agents/domain.md`.

O fluxo completo, passo a passo, está em [`docs/HOW_WE_WORK.md`](docs/HOW_WE_WORK.md).
