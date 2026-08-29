# PRD: session-feedback-correction

**Data de criação:** 2026-08-28
**Status:** approved
**Branch:** feature/session-feedback-correction
**Autor:** Daniel Levi

> **Depende de `student-activity-feed` estar em `development`.** Esta branch
> nasceu de `development`, que ainda não tem a `0035` nem a política `1.1`. O
> que torna a correção urgente — o especialista passar a **ler** o que o aluno
> escreve — chega com aquela entrega. Rebase antes de começar.

> **Este PRD carrega três assuntos.** O principal é o direito de correção
> (Art. 18). Os outros dois são defeitos ativos, investigados em 2026-08-28 e
> registrados aqui a pedido: o **preview da Vercel inacessível** (B1) e a **IA
> do mobile sem conexão** (B2). Os dois são o mesmo defeito visto de dois
> lugares — ver B1. Se preferir separá-los depois, as seções B1 e B2 são
> autocontidas.

---

## As 3 perguntas obrigatórias

### O quê?

Três coisas:

1. **Dar ao titular o controle sobre o que ele mesmo escreveu** — corrigir e
   apagar as observações e o RPE do feedback de treino —, com a interface para
   isso e com marca de edição visível ao especialista.
2. **Governar o UPDATE e o DELETE que a RLS já concede** e ninguém decidiu
   conceder: hoje o aluno pode reescrever a data de uma sessão ou apagá-la
   inteira, sem rastro.
3. **Consertar o preview da Vercel e a IA do mobile**, que são o mesmo defeito.

### Por quê?

**O direito existe e o produto não o oferece.** O Art. 18, III garante ao titular
a correção de dado incompleto, inexato ou desatualizado; o Art. 18, VI garante a
eliminação de dado tratado com consentimento. Não há caminho para nenhum dos
dois: o aluno aperta "Salvar e Finalizar" e o texto fica como está para sempre.

**Ficou mais grave quando o texto passou a ser lido.** Enquanto ninguém no web
lia `workout_sessions.notes`, um erro de digitação era um erro entre o aluno e o
banco. Desde a política `1.1`, o especialista vinculado lê — e o aluno que
escreveu "senti dor no ombro **direito**" quando era o esquerdo não tem como
consertar antes que a prescrição seja ajustada para o lado errado.

**E a permissão já existe, sem controle em volta.** Ver "Contexto".

**A IA do mobile está fora do ar inteira** porque o domínio de preview exige
login da Vercel — e o app de release aponta para ele.

### Como saberemos que está pronto?

**Correção (Art. 18)**

- [ ] O aluno edita as observações e o RPE de uma sessão concluída, pelo app
- [ ] O aluno apaga só o texto da observação, e a sessão continua no histórico
- [ ] O aluno apaga uma análise corporal sua, e ela some do histórico e do feed
- [ ] A sessão editada mostra ao especialista, no feed, que foi corrigida e quando
- [ ] O aluno **não** altera `started_at`, `completed_at`, `session_type`,
      `duration_seconds`, `active_calories` nem as séries — nem pela tela, nem
      por chamada direta ao PostgREST
- [ ] O aluno **não** apaga uma sessão de treino
- [ ] O especialista não edita nem apaga o feedback de nenhum aluno
- [ ] `scripts/verify-rls.sql` prova as quatro afirmações acima contra o banco
- [ ] A seção 10 do `LGPD_COMPLIANCE.md` deixa de afirmar que o DELETE em
      `workout_sessions` é proibido pela RLS enquanto não for
- [ ] A linha "Correção" da seção 5 sai de "Parcialmente implementado" e diz o
      que está coberto e o que não está

**B1 — preview**

- [ ] `curl https://elevapro-preview.vercel.app/api/ai/body-scan` responde JSON
      da aplicação, não `302` para `vercel.com/sso-api`
- [ ] O job `migrate` do `release-web.yml` não volta a falhar com
      `tenant/user ... not found`

