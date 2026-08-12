# PRD: api-security-hardening

**Data de criação:** 2026-08-11
**Status:** approved
**Branch:** feature/api-security-hardening
**Autor:** Daniel Levi

---

## As 3 perguntas obrigatórias

> Nenhuma linha de código é escrita sem estas 3 perguntas respondidas.

### O quê?
Fechar os furos de autorização das rotas do BFF, que a RLS **não alcança** porque
usam `service_role`, e centralizar a checagem de acesso num único helper em vez
de doze cópias divergentes.

### Por quê?
O [rls-security-hardening](rls-security-hardening.md) fechou o acesso direto ao
PostgREST. Mas `service_role` ignora RLS por definição, e duas rotas de IA a
usam com o `studentId` vindo da **URL**, sem verificar vínculo nem tipo de
conta. Qualquer conta autenticada — inclusive um aluno — lê a anamnese e as
avaliações físicas de qualquer outro aluno, e escreve treino e periodização no
lugar dele.

É a mesma falha de ontem um andar acima: confiar num identificador que o
chamador escolhe. A migration não protege contra isso; só o código protege.

### Como saberemos que está pronto?
- [x] `POST /api/ai/chat/<id-de-aluno-alheio>` responde 403 para conta sem
      vínculo ativo — aluno e especialista não vinculado
- [x] `POST /api/ai/chat/<id>/save-workouts` idem
- [x] Nenhuma rota que recebe `studentId` por parâmetro chega ao `supabaseAdmin`
      sem passar por checagem de vínculo
- [x] Existe **um** helper de autorização; nenhuma rota implementa o seu próprio
- [x] Teste automatizado que exerce as rotas com token de aluno, de especialista
      vinculado e de especialista sem vínculo
- [x] Guarda que falha quando uma rota nova importa `supabaseAdmin` sem usar o
      helper
- [x] `account_type` deixa de sair de `user_metadata`, que o próprio usuário
      escreve
- [ ] RLS verificada em preview com o teste de isolamento, não só aplicada
- [x] Suíte do web e do mobile passando

---

## Contexto

Levantado em 2026-08-11, logo depois do merge do PR #98, ao responder "ainda
falta alguma coisa de segurança?". A resposta foi sim, e o caminho é o mesmo que
já tínhamos consertado no banco.

### A falha central

`web/src/app/api/ai/chat/[studentId]/route.ts`:

```ts
async function getCallerSpecialist(request: NextRequest): Promise<string | null> {
  const token = authHeader.slice(7);
  const { data } = await client.auth.getUser(token);
  return data.user?.id ?? null;      // ← devolve QUALQUER usuário autenticado
}

export async function POST(request, { params }) {
  const { studentId } = await params;              // ← vem da URL
  const specialistId = await getCallerSpecialist(request);
  if (!specialistId) return 401;                   // ← única barreira
  ...
  loadStudentContext(studentId, specialistId)      // ← service_role
}
```

`loadStudentContext` lê, pelo `supabaseAdmin`, para o `studentId` que veio da
URL:

| Tabela | Colunas |
|---|---|
| `student_anamnesis` | `select("*")` — a anamnese inteira |
| `physical_assessments` | peso, altura, % de gordura |
| `profiles` | nome completo |

Tudo isso entra no prompt e volta na resposta do modelo. Um aluno autenticado
faz `POST /api/ai/chat/<id-da-vítima>` com "resuma a anamnese deste aluno" e
recebe dado sensível de saúde de terceiro.

`save-workouts` é o lado da escrita: grava `training_periodizations`,
`training_plans`, `workouts` e `workout_exercises` para um `studentId`
arbitrário.

### Por que passou

Existem **doze** implementações de checagem de acesso espalhadas por
`web/src/app/api/`, e duas funções com o **mesmo nome e garantias diferentes**:

