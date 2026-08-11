# Feature: api-security-hardening

**Status:** active
**PRD:** [api-security-hardening](../PRDs/api-security-hardening.md)
**Plataformas:** web (as rotas do BFF) + uma migration que afeta os dois
**Última atualização:** 2026-08-11

---

## O que é

Autorização das rotas de `web/src/app/api/`, num helper único, com guarda no CI
e teste com usuários reais.

## Por que existe

As rotas do BFF usam `service_role`, que **ignora RLS por definição**. Ali a
barreira do banco não participa: a única proteção é o `if` do próprio código.

Em 2026-08-11, duas rotas de IA recebiam o `studentId` pela URL e só conferiam
se o token era válido. Um token de aluno, sem vínculo nenhum, obtinha `HTTP 200`
em `POST /api/ai/chat/<id-de-outro-aluno>` e recebia de volta o nome da vítima —
com a anamnese e a avaliação física dela já carregadas no prompt.

---

## Fluxo de dados

```
Cliente autenticado
  → rota do BFF
      → @/lib/api-auth        ← A BARREIRA. Não há outra.
          → supabaseAdmin (service_role)
              → tabela        ← RLS não é consultada
```

## Tabelas do banco

| Tabela | Operações | RLS ativo |
|---|---|---|
| `profiles` | SELECT — fonte do `account_type` | ✅ |
| `student_specialists` | SELECT — fonte do vínculo | ✅ |
| `storage.objects` (bucket `assessments`) | ALL do dono, SELECT + INSERT do especialista vinculado | ✅ |

---

## Implementação

### O helper (`web/src/lib/api-auth.ts`)

| Função | Garante |
|---|---|
| `authorizeUser(request)` | token válido; devolve id e `account_type` de `profiles` |
| `authorizeSpecialist(request)` | o acima + `account_type = 'specialist'` |
| `authorizeLinkedSpecialist(request, studentId)` | o acima + vínculo `active` |
| `authorizeStudent(request)` | token válido + conta `student` ou `member` |

Devolvem `AuthResult`, não lançam:

```ts
const auth = await authorizeLinkedSpecialist(request, studentId);
if (!auth.ok) return auth.response;
const specialistId = auth.caller.id;
```

`caller` só é alcançável depois de estreitar `ok`. Esquecer a checagem vira erro
de tipo, não furo em produção.

### Rotas migradas

| Rota | Antes | Agora |
|---|---|---|
| `ai/chat/[studentId]` | só o token | `authorizeLinkedSpecialist` |
| `ai/chat/[studentId]/save-workouts` | só o token | `authorizeLinkedSpecialist` |
| `students/[id]` · `/assessments` · `/history` | cópia local correta | `authorizeLinkedSpecialist` |
| `students` (POST) | cópia local correta | `authorizeSpecialist` |
| `ai/student/{nutribot,scan-food,coach/*}` | cópia local, id do token | `authorizeStudent` |
| `auth/ensure-profile` | lia `user_metadata` | `authorizeUser` |

### Guardas

| Arquivo | O que prova | Onde roda |
|---|---|---|
| `scripts/check-api-auth.js` | rota que importa `supabase-admin` importa `api-auth` | pre-commit + CI |
| `web/src/lib/__tests__/api-auth.test.ts` | a tabela de decisão de cada função (16 casos) | CI |
| `scripts/test-api-auth.mjs` | as rotas de verdade, com 4 usuários e tokens reais (14 casos) | manual: `npm run api:test-auth` |

`check-api-auth.js` prova que a autorização foi **chamada**, nunca que está
**correta** — mesma limitação assumida do `check-rls.js`. Quem prova
comportamento são os outros dois.

---

## Regras de negócio

1. `account_type` sai de `profiles`. Nunca de `user_metadata`, que o próprio
   usuário reescreve com `updateUser`.
2. Rota que recebe `studentId` por parâmetro usa `authorizeLinkedSpecialist`.
   Sem exceção.
3. Rota de aluno tira o id do token. O chamador nunca escolhe de quem é o dado.
4. Perfil que não existe é erro (403), não algo a remendar com dado do chamador.
5. Cadastro sem `account_type` cria a conta **menos** privilegiada.
6. Foto de avaliação vive em `assessments/<student_id>/…`. O caminho é o que a
   política usa para decidir — mudar o formato quebra o isolamento.

## Decisões técnicas não-óbvias

- **Resultado em vez de exceção.** `AuthResult` como união discriminada faz o
  compilador exigir a checagem. Com `throw`, esquecer o `try` é silencioso.

- **O nome carrega a garantia.** `getCallerSpecialist` existia em seis arquivos
  com dois significados. `authorizeLinkedSpecialist(request, studentId)` não tem
  como mentir: sem o `studentId` não há checagem de vínculo, e isso é visível na
  chamada.

- **`ensure-profile` não cria mais perfil.** Quem cria é o trigger
  `handle_new_user`, no INSERT em `auth.users`, com o payload do cadastro — que
  naquele instante é legítimo. Recriar depois significava reler metadado que o
  usuário já pôde alterar.

- **`getUserContextJWT` do web perdeu o fallback para `user_metadata`.** Ele
  monta o CASL; o fallback deixava gravar `account_type: 'admin'` e derrubar a
  leitura de `profiles` para ganhar a UI de admin. Só UI — RLS e BFF seguem
  barrando o dado —, mas o mobile já fazia certo e agora as duas plataformas
  concordam.

- **Bucket por migration.** `assessments` não existia em ambiente nenhum. Criado
  no versionamento para não nascer com a política que alguém escolher pelo
  painel — foi assim que 18 tabelas ficaram sem RLS.

## Divergências web ↔ mobile

Nenhuma. O mobile não chama estas rotas: fala com o Supabase direto, coberto
pela RLS.

## Pendências conhecidas

- Sem rate limit nas rotas de IA — abuso de custo, não vazamento.
- Cadastro público cria especialista já ativo, sem verificação de e-mail e sem
  passar pela aprovação do admin.
- A edge function `create-student` é invocada por `students.service.ts` e não
  está no repositório.
- `loadStudentContext` manda a anamnese inteira (`select("*")`) para o prompt.