**B2 — IA do mobile**

- [ ] Tirar foto para análise corporal funciona num build de release
- [ ] Reconhecer alimento por foto funciona num build de release
- [ ] Uma resposta que não seja JSON da aplicação produz erro **nomeado** na
      tela, não `SyntaxError: Unexpected token '<'`
- [ ] `EXPO_PUBLIC_API_URL` ausente falha no boot com mensagem, e não monta a
      URL `"undefined/api/ai/body-scan"`
- [ ] `eas env:list --environment preview` mostra `EXPO_PUBLIC_API_URL` com o
      mesmo valor de `app/.env.production`, e a divergência entre os dois passa a
      ser verificável por script
- [ ] A tela de erro de IA mostra o host que foi tentado — hoje nenhuma das três
      causas possíveis deixa rastro

---

## Contexto

### O que a RLS realmente concede hoje

Quatro tabelas de dado sensível dão ao aluno política `FOR ALL` sobre as próprias
linhas — o que inclui UPDATE e DELETE:

| Política | Tabela | Migration |
|---|---|---|
| `sessions_own` | `workout_sessions` | `0017` |
| `anamnesis_own` | `student_anamnesis` | `0017` |
| `body_scans_own` | `body_scans` | `0017` |
| `student_own_meal_logs` | `meal_logs` | `0013` |

```sql
CREATE POLICY "sessions_own" ON workout_sessions
  FOR ALL USING (student_id = (SELECT auth.uid()))
  WITH CHECK (student_id = (SELECT auth.uid()));
```

### Verificado no banco, não deduzido 🔴

Assumindo o papel `authenticated` com as claims de um aluno, dentro de transação
com `ROLLBACK`:

```
NOTICE:  UPDATE pelo aluno: PERMITIDO
NOTICE:  DELETE pelo aluno: PERMITIDO -- doc diz que e proibido
```

A seção 10 do `LGPD_COMPLIANCE.md` afirma:

> | DELETE proibido via RLS em sessions | Histórico é imutável — só deletado quando o próprio aluno exclui a conta |

**É controle documentado que o banco não tem.** É a mesma classe de defeito que a
auditoria de 2026-08-11 encontrou nessa exata tabela — as decisões diziam "RLS
bloqueia" desde a revisão do módulo, e a tabela estava sem RLS nenhuma. A lição
registrada na abertura da seção 10 vale de novo: decisão documentada não é
controle implementado.

O problema não é falta de permissão. É **permissão sem desenho**: o aluno pode
tudo, inclusive o que não deveria, e não pode nada pela interface.

---

## B1 — O preview da Vercel está atrás do login da Vercel 🔴

### O sintoma

"Não estamos conseguindo subir o ambiente de preview."

### O que os workflows dizem

O `release-web.yml` deploya preview a cada push em `development`. As execuções:

| Run | Data | Resultado |
|---|---|---|
| `33173288009` | 2026-08-28 | ✅ sucesso, incluindo `🌐 Deploy Preview` |
| `33112778749` | 2026-08-27 | ❌ falhou em `🗄️ Migrations` |
| `33107854882` | 2026-08-27 | ❌ idem |
| `33107708200` | 2026-08-27 | ❌ idem |

O erro das três de 27/08:

```
failed to connect to postgres: failed to connect to
`host=aws-1-us-east-1.pooler.supabase.com user=postgres.lcwzijtunmlvvrqtproh`:
FATAL: (ENOTFOUND) tenant/user postgres.lcwzijtunmlvvrqtproh not found
```

`deploy-preview` tem `needs: [validate, migrate]`, então **migração falhando
cancela o deploy**. Foi o que aconteceu naqueles três pushes.

### Mas o deploy de 28/08 passou — e o preview continua inacessível

```
$ curl -sD- https://elevapro-preview.vercel.app/api/ai/body-scan
HTTP/1.1 302 Found
Location: https://vercel.com/sso-api?url=...%2Fapi%2Fai%2Fbody-scan&nonce=...
Set-Cookie: _vercel_sso_nonce=...
```