| Arquivo | `getCallerSpecialist` verifica |
|---|---|
| `api/students/route.ts` | token + `account_type = 'specialist'` |
| `api/students/[id]/route.ts` | token + `account_type` + vínculo (`verifyOwnership`) |
| `api/students/[id]/assessments/route.ts` | token + `account_type` + vínculo |
| `api/students/[id]/history/route.ts` | token + `account_type` + vínculo |
| **`api/ai/chat/[studentId]/route.ts`** | **só o token** |
| **`api/ai/chat/[studentId]/save-workouts/route.ts`** | **só o token** |

Quem lê a rota de IA vê um nome conhecido e assume a garantia que ele dá nos
outros quatro arquivos. Não é descuido pontual: é o resultado previsível de
copiar autorização em vez de importá-la. Enquanto forem doze cópias, a décima
terceira também vai divergir.

### O que foi verificado e está OK

Auditoria das 19 rotas em `web/src/app/api/`:

- **`/api/students/**`** — autenticam, checam `account_type` e vínculo. Corretas.
- **Rotas de aluno** (`coach/message`, `coach/session`, `nutribot`,
  `scan-food`) — tiram o `studentId` do **token**, não da URL. Sem IDOR.
- **Rotas que recebem dado no corpo** (`body-scan`, `adherence`, `recipe`,
  `assistant`, `workout/batch`, `workout/negotiate`) — o chamador manda o
  próprio dado. Sem leitura cruzada.
- **`service_role` nunca vaza para o cliente** — nenhum componente `'use client'`
  importa `supabase-admin`, e não há chave de serviço sob `NEXT_PUBLIC_`.
- **`anon` está bloqueado no projeto remoto** — sondagem read-only com a chave
  publicável devolveu 42501 em `profiles`, `student_anamnesis`, `body_scans`,
  `workout_sessions` e `student_specialists`.

---

## Achados

> Esta seção cresce. Cada problema encontrado durante a implementação entra
> aqui com a evidência, e sai só quando estiver fechado e verificado.

| # | Achado | Gravidade | Estado |
|---|---|---|---|
| A1 | IDOR em `POST /api/ai/chat/[studentId]` — lê anamnese e avaliação física de qualquer aluno | 🔴 Crítica | ✅ fechado |
| A2 | IDOR em `POST /api/ai/chat/[studentId]/save-workouts` — escreve prescrição para qualquer aluno | 🔴 Crítica | ✅ fechado |
| A3 | Doze cópias de autorização, duas com o mesmo nome e garantias diferentes | 🟠 Alta | ✅ fechado |
| A4 | `ensure-profile` tira `account_type` de `user_metadata`, que o usuário escreve, com fallback `'specialist'` | 🟠 Alta | ✅ fechado |
| A5 | Bucket `assessments` não existe em lugar nenhum, mas o mobile faz upload nele | 🟡 Média | ✅ fechado |
| A6 | Registro público cria `specialist` com `account_status: 'active'` e `email_confirm: true` | 🟡 Média | ⏳ registrado como dívida |
| A7 | Edge function `create-student` é invocada pelo app e não está no repositório | 🟡 Média | ⏳ registrado como dívida |
| A8 | RLS aplicada em preview mas nunca verificada; produção só recebe no push para `main` | 🔴 Crítica | ⏳ aguarda credencial |
| A9 | `getUserContextJWT` (web) caía em `user_metadata.account_type` — gravar `'admin'` e derrubar a leitura de `profiles` dava CASL de admin | 🟠 Alta | ✅ fechado |
| A10 | `handle_new_user` caía em `'specialist'` quando o cadastro não mandava o tipo — o padrão era a conta mais privilegiada | 🟡 Média | ✅ fechado |
| A11 | O gate do CI ficava verde com a suíte inteira pulada quando a detecção de mudanças falhava | 🟠 Alta | ✅ fechado |

### A11 — o gate que aprovava sem testar (encontrado no próprio PR)

