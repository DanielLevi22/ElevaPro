# Feature: health-background-tracking

**Status:** active
**PRD:** [health-background-tracking](../PRDs/health-background-tracking.md)
**Plataformas:** mobile
**Última atualização:** 2026-08-02

---

## O que é

Leitura de passos e calorias ativas do Health Connect (Android) com persistência
do agregado diário no Supabase, incluindo sincronização com o app em background.

## Por que existe

É a única métrica de atividade fora do treino registrado. Antes desta entrega o
valor vivia só em estado React — sumia ao desmontar o componente, não tinha
histórico, e o especialista não conseguia acompanhar a atividade do aluno entre
sessões.

---

## Fluxo de dados

```
[App volta do foreground OU BACKGROUND_HEALTH_SYNC dispara]
  → useHealthData / backgroundHealthTask
  → readDeviceMetrics()  → initialize() → getGrantedPermissions() → readRecords()
  → syncDailyMetrics()   → hasCollectionConsent()
  → HealthService.upsertDaily()
  → health_daily_metrics (upsert por student_id + date)
  ← { steps, calories, source }
```

## Tabelas do banco

| Tabela | Operações | RLS ativo |
|--------|-----------|-----------|
| `health_daily_metrics` | SELECT, UPSERT | ✅ |
| `student_consents` | SELECT, UPSERT | ✅ |

Políticas de `health_daily_metrics`:

| Política | Comando | Regra |
|---|---|---|
| `student_own_health_metrics` | ALL | `student_id = auth.uid()` |
| `specialist_read_linked_health_metrics` | SELECT | vínculo em `student_specialists` com `status = 'active'` |

---

## Implementação

### Mobile (`app/src/`)

| Tipo | Arquivo | Responsabilidade |
|------|---------|-----------------|
| Hook | `hooks/useHealthData.ts` | Leitura em foreground, estado da UI, exporta `readDeviceMetrics` |
| Service | `services/healthSync.ts` | Gate de sessão + consentimento, chave de data local |
| Task | `services/backgroundHealthTask.ts` | `BACKGROUND_HEALTH_SYNC`, intervalo de 30 min |
| Screen | `app/onboarding/health-connect.tsx` | Permissão do SO + registro do consentimento |
| Screen | `app/(tabs)/index.tsx` | Badge `Live` / `Simulado` conforme a origem |

### Compartilhado (`shared/src/`)

| Tipo | Arquivo | Responsabilidade |
|------|---------|-----------------|
| Schema | `database/schema/health.ts` | Tabela Drizzle + unique `(student_id, date)` |
| Service | `services/health.service.ts` | Upsert, consulta por intervalo, consentimento |
| Types | `types/health.types.ts` | `HealthDailyMetric`, `HealthMetricInput` |

---

## Regras de negócio

1. Sem sessão ativa, nada é persistido.
2. Sem `student_consents.health_data_collection` vigente, o dado é exibido na tela
   e descartado — nunca chega ao banco.
3. Dado de origem `mock` nunca é persistido, apenas exibido com badge `Simulado`.
4. O especialista lê, nunca escreve; perde o acesso assim que o vínculo deixa de
   ser `active`.
5. A escrita é idempotente por `(student_id, date)` — reenviar o mesmo dia
   sobrescreve, não soma.
6. Revogar o consentimento interrompe a coleta e preserva o histórico.

## Decisões técnicas não-óbvias

- **Task separada de `BACKGROUND_DIET_SYNC`**: acoplar os dois faria um erro do
  Health Connect suprimir o reagendamento de notificação de refeição.
- **`localDateKey` em vez de `toISOString()`**: `toISOString` converte para UTC e,
  em fuso negativo perto da meia-noite, gravaria no dia anterior — quebrando a
  chave `(student_id, date)`.
- **Agregado diário, nunca a série bruta**: a granularidade fina do Health Connect
  permitiria inferir rotina e deslocamento, além da finalidade declarada.
- **`source` no retorno do hook**: o mock de `__DEV__` tem valor no emulador; o
  defeito era ser indistinguível de leitura real, não existir.
- **Permissão do SO ≠ consentimento LGPD**: a primeira autoriza ler do dispositivo,
  o segundo autoriza armazenar. O onboarding registra os dois.

## Divergências web ↔ mobile

- Feature é mobile-only. O web não lê nem exibe estas métricas nesta entrega.
- **iOS não entregue**: não existe projeto nativo `app/ios/`. O código HealthKit
  em `useHealthData` compila e roda em foreground, mas `readDeviceMetrics` retorna
  `null` fora do Android, então não há persistência nem background no iOS.