Seguindo o redirect, o corpo é `<!DOCTYPE html>` da tela de login da Vercel.

**O deploy nunca foi o problema. O `Deployment Protection` do projeto está
ligado**, e ele protege o deployment inteiro — páginas e rotas de API. Sem sessão
Vercel, tudo vira redirect para login. Por isso a tela "não sobe": o navegador sai
do domínio antes de renderizar qualquer coisa.

### Duas causas distintas, não uma

1. **Deployment Protection ligado** (a que está ativa agora). Ou desligar para o
   preview, ou usar Protection Bypass for Automation — um token que o cliente
   manda em `x-vercel-protection-bypass`.
2. **`SUPABASE_DB_URL` do ambiente `preview` apontando para um projeto que o
   pooler não conhece.** Passou em 28/08 e falhou três vezes em 27/08; até
   entender por quê, é intermitente, e intermitente em migration é o pior tipo.
   Confirmar que o ref do projeto no secret existe e não está pausado.

---

## B2 — A IA do mobile não conecta em lugar nenhum 🔴

### O sintoma

"Tentei tirar a foto pra análise com IA do body scan, não funcionou. Tentei tirar
foto do alimento, não funcionou." Em nenhum canto.

### Onde o build de preview lê a URL — e por que isso importa

O defeito apareceu num **build de preview gerado no EAS**, e o EAS não lê
`app/.env.production`. O próprio `.env.example` já registra isso:

> Build no EAS não usa nenhum dos dois: lê as variáveis do environment declarado
> no perfil de `eas.json`.

E `eas.json` declara `"environment": "preview"` para esse perfil. Ou seja: o
valor que foi para dentro do APK é o do **environment `preview` do EAS**, não o
do arquivo do repositório. Os dois podem estar diferentes há meses sem que nada
avise — e o arquivo local é o que a pessoa olha quando vai investigar.

Pior: `EXPO_PUBLIC_*` é **inlinado no bundle em tempo de build**. Um valor errado
não se corrige mudando o environment: exige build novo. Um APK de preview na mão
de alguém carrega para sempre a URL que existia no dia em que foi gerado.

**Verificar antes de qualquer conserto de código:**

```bash
eas env:list --environment preview
```

São três estados possíveis, e os três produzem o mesmo sintoma mudo:

| Estado de `EXPO_PUBLIC_API_URL` no environment `preview` | O que acontece no APK |
|---|---|
| `https://elevapro-preview.vercel.app` | Cai no SSO da Vercel (B1): `302` → `200` com HTML → erro de parse |
| ausente | A URL vira a string `"undefined/api/ai/body-scan"` → erro de rede |
| `http://10.0.2.2:3000` (copiado do local) | `10.0.2.2` é o alias do host **no emulador** e não existe em aparelho; e o Android bloqueia cleartext HTTP em build de release. Falha de rede |

O primeiro é o mais provável, porque o `.env.production` do repositório aponta
para lá e é o valor que alguém teria copiado ao criar o environment:

```
# app/.env.production
EXPO_PUBLIC_APP_ENV=preview
EXPO_PUBLIC_API_URL=https://elevapro-preview.vercel.app
```

**Não existe caminho de IA no mobile que não passe por esse host** — o BFF é o
único lugar onde a `ANTHROPIC_API_KEY` vive, por decisão da `ADR-004`. Por isso
"não funciona em canto nenhum": não são cinco defeitos, é um host.

As cinco rotas que o app chama existem no web. O problema nunca foi rota faltando.

### O que torna os três indistinguíveis

Nenhum dos três estados produz uma mensagem que aponte para a URL. É o que a
próxima seção descreve — e é por isso que o conserto tem duas metades: acertar o
endereço **e** fazer o app dizer qual endereço ele tentou.

### Por que o erro não diz nada — o defeito que amplifica

