# PRD: health-background-tracking

**Data de criação:** 2026-08-02
**Status:** done
**Branch:** feature/health-background-tracking
**Autor:** Daniel Levi

---

## As 3 perguntas obrigatórias

> Nenhuma linha de código é escrita sem estas 3 perguntas respondidas.

### O quê?
Corrigir a leitura de passos e calorias no mobile — hoje silenciosamente quebrada — e
implementar a coleta em background com persistência histórica no Supabase.

### Por quê?
O card de passos/calorias da home é a única métrica de atividade fora do treino
registrado. Hoje ele exibe dados falsos em desenvolvimento e nada em produção, e o
valor se perde ao desmontar o componente. Sem histórico, o specialist não consegue
acompanhar a atividade do aluno entre sessões — que é justamente o gap que a feature
deveria cobrir.

### Como saberemos que está pronto?
- [x] `refetch` não rejeita sem tratamento quando o Health Connect não está inicializado
- [x] Falha de permissão em `__DEV__` é visualmente distinguível de dado real
- [x] Com o app em background por 1h, os passos do período aparecem ao reabrir
- [x] Passos/calorias do dia sobrevivem a um kill do app (persistidos em `health_daily_metrics`)
- [x] Specialist vê a série diária de um aluno vinculado; não vê a de não-vinculados
      — verificado no banco local: aluno 1, specialist vinculado 1, terceiro 0, `UPDATE 0`
- [x] Teste de regressão cobrindo o `refetch` sem `initialize()` prévio
- [x] `npm run lint` e `tsc --noEmit` limpos em `app/` e `web/`

---

## Contexto

Diagnóstico feito em 2026-08-02 sobre o estado atual do código:

1. **Não existe coleta em background.** [`useHealthData`](../../app/src/hooks/useHealthData.ts)
   lê apenas no mount e no `AppState === 'active'`. O único `TaskManager.defineTask`
   do app é o `BACKGROUND_DIET_SYNC`, que sincroniza planos alimentares e nunca toca
   em passos ou calorias.

2. **Nada é persistido.** Os valores vivem num `useState` dentro do hook. Não há
   tabela, coluna nem escrita para o Supabase. Desmontou o componente, perdeu.

3. **`refetch` rejeita sem tratamento.** Ele chama `getGrantedPermissions()` sem
   `initialize()` prévio e sem `try/catch` — diferente de `initHealthKit`, que é
   protegido. Como `refetch` é o handler de retorno do background, no Android o
   estado fica preso em `loading: true`. Este é o caminho exato do sintoma relatado.

4. **O mock de `__DEV__` mascara falha de permissão.** Se o Health Connect não
   inicializa **ou** a permissão não foi concedida, o hook seta `steps: 7543,
   calories: 450` e ainda marca `hasPermissions: true`. O resultado é um número
   plausível e imóvel, que parece travado em vez de quebrado.

5. **Falta permissão de background no Android.** `android.permission.health.READ_HEALTH_DATA_IN_BACKGROUND`
   não está em `app.json` nem no manifest gerado.

6. **iOS nunca foi buildado.** Existe `app/android/`, não existe `app/ios/`. Não há
   `enableBackgroundDelivery` nem `HKObserverQuery` em lugar nenhum do código.

---

## Escopo

### Incluído

**Fase 1 — correções sem schema** (não tocam em dado novo)
- Envolver `refetch` em `try/catch` e chamar `initialize()` antes de `getGrantedPermissions()`
- Extrair a checagem de permissão duplicada entre `initHealthKit` e `refetch`
- Trocar o mock silencioso por um estado explícito (`source: 'mock' | 'device'`), com
  a UI sinalizando quando o dado é simulado
- Teste de regressão para o caminho do item 3 do Contexto

**Fase 2 — persistência e background**
- Tabela `health_daily_metrics` (um registro por aluno por dia) com RLS
- Escrita ao voltar do background e ao final de cada leitura bem-sucedida
- `READ_HEALTH_DATA_IN_BACKGROUND` no `app.json` + rationale activity
- Task de background dedicada (`BACKGROUND_HEALTH_SYNC`), separada da de dieta
- CASL: `read` para o próprio usuário e para o specialist vinculado

### Fora do escopo (explicitamente)
- **iOS.** Não há projeto nativo; habilitar HealthKit exige `prebuild` + conta Apple.
  Fase 2 entrega só Android. O código iOS existente continua compilando, sem regressão.
- Gráfico histórico de passos na web — depende desta tabela existir primeiro.
- Escrita de volta no Health Connect (`WRITE_STEPS` já está no manifest, mas sem uso).
- Metas de passos configuráveis. O `10000` hardcoded em `(tabs)/index.tsx` permanece.

