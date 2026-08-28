# Correção do feedback de sessão

**Entregue em:** 2026-08-28 · **PRD:** [session-feedback-correction](../PRDs/session-feedback-correction.md) · **Migration:** `0036`

O aluno passa a corrigir e apagar o que ele mesmo escreveu sobre um treino
(Art. 18, III e VI), e o UPDATE/DELETE que a RLS concedia sem ninguém ter
decidido conceder foi fechado.

---

## O que existe agora

| Caminho | Onde |
|---|---|
| Histórico das próprias sessões | `/student/session-history` · [`SessionHistoryScreen`](../../app/src/modules/workout/screens/SessionHistoryScreen.tsx) |
| Corrigir RPE e observação | `WorkoutFeedbackModal` em `mode="correcao"` |
| Apagar só a observação | `ConfirmModal` a partir do mesmo modal |
| Apagar uma análise corporal | [`ScanHistoryList`](../../app/src/modules/assessment/components/ScanHistoryList.tsx), dentro de `PostureAnalysis` |
| Marca de correção para o especialista | `ActivityDayCard` — "corrigido em 28/08" |

A porta para o histórico fica na aba **Progresso → Treinos**. Antes daqui, o
aluno não tinha nenhuma tela que listasse as próprias sessões: `progress.tsx`
mostrava só gráficos agregados, e `scanHistory` era carregado pelo store do
assessment e nunca renderizado.

## Declaração contra medida — a distinção que sustenta o desenho

O Art. 18, III fala em corrigir dado *inexato*, e diz também **o que** é
corrigir. O remédio para uma medida inexata é medir de novo: digitar outro
número não devolve exatidão, cria um dado falso que o profissional usa para
prescrever.

| Dado | Natureza | Corrigir | Eliminar |
|---|---|---|---|
| `workout_sessions.notes` | declaração do titular | editar no lugar | apagar o texto, sessão fica |
| `workout_sessions.intensity` | declaração do titular | editar no lugar | — é parte da execução |
| datas, séries, duração, calorias | medida do evento | — | — |
| `body_scans` | medida derivada por IA | nova análise | apagar a análise |

O DELETE da sessão fecha sem contrariar o Art. 18, VI: aquele inciso cobre dado
tratado **com consentimento**, e a parte consentida da sessão é o texto. A
execução é execução de contrato (Art. 7°, V). Quem quiser eliminar tudo tem a
exclusão de conta, com `ON DELETE CASCADE`.

## O que o banco garante — `0036`

```sql
ALTER TABLE workout_sessions ADD COLUMN feedback_edited_at timestamptz;

DROP POLICY "sessions_own" ON workout_sessions;   -- era FOR ALL desde a 0017
CREATE POLICY "sessions_own_read"   ... FOR SELECT ...
CREATE POLICY "sessions_own_insert" ... FOR INSERT ...
CREATE POLICY "sessions_own_update" ... FOR UPDATE ...
-- sem política de DELETE, para ninguém

REVOKE UPDATE ON workout_sessions FROM authenticated;
GRANT UPDATE (intensity, notes, feedback_edited_at) ON workout_sessions TO authenticated;
```

**Privilégio de coluna e não trigger** porque privilégio é declarativo e aparece
em `information_schema.role_column_grants` — legível por guarda. Um trigger
exigiria ler o corpo da função para saber o que ele proíbe, e um bloco de
verificação que lê código-fonte não verifica nada.

O `REVOKE` era seguro: os 16 pontos que tocam `workout_sessions` em `app/`,
`web/` e `shared/` fazem só SELECT e INSERT. Nenhum caminho legítimo do cliente
fazia UPDATE.

## As travas, e a prova de que elas travam

| Trava | Onde | Prova negativa |
|---|---|---|
| Aluno edita `notes`/`intensity`, não `completed_at`/`started_at`/`session_type`/`duration_seconds`/`active_calories` | `scripts/verify-rls.sql` | Estado pré-`0036` restaurado em transação → guarda falhou |
| Aluno não apaga sessão; especialista não edita nem apaga | `scripts/verify-rls.sql` | idem |
| Só três colunas com `GRANT UPDATE`; nenhuma política de DELETE | `scripts/verify-rls.sql` (bloco estrutural) | idem |
| Serviço nunca envia coluna de medida no patch | `shared/.../workouts.service.test.ts` | `{...input}` no patch → falhou nomeando as colunas vazadas |
| Texto só com consentimento vigente; RPE sempre | `app/.../workoutLogStore.test.ts` | checagem removida → falhou |
| Apagar não depende de consentimento | `app/.../workoutLogStore.test.ts` | — |
| Erro de correção não loga o payload | `app/.../workoutLogStore.test.ts` | `console.error(..., error)` → falhou |

Os testes de trava seguem a regra que a skill `/lgpd-check` passou a exigir:
nome que diz a **proibição**, comentário com o **artigo e o porquê**, e mensagem
de falha que nomeia o **dano** (`HISTÓRICO REESCRITO: ...`), não o valor
esperado. Eles existem para barrar quem for afrouxar a restrição sem saber que
ela é jurídica.

## B2 — a IA do mobile

Entrou junto porque o app inteiro dependia disso. Os cinco serviços de IA
tinham o mesmo ponto cego:

```ts
if (!response.ok) { ... }              // 200 → passa direto
return response.json() as Promise<T>;  // HTML → SyntaxError
```

A proteção da Vercel respondia `302`, o `fetch` seguia, e a tela de login voltava
`200` com HTML. `response.ok` é verdadeiro para uma tela de login — então o
tratamento fino de erro do `aiBodyScan` (`response_truncated`, `ai_unavailable`)
nunca era alcançado.

[`app/src/shared/bff/client.ts`](../../app/src/shared/bff/client.ts) resolve com
três defesas, em ordem de confiabilidade:

1. **`content-type` antes de qualquer parse** — funciona em qualquer runtime.
2. **`redirect: 'manual'`** — exige `expo/fetch`; o `fetch` global do React
   Native é XHR por baixo e **ignora** a opção nas duas plataformas.
3. **O host na mensagem de erro** — nenhuma das três causas possíveis (SSO da
   Vercel, variável ausente, URL de emulador em aparelho) deixava rastro.

Erros nomeados: `BffConfigError`, `BffUnreachableError`, `BffNotJsonError`,
`BffHttpError`. `EXPO_PUBLIC_API_URL` é conferida no boot (`_layout.tsx`), e a
string literal `"undefined"` conta como ausente — era exatamente o valor que
produzia `"undefined/api/ai/body-scan"`.

`scripts/sync-env.js` passou a comparar o arquivo do repositório com
`eas env:list`. É **aviso, não bloqueio**: exige EAS CLI autenticado, e guarda
que falha na máquina de quem só edita documentação vira `--no-verify`. Mesma
escolha de `check-db-types.js` com o Docker.

## O que ficou de fora

- **Histórico de versões do texto.** Guardar a versão anterior conserva o dado
  inexato que o Art. 6°, V manda corrigir.
- **Janela de tempo para editar.** O direito do Art. 18 não expira.
- **O especialista corrigir o que o aluno escreveu.** Nunca.
- **Tela "Meus Dados", portabilidade, exclusão de conta.** Cada uma é uma
  entrega.
- **B1 — desbloquear o preview da Vercel.** É configuração de painel e secret de
  CI, fora do repositório. Ver STATUS.md.