A proteção responde **302 → 200 com HTML**. O `fetch` do React Native segue
redirect por padrão. Então, nos cinco serviços:

```ts
if (!response.ok) { ... }              // 200 → passa direto
return response.json() as Promise<T>;  // HTML → SyntaxError
```

`response.ok` é verdadeiro para uma tela de login. O código segue e quebra ao
parsear HTML como JSON, e o aluno vê a mensagem genérica de falha. Vale para
`aiBodyScan.ts`, `FoodRecognitionService.ts`, `NutriBotService.ts`,
`AssistantService.ts` e `ShoppingListService.ts` — o mesmo ponto cego nos cinco.

`aiBodyScan.ts` tem tratamento fino por código de erro (`response_truncated`,
`ai_unavailable`, …) e nada disso é alcançado: o desvio acontece antes.

### Um terceiro defeito, menor, no mesmo caminho

```ts
const bffUrl = () => `${process.env.EXPO_PUBLIC_API_URL}/api/ai/body-scan`;
```

Sem a variável, isto monta a string `"undefined/api/ai/body-scan"` e o `fetch`
falha com erro de rede. `AssistantService` e `ShoppingListService` usam
`?? ''`, que é igualmente mudo: vira caminho relativo sem host.

### O conserto

0. **Conferir `eas env:list --environment preview`** e alinhar com
   `app/.env.production`. É a primeira coisa: se a URL estiver ausente ou local,
   o resto do diagnóstico muda de causa.
1. **Desbloquear o preview** (B1) — se a URL estiver certa, é isto.
2. **Distinguir "não é JSON da aplicação" de "falhou"**: um helper único que
   confere `content-type` antes de parsear e lança erro nomeado
   (`bff_unreachable`, `bff_not_json`). Cinco serviços, um helper.
3. **Não seguir redirect nas chamadas de BFF** (`redirect: 'manual'`): um 302 na
   API é sempre defeito de infraestrutura, nunca resposta legítima.
4. **Validar `EXPO_PUBLIC_API_URL` no boot**, como `packages/supabase/client.ts`
   já faz com as variáveis do Supabase — falha com nome da variável, em vez de
   montar URL inválida.
5. **Se o preview continuar protegido por decisão**, o app passa o token de
   bypass em `x-vercel-protection-bypass`, vindo do environment do EAS.
6. **Guarda contra a divergência voltar**: `sync-env.js` já existe e já divergiu
   dos `.env.example` duas vezes (dívida 13). Estender para comparar o
   environment do EAS com o arquivo do repositório fecha a porta pela qual este
   defeito entrou.

---

## Escopo

### Incluído

**Correção e eliminação (Art. 18)**

1. **Editar `notes` e `intensity`** da própria sessão, pelo app.
2. **Apagar só a observação**, mantendo a sessão.
3. **Apagar a própria análise corporal** (`body_scans`).
4. **Coluna `feedback_edited_at`** e marca de correção no feed do especialista.
5. **UPDATE restrito por privilégio de coluna** — o aluno não reescreve o que
   aconteceu.
6. **DELETE de `workout_sessions` fechado para o aluno.**
7. **Caso próprio em `verify-rls.sql`.**
8. **Seções 2.1, 5 e 10 do `LGPD_COMPLIANCE.md` corrigidas.**

**B1 e B2**

9. Preview acessível sem sessão Vercel, ou com bypass declarado.
10. `SUPABASE_DB_URL` de preview verificado.
11. Helper único de resposta do BFF, com erro nomeado, nos cinco serviços.
12. `EXPO_PUBLIC_API_URL` validado no boot.

### Fora do escopo (explicitamente)

- **Histórico de versões do texto.** Guardar o que o aluno escreveu antes
  trabalha contra a finalidade do próprio direito: o Art. 6°, V pede dado exato,
  e preservar a versão errada para sempre é o contrário disso. A prestação de
  contas (Art. 6°, X) fica satisfeita por saber **que** mudou e **quando**.