O primeiro CI deste PR mostrou `✅ CI Passed` com **todos** os jobs de app e web
como `skipping`. O job `changes` falhou com `Resource not accessible by
integration`: em evento `pull_request`, o `dorny/paths-filter` lista os arquivos
pela API do GitHub e precisa de `pull-requests: read`, que o `GITHUB_TOKEN` do
repositório não concede por padrão.

Com o job falhando, `needs.changes.outputs.app` e `.web` saem **vazios**. O
script do `ci-success` compara com `"true"`, lê "nada mudou", pula as
verificações e sai com zero. Um PR de segurança passou no gate obrigatório sem
rodar um único teste.

Duas correções, porque são dois defeitos: a permissão faltando, e o gate que
trata "não sei" como "nada a fazer". O segundo é o grave — sem ele, a próxima
falha de detecção volta a aprovar tudo em silêncio.

### Prova do A1

Antes da correção, com um token de **aluno** e sem vínculo nenhum, contra a rota
do especialista de outro aluno:

```
POST /api/ai/chat/<id-da-vítima>   Authorization: Bearer <token do atacante>
→ HTTP 200
→ "Estou aqui para te ajudar a montar a periodização do seu aluno **Vitima**"
```

O nome da vítima voltou na primeira frase, e a anamnese dela já estava no
prompt. Depois da correção, a mesma requisição:

```
→ HTTP 403 {"error":"Apenas especialistas."}
```

### A1 e A2 — IDOR nas rotas de IA do especialista

Descrito acima. As duas rotas recebem `studentId` pela URL e chegam ao
`supabaseAdmin` sem checar vínculo.

### A4 — `account_type` vindo de dado que o usuário controla

`web/src/app/api/auth/ensure-profile/route.ts`:

```ts
const meta = user.user_metadata ?? {};
const accountType = (meta.account_type ?? "specialist") as string;
```

`user_metadata` é escrito pelo próprio usuário (`supabase.auth.updateUser`). A
rota só insere quando o perfil não existe, o que estreita a janela mas não a
fecha: um perfil ausente — trigger que falhou, linha apagada — vira conta do
tipo que o chamador escolher. E o fallback silencioso para `'specialist'`
transforma "metadado ausente" em "especialista".

Tipo de conta é decisão do servidor. Sai de `raw_user_meta_data` só no momento
do cadastro, dentro do trigger, e nunca mais.

### A5 — o bucket que não existe

`app/src/modules/assessment/screens/PostureAnalysis.tsx:761` faz upload para o
bucket `assessments`. Não existe bucket nenhum: nem no ambiente local nem no
projeto remoto (`GET /storage/v1/bucket` devolve `[]` nos dois).

Então a dívida registrada no `rls-security-hardening` como "falta a política do
bucket" estava mal formulada. O problema é anterior: **o bucket não está
versionado**. Quando alguém criar pelo dashboard, ele nasce com a política que a
pessoa escolher naquele minuto, sem revisão e sem histórico — exatamente como
nasceram as 18 tabelas sem RLS.

### A9 — privilégio saindo de campo que o titular edita (encontrado na implementação)

`web/src/packages/supabase/getUserContextJWT.ts` tinha um fallback: quando a
leitura de `profiles` falhava, o `account_type` vinha de
`activeSession.user.user_metadata`. O usuário escreve o próprio `user_metadata`
com `updateUser`. Gravar `account_type: 'admin'` e provocar a falha de leitura
montava o CASL como admin.

Só concede **UI** — o dado segue protegido pela RLS e pelas rotas do BFF —, mas
é o mesmo padrão do A4 e não tem razão de existir. O mobile já fazia certo:
`app/src/packages/supabase/getUserContextJWT.ts` lança quando não acha o perfil.
A correção alinha o web ao mobile.

O `app_metadata` lido na primeira linha do arquivo continua: esse só o
`service_role` escreve.

### A10 — o padrão do cadastro era a conta mais privilegiada