---

## Fluxo de dados

```
[App volta do background / BACKGROUND_HEALTH_SYNC dispara]
  → useHealthData / taskHealthSync
  → initialize() → getGrantedPermissions() → readRecords('Steps' | 'ActiveCaloriesBurned')
  → HealthMetricsService.upsertDaily()
  → health_daily_metrics (upsert por student_id + date)
  ← { steps, calories, source, syncedAt }
```

## Tabelas do banco envolvidas

| Tabela | Operação | Observação |
|--------|----------|------------|
| `health_daily_metrics` | SELECT / UPSERT | **Nova.** Um registro por `(student_id, date)`. Agregado diário, nunca amostra bruta. |
| `student_consents` | SELECT | Verifica `health_data_collection` antes da primeira escrita |
| `profiles` | SELECT | Resolve vínculo specialist ↔ aluno para a política de RLS |

## Impacto em outros módulos

- `app/src/app/(tabs)/index.tsx` — consome `source` para sinalizar dado simulado
- `app/src/app/onboarding/health-connect.tsx` — passa a registrar o consentimento
- `app/src/services/backgroundTask.ts` — ganha um vizinho; permanece intocado
- Web: nenhum nesta entrega (o gráfico histórico ficou fora do escopo)

---

## LGPD

> A skill `lgpd-check` está documentada no CLAUDE.md mas **não está instalada** em
> `.claude/`. Esta seção foi escrita manualmente e precisa de revisão humana antes
> da Fase 2 — ela é o gate, não uma formalidade.

Passos e calorias são **dado de saúde** (Art. 11 da LGPD). Tratamento proposto:

| Dado | Tabela | Base legal | Finalidade |
|---|---|---|---|
| Passos por dia | `health_daily_metrics.steps` | Tutela da saúde (Art. 11, II, f) + Consentimento (Art. 11, I) | Acompanhamento de atividade entre sessões de treino |
| Calorias ativas por dia | `health_daily_metrics.active_calories` | Tutela da saúde + Consentimento | Estimativa de gasto energético para ajuste do plano |

Decisões de minimização já tomadas:
- Grava **agregado diário**, nunca a série bruta do sensor — o suficiente para a
  finalidade, e reduz drasticamente a granularidade do rastro de atividade.
- Não coleta localização, batimentos, sono ou qualquer outro `recordType`, ainda que
  a permissão do Health Connect os torne tecnicamente alcançáveis.
- Escrita condicionada a `student_consents.health_data_collection` ativo. Sem
  consentimento registrado, o dado é exibido na tela e descartado — nunca persistido.

**Decidido em 2026-08-02 (desbloqueou a Fase 2):**
- [x] **Retenção:** enquanto a conta existir. `ON DELETE CASCADE` no `student_id`,
      igual às demais tabelas de saúde. Sem job de expiração.
- [x] **Revogação:** prospectiva — interrompe a coleta e preserva o histórico já
      gravado, que continua visível ao próprio aluno. O especialista perde acesso
      pela RLS assim que o vínculo deixa de ser `active`.

---

## Decisões técnicas

**Task de background separada, não estendida.** `BACKGROUND_DIET_SYNC` tem semântica
de "buscar plano e reagendar notificação". Empilhar saúde nele acoplaria dois
domínios com falhas independentes — um erro de Health Connect passaria a suprimir o
reagendamento de refeição. Duas tasks custam um registro a mais e isolam a falha.

**Upsert diário em vez de append.** O Health Connect devolve o acumulado do dia, não
um delta. Append geraria contagem inflada a cada sincronização. A chave
`(student_id, date)` torna a escrita idempotente, que é requisito com background
fetch de intervalo não garantido.

**`source` explícito em vez de remover o mock.** O mock tem valor real no emulador,
onde não existe Health Connect. O defeito não é existir — é ser indistinguível do
dado verdadeiro. Tornar a origem parte do tipo de retorno resolve sem perder a
ergonomia de desenvolvimento.

**Fase 1 entregue antes da Fase 2.** As correções 3 e 4 do Contexto são independentes
de schema e de LGPD. Segurá-las até a decisão de retenção deixaria um bug conhecido
em produção sem necessidade.

---

## Checklist de done

> Só muda o Status para `done` quando TODOS estão marcados.

- [x] Código funciona e passou em lint + typecheck + testes
- [x] PR mergeado em `development`
- [x] `docs/features/health-background-tracking.md` criado ou atualizado
- [x] `docs/STATUS.md` atualizado
- [x] `docs/LGPD_COMPLIANCE.md` atualizado com `health_daily_metrics`