- **Janela de tempo para editar.** O direito do Art. 18 não expira.
- **Editar medida.** Ver a tabela abaixo — é a distinção que sustenta o desenho.
- **O especialista corrigir o que o aluno escreveu.** Nunca: terceiro editando
  declaração alheia não é correção, é falsificação.
- **Tela "Meus Dados", portabilidade e exclusão de conta** — a seção 5 lista os
  três como pendentes e cada um é uma entrega.
- **Reescrever o pipeline de deploy.** B1 é configuração e um secret, não
  arquitetura.

---

## O desenho da correção: declaração contra medida

O pedido foi "se a LGPD diz que ele pode editar, então ele pode". A LGPD diz —
e diz também **o que** é corrigir. O Art. 18, III fala em dado *inexato*; o
remédio para uma medida inexata é medir de novo, não digitar outro número. Editar
uma medida não devolve exatidão: cria um dado falso que o profissional vai usar
para prescrever.

Então o direito é integral, e o caminho muda conforme a natureza do dado:

| Dado | Natureza | Corrigir | Eliminar |
|---|---|---|---|
| `workout_sessions.notes` | declaração do titular | editar no lugar | apagar o texto, sessão fica |
| `workout_sessions.intensity` | declaração do titular | editar no lugar | — é parte da execução |
| datas, séries, duração, calorias | medida do evento | — | — |
| `student_anamnesis.responses` | declaração do titular | **já existe**: reabrir o questionário (`upsert`) | com a conta |
| `body_scans` | medida derivada por IA | nova análise | **apagar a análise** |
| `meal_logs` | registro de adesão | **já existe**: alternar e substituir | com a conta |
| `physical_assessments` | medida do especialista | nova avaliação (imutável, dívida 26) | não é dado escrito pelo titular |

E o DELETE de sessão de treino **fecha**, sem contradizer o Art. 18, VI: aquele
inciso cobre dado tratado **com consentimento**. A parte consentida da sessão é o
texto — e o aluno passa a poder apagá-lo. A execução em si é execução de contrato
(Art. 7°, V), e o inciso não a alcança. Quem quiser eliminar tudo tem o caminho da
exclusão de conta, com `ON DELETE CASCADE`.

---

## A tela

### Corrigir o feedback — mobile

No histórico de treinos, a sessão concluída ganha a ação. O modal é o
`WorkoutFeedbackModal` já existente, em modo correção, com os valores carregados.

```
 HISTÓRICO                                    CORRIGIR FEEDBACK
┌──────────────────────────────────┐        ┌──────────────────────────────────┐
│ Treino A — Push                  │        │  Como foi o treino?          ✕   │
│ 28/08 · RPE 8                    │        │                                  │
│ "Senti dor no ombro direito"     │        │  INTENSIDADE (RPE)               │
│                       ⋯          │──────▶ │      ─   ( 8 )  +                │
└──────────────────────────────────┘        │        Difícil 🥵                │
   ⋯ abre:                                  │                                  │
   ┌────────────────────────┐               │  OBSERVAÇÕES                     │
   │ ✎  Corrigir feedback   │               │  ┌────────────────────────────┐  │
   │ 🗑  Apagar observação   │               │  │ Senti dor no ombro direito │  │
   └────────────────────────┘               │  └────────────────────────────┘  │
                                            │  👁 Seu personal já leu este     │
                                            │     feedback. A correção aparece │
                                            │     marcada para ele.            │
                                            │                                  │
                                            │  [    SALVAR CORREÇÃO        ]   │
                                            │  [    Apagar observação      ]   │
                                            └──────────────────────────────────┘
```

Dizer que **já foi lido** é o ponto. Sem isso, corrigir dá a impressão falsa de
que a versão anterior nunca existiu na cabeça do profissional — e a transparência
do Art. 6°, VI é sobre o momento em que a pessoa age, não sobre o termo que ela
aceitou uma vez.