`handle_new_user` (migration 0005) caía em `'specialist'` quando o cadastro não
mandava `account_type`. Hoje todos os caminhos mandam — `auth.service.ts` tem
uma função por tipo —, então o default nunca é exercido. É por isso que dava
para trocar sem risco: um caminho novo que esqueça o campo passa a criar aluno
comum em vez de profissional com acesso a dado de terceiro.

### A6 — cadastro sem verificação de e-mail

`api/auth/register` cria especialista com `email_confirm: true` e
`account_status: 'active'`, sem rate limit. Existe uma tela de aprovação no
admin (`PendingApprovalsList`) que nunca recebe ninguém, porque toda conta já
nasce ativa. Não é falha de autorização, é decisão de produto mal aplicada —
fica como dívida, não entra nesta entrega.

### A7 — código que roda e não está no repositório

`shared/src/services/students.service.ts:197` invoca a edge function
`create-student`. Não há `supabase/functions/` no repositório. Ou a função não
existe (e o cadastro de aluno pelo especialista está quebrado), ou existe só no
dashboard, fora do controle de versão, provavelmente com `service_role`. As duas
hipóteses precisam de resposta; nenhuma é boa.

---

## Escopo

### Incluído

**1. Um helper de autorização, e só um**

`web/src/lib/api-auth.ts`, com a garantia no nome:

| Função | Garante |
|---|---|
| `requireUser(request)` | token válido; devolve id e `account_type` lido de `profiles` |
| `requireSpecialist(request)` | o acima + `account_type = 'specialist'` |
| `requireLinkedSpecialist(request, studentId)` | o acima + vínculo `active` em `student_specialists` |
| `requireStudent(request)` | token válido + conta de aluno; o id sai do token, nunca do parâmetro |

`account_type` sai de `profiles`, nunca de `user_metadata`.

**2. Aplicar nas rotas**

As duas de IA passam a usar `requireLinkedSpecialist`. As doze cópias somem.

**3. Guarda contra recorrência**

Script que falha quando um arquivo sob `web/src/app/api/` importa
`supabase-admin` sem importar `api-auth`. Roda no pre-commit e no CI, ao lado do
`check-rls`.

**4. Teste de autorização**

Exercita as rotas com três tokens — aluno, especialista vinculado, especialista
sem vínculo — e afirma 403 onde tem que dar 403. Mesmo princípio do
`test-rls-isolation.mjs`: prova comportamento, não a existência do `if`.

**5. Bucket por migration**

Criar `assessments` por migration, privado, com política de dono e de
especialista vinculado — o mesmo recorte de `body_scans`.

### Fora do escopo (explicitamente)

- **Rate limit nas rotas de IA.** Custa dinheiro por chamada e não tem
  proteção, mas é abuso de custo, não vazamento. Fica registrado.
- **A6 — fluxo de aprovação de cadastro.** É decisão de produto.
- **A7 — a edge function `create-student`.** Precisa primeiro de uma resposta
  sobre se existe.
- **Acesso do admin.** Continua com o [admin-panel-restore](admin-panel-restore.md).
- **Auditoria de acesso** — registrar quem leu o quê segue sendo outra feature.

---

## Parecer LGPD

Aplicado o `/lgpd-check` sobre o acesso das rotas do BFF a dado de saúde.

**Bloco A — Necessidade e Finalidade** ✅
Nenhum campo novo, nenhuma tabela nova. A entrega **reduz** dado trafegado:
hoje a anamnese vai inteira (`select("*")`) para o prompt.

**Bloco B — Base Legal** ⚠️
Anamnese e avaliação física têm base no Art. 11, II, f (tutela da saúde) + Art.
11, I (consentimento) — mas a base legal pressupõe **quem** trata. Um
especialista sem vínculo lendo a anamnese não tem base legal nenhuma: é
tratamento sem finalidade e sem consentimento do titular.