"Apagar observação" pede confirmação pelo `ConfirmModal` que já existe, com o
texto dizendo o que sobra: *"A observação some. O treino, a data e as séries
continuam no seu histórico."* — porque apagar sem saber o que fica é o que
produz o pedido de suporte seguinte.

### Apagar uma análise corporal — mobile

O histórico de análises ganha a mesma ação de apagar, com confirmação. Aqui não
há "corrigir": a correção de uma medida é uma medida nova, e o botão de nova
análise já existe ao lado.

### A marca no feed — web

```
28/08 · quinta                                        Treino ✓ · Refeições 3/4
  ⚡ Treino A — Push                             RPE 8 — Difícil
     "Senti dor no ombro esquerdo"               corrigido em 28/08
```

Discreta e ao lado do texto, não um selo de alerta: correção é o titular usando
um direito, não um sinal de problema. O que o especialista precisa é saber que a
frase que ele leu ontem pode não ser a de hoje.

---

## Fluxo de dados

```
[Aluno corrige o feedback no mobile]
  → WorkoutFeedbackModal (modo correção)
  → workoutStore.updateSessionFeedback(sessionId, { intensity, notes })
  → workoutsService.updateSessionFeedback
      notes só com consentimento vigente (notasSeConsentido, já existe)
      feedback_edited_at = now()
  → UPDATE workout_sessions   (RLS: sessions_own · GRANT de coluna)

[Aluno apaga uma análise corporal]
  → bodyScanService.deleteOwn(scanId)
  → DELETE body_scans         (RLS: body_scans_own, mantida FOR ALL)

[Especialista abre Atividades]
  → activityService.fetchStudentActivities
  ← ActivityEvent { studentNote, noteEditedAt }
  → ActivityDayCard mostra "corrigido em 28/08"
```

## Tabelas do banco envolvidas

| Tabela | Operação | Observação |
|--------|----------|------------|
| `workout_sessions` | ALTER (1 coluna), UPDATE | `feedback_edited_at`. Tabela sensível |
| — | REVOKE/GRANT | UPDATE por coluna para `authenticated` |
| — | DROP/CREATE POLICY | `sessions_own` deixa de conceder DELETE |
| `body_scans` | DELETE | Política mantida; ganha caminho na interface |

## Impacto em outros módulos

- **`app/src/modules/workout`** — `WorkoutFeedbackModal` ganha modo correção;
  `workoutStore` ganha `updateSessionFeedback`.
- **`app/src/modules/assessment`** — ação de apagar no histórico de análises;
  `aiBodyScan.ts` passa pelo helper de resposta do BFF.
- **`app/src/modules/nutrition`, `app/src/modules/ai`** — os quatro serviços
  restantes passam pelo mesmo helper.
- **`shared/`** — `workouts.service.ts` ganha a mutação; `bodyScan.service.ts`
  ganha o delete; `activity.types.ts` ganha `noteEditedAt`.
- **`web/src/modules/students`** — `ActivityDayCard` mostra a marca.
- **`.github/workflows/release-web.yml`** e secrets — B1.
- **Nenhum impacto em gamificação**: `daily_goals` conta sessão concluída, e a
  correção não muda `completed_at`.

---

## Decisões técnicas

### Por que privilégio de coluna, e não trigger

```sql
REVOKE UPDATE ON workout_sessions FROM authenticated;
GRANT UPDATE (intensity, notes, feedback_edited_at) ON workout_sessions TO authenticated;
```

Um trigger faria o mesmo com código a mais, e código que precisa ser lido para se
saber o que ele proíbe. O privilégio é declarativo e aparece em
`information_schema.column_privileges` — verificável por guarda, que é o tipo de
controle que a auditoria de 2026-08-11 teria encontrado sozinha.

**Atenção:** privilégio de coluna vale para o papel inteiro, não por linha. Antes
do `REVOKE`, confirmar que nenhum caminho legítimo faz UPDATE em
`workout_sessions` pelo cliente. O `service_role` das rotas do BFF ignora
privilégio e RLS, então não é afetado.