**Bloco C — Segurança e Acesso** ❌ → o achado
A RLS já garante o recorte no banco. O `service_role` contorna. Na definição da
seção 1 do `LGPD_COMPLIANCE.md`, é falha do **controlador**.

**Bloco D — Direitos dos Titulares** ✅
Sem impacto — nenhum dado novo, nenhuma mudança de retenção.

**Bloco E — Prevenção e Transparência** ⚠️
A anamnese inteira vai para a Anthropic no prompt. Já mapeado na seção 10, mas
o `select("*")` merece recorte: o modelo não precisa da anamnese completa para
montar treino.

**Atualização necessária em `docs/LGPD_COMPLIANCE.md`:** seção 10, módulo AI
BFF — registrar que a proteção do dado de saúde nas rotas de especialista não
vem da RLS e sim do código, e que agora tem teste.

---

## Fluxo de dados

```
Cliente autenticado
  → rota do BFF          ← A BARREIRA É AQUI, e faltava em duas rotas
      → supabaseAdmin (service_role)
          → tabela       ← RLS não é consultada: service_role passa por cima
```

O contraste com o fluxo do PR anterior é o ponto: lá a barreira era a RLS e
bastava existir. Aqui a RLS **não participa**, e a única barreira é o `if` da
rota.

## Tabelas do banco envolvidas

| Tabela | Operação | Observação |
|---|---|---|
| `student_specialists` | SELECT | fonte do vínculo que autoriza |
| `profiles` | SELECT | fonte do `account_type` — substitui `user_metadata` |
| `student_anamnesis` | SELECT | lido pelo contexto do especialista |
| `physical_assessments` | SELECT | idem |
| `training_periodizations`, `training_plans`, `workouts`, `workout_exercises` | INSERT | escrita da rota `save-workouts` |

Nenhuma tabela nova, nenhum campo novo. Uma migration para o bucket.

## Impacto em outros módulos

Módulo AI (web) e cadastro. O mobile não chama estas rotas — usa o
`supabase-js` direto, já coberto pela RLS.

---

## Decisões técnicas

**O nome da função carrega a garantia.** `getCallerSpecialist` mentia em dois
arquivos. `requireLinkedSpecialist(request, studentId)` não tem como mentir: se
não recebe `studentId`, não checa vínculo, e isso é visível na chamada.

**`account_type` sai de `profiles`, não de `user_metadata`.** Metadado de auth é
escrito pelo usuário. Perfil é escrito pelo servidor.

**Guarda no nível do import.** Não dá para verificar estaticamente que a
autorização está *correta* — mas dá para verificar que ela foi *chamada*. Mesma
limitação assumida do `check-rls.js`: prova que existe, não que está certa. Quem
prova comportamento é o teste com três tokens.

**Teste com token real, contra a rota.** Ler o `if` e concluir que está certo é
o erro que produziu esta situação — o `getCallerSpecialist` da rota de IA
*parece* certo.

---

## Riscos

| Risco | Mitigação |
|---|---|
| Checagem restritiva demais derruba o chat de IA em produção | Teste com especialista vinculado afirma o caminho feliz, não só os bloqueios |
| Alguém criar rota nova copiando a autorização de novo | Guarda no pre-commit e no CI |
| A guarda passar a ser contornada com `// biome-ignore` mental | O teste de autorização não depende da guarda |

---

## Checklist de done

- [x] A1 e A2 fechados e verificados por teste com três tokens
- [x] Helper único; nenhuma rota com autorização própria
- [x] Guarda de CI falhando em rota nova sem o helper
- [x] A4 fechado — `account_type` vindo de `profiles`
- [x] A5 fechado — bucket por migration, com política
- [x] `docs/LGPD_COMPLIANCE.md` seção 10 atualizada
- [x] Código funciona e passou em lint + typecheck + testes
- [ ] A8 — RLS verificada em preview com o teste de isolamento
- [ ] PR mergeado em `development`
- [x] `docs/features/api-security-hardening.md` criado
- [x] `docs/STATUS.md` atualizado