### Por que a marca de edição, e não versões

A versão anterior é o dado **inexato** que o Art. 6°, V manda corrigir; guardá-la
para sempre conserva exatamente o que o direito existe para remover. A prestação
de contas precisa do fato da correção, não do conteúdo antigo.

### Por que um helper de resposta do BFF, e não um `try/catch` melhor em cada serviço

Porque o defeito não é o tratamento do erro: é que **não houve erro**. `200` com
HTML atravessa qualquer `try/catch` bem escrito e só quebra no `json()`. O que
falta é uma camada que afirme "isto é resposta da nossa aplicação" antes de
qualquer parse — `content-type` e `redirect: 'manual'`. Cinco cópias do mesmo
tratamento é como o ponto cego ficou uniforme.

### Por que `redirect: 'manual'`

Numa API, `302` nunca é resposta legítima do produto — é a infraestrutura
interceptando. Seguir o redirect transforma um problema de configuração em um
erro de parse três camadas abaixo, longe da causa.

---

## Parecer LGPD — `/lgpd-check` de 2026-08-28

### Bloco A — Necessidade e Finalidade (Art. 6°, I e III) ✅

Nenhum dado novo é coletado do titular. `feedback_edited_at` é metadado gerado
pelo sistema — carimbo de tempo, não conteúdo — com finalidade declarada:
informar ao leitor que a declaração foi corrigida. Sem ele, a correção seria
indistinguível de o aluno ter escrito aquilo desde o começo.

A entrega **reduz** superfície: o UPDATE irrestrito vira UPDATE de três colunas.

### Bloco B — Base Legal (Art. 7° ou Art. 11) ✅

O dado corrigido continua sob a mesma base do original — Tutela da saúde
(Art. 11, II, f) + Consentimento (Art. 11, I). Correção não é tratamento novo; é
a manutenção da exatidão que o Art. 6°, V já exige do mesmo tratamento.
`feedback_edited_at` é execução de contrato (Art. 7°, V).

A gravação do texto corrigido passa por `notasSeConsentido`, que já existe: sem
consentimento vigente, o RPE é gravado e o texto não.

### Bloco C — Segurança e Acesso (Art. 6°, VII) ❌ → o motivo do PRD

Reprovado no estado atual:

- `sessions_own` concede DELETE ao aluno, contra o que a seção 10 afirma.
  **Verificado no banco em 2026-08-28.**
- `sessions_own` concede UPDATE de qualquer coluna: o aluno pode transformar um
  cardio em musculação ou mudar a data de uma sessão, e nada registra.
- O especialista permanece corretamente em SELECT.

⚠️ **E há exposição fora do banco:** enquanto o preview estiver protegido só por
SSO da Vercel, qualquer pessoa com uma conta Vercel autorizada no projeto alcança
`/api/ai/*` do ambiente que fala com o Supabase de preview. Proteção de
plataforma não substitui `authorizeStudent` — e não substitui porque não sabe
nada sobre vínculo entre aluno e especialista. As duas coexistem; nenhuma é a
outra.

Depois desta entrega: SELECT + INSERT + UPDATE de três colunas para o dono,
SELECT para o especialista vinculado, DELETE para ninguém em `workout_sessions`.

### Bloco D — Direitos dos Titulares (Art. 18) ⚠️ → o que a entrega resolve

| Inciso | Antes | Depois |
|---|---|---|
| II — acesso | vê no app; tela "Meus Dados" pendente | igual |
| III — correção | **nenhum caminho** para o feedback | edita texto e RPE; anamnese e refeição já tinham |
| VI — eliminação | nenhum caminho | apaga a observação e a análise corporal |

Fica pendente, e registrado: tela "Meus Dados", portabilidade e exclusão de
conta. `physical_assessments` não entra — não é dado escrito pelo titular, e a
correção ali é avaliação nova, por decisão registrada na dívida 26.

### Bloco E — Prevenção e Transparência (Art. 6°, VI e VIII) ⚠️

- **Log:** a mutação de correção não pode logar o corpo. O erro do PostgREST
  carrega o payload, e o payload aqui é `notes`. Mesma regra já aplicada em
  `saveWorkoutSession` e `saveCardioSession`.
- **Transparência:** o modal em modo correção diz que o feedback **já foi lido**
  e que a correção aparece marcada. A confirmação de apagar diz o que permanece.

### Bloqueadores (não implementar sem resolver)

- ❌ **A restrição de UPDATE por coluna tem de estar provada em
  `verify-rls.sql`** antes de a tela de correção existir. Abrir o caminho de
  escrita sem a restrição transforma um botão de corrigir observação em um botão
  de reescrever o histórico de execução.
- ❌ **A seção 10 do `LGPD_COMPLIANCE.md` não pode continuar afirmando um
  controle que o banco não tem.** Ou a migration entra junto, ou a afirmação sai
  no mesmo commit. As duas ao mesmo tempo é o que produziu este PRD.

### Atenção

- ⚠️ Confirmar que nenhum caminho legítimo faz UPDATE em `workout_sessions` pelo
  cliente antes do `REVOKE`.
- ⚠️ Abrir dívida para `anamnesis_own`, `body_scans_own` e
  `student_own_meal_logs`, que seguem `FOR ALL` sem decisão registrada — o
  DELETE de `body_scans` passa a ser usado de propósito, os outros dois não.
- ⚠️ Se o preview ficar aberto (B1), confirmar que ele não aponta para o Supabase
  de produção. Ambiente sem proteção de plataforma depende inteiramente do
  `api-auth`, e é o desenho correto — mas exige que o dado por trás seja de
  preview.

### Atualizações necessárias em `docs/LGPD_COMPLIANCE.md`

- [ ] Seção 5: "Correção" deixa de ser "Parcialmente implementado" e lista o que
      está coberto (perfil, anamnese, feedback, adesão) e o que não está
- [ ] Seção 5: "Exclusão" registra o que o titular já apaga por item
- [ ] Seção 10, módulo Workouts: a linha do DELETE descreve o controle real, com
      a data em que passou a existir
- [ ] Seção 10, módulo Workouts: registrar o UPDATE restrito por coluna
- [ ] Seção 2.1: `feedback_edited_at` como execução de contrato

---

## Fases

| Fase | Entrega | Depende de |
|---|---|---|
| B1 | Desbloquear o preview e verificar `SUPABASE_DB_URL` | — |
| B2 | Conferir o environment `preview` do EAS · helper de resposta do BFF nos 5 serviços · validação de `EXPO_PUBLIC_API_URL` no boot | B1 |
| 0 | Migration: `feedback_edited_at`, `sessions_own` sem DELETE, `GRANT` de coluna | — |
| 1 | `verify-rls.sql` provando as quatro afirmações — **antes da tela** | 0 |
| 2 | `shared/`: `updateSessionFeedback`, `deleteOwn` de body scan, `noteEditedAt` | 0 |
| 3 | Mobile: modo correção, apagar observação, apagar análise corporal | 2 |
| 4 | Web: marca de correção no `ActivityDayCard` | 2 |
| 5 | `LGPD_COMPLIANCE.md` seções 2.1, 5 e 10 | 1 |

B1 vem primeiro porque é o que está quebrado agora e bloqueia o app inteiro. A
fase 1 vem antes da 3 de propósito: a prova de que o UPDATE está restrito tem de
existir antes do caminho que usa o UPDATE.

---

## Checklist de done

> Só muda o Status para `done` quando TODOS estão marcados.

- [ ] Código funciona e passou em lint + typecheck + testes
- [ ] PR mergeado em `development`
- [ ] `docs/features/session-feedback-correction.md` criado ou atualizado
- [ ] `docs/STATUS.md` atualizado — dívida 71 fechada, dívidas novas abertas
