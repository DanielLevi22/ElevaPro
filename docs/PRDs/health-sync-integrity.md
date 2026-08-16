# PRD: health-sync-integrity

**Data de criação:** 2026-08-12
**Status:** approved
**Branch:** feature/health-sync-integrity
**Autor:** Daniel Levi

---

## As 3 perguntas obrigatórias

> Nenhuma linha de código é escrita sem estas 3 perguntas respondidas.

### O quê?

Fazer a sincronização de passos e calorias funcionar — e, quando não funcionar,
dizer por quê em vez de mostrar zero.

### Por quê?

Passos e calorias não aparecem na tela. O registro da task de background está
correto (`_layout.tsx` chama `registerHealthSyncAsync`) e a permissão está
declarada no `app.json`, então o problema não é o óbvio. São quatro defeitos,
dois deles certos pela leitura do código.

### Como saberemos que está pronto?

- [x] Passos e calorias aparecem na tela em um aparelho com Health Connect
- [x] A leitura em background funciona no Android e no iOS
- [ ] Permissão negada, sessão ausente e falha de rede aparecem como três
      estados distintos — nenhum deles é "zero"
- [x] Uma leitura vazia nunca sobrescreve um agregado já gravado

---

## Contexto

Levantado em 2026-08-12 a partir do relato de que a contagem de calorias e de
passos não funciona. Fluxo: `useHealthData` (UI) e `backgroundHealthTask`
(30 min) → `readDeviceMetrics` → `healthSync.syncDailyMetrics` → Supabase.

### F1 — No iOS o background é um no-op completo 🔴

```ts
export async function readDeviceMetrics(): Promise<HealthMetrics | null> {
  if (Platform.OS !== 'android') return null;   // ← iOS sai aqui
```

A leitura de HealthKit existe (`readIOSMetrics`), mas não é exportada e a task
de background nunca a chama. Em iOS a task sempre devolve `NoData`.

Não é o que se vê hoje, porque o iOS nunca foi buildado (dívida 15 do STATUS) —
mas é uma feature que já nasce quebrada naquela plataforma.

### F2 — Leitura vazia é indistinguível de leitura real 🔴

`hasAndroidPermissions()` confere `Steps` e `ActiveCaloriesBurned`. Não confere
**`READ_HEALTH_DATA_IN_BACKGROUND`**, que está declarada no `app.json` mas
precisa ser concedida pelo usuário à parte — o Android só permite pedi-la
depois das permissões comuns.

Sem ela, o Health Connect devolve **lista vazia** em vez de lançar. Então:

```ts
const steps = stepsResult.records.reduce((acc, r) => acc + r.count, 0);  // 0
return { steps, calories: 0 };   // não é null → segue adiante
```

E `syncDailyMetrics` grava zero por cima do agregado bom que a UI tinha salvo em
primeiro plano. O dado não some por não ser lido: some por ser sobrescrito.

### F3 — Nada reporta por que não funcionou 🟠

A task converte três desfechos diferentes no mesmo valor:

```ts
return outcome === 'saved'
  ? BackgroundFetch.BackgroundFetchResult.NewData
  : BackgroundFetch.BackgroundFetchResult.NoData;   // no-session, no-consent, failed
```

Não há como saber, de fora, se o problema é permissão, consentimento, sessão ou
rede. É o mesmo padrão dos outros achados deste projeto: **falha e ausência com
a mesma aparência.**

### F4 — Sessão do Supabase no background 🟡 (hipótese)

No background o contexto JS é recriado. `supabase.auth.getSession()` depende do
storage ter hidratado; se a task rodar antes disso, devolve `no-session` e nada
é gravado, em silêncio.

Não confirmado — exige aparelho. Fica registrado porque, se F2 e F3 forem
corrigidos, o log passa a dizer se é isto.

---

## Parecer LGPD

> Aplicado o `/lgpd-check`. Passos e calorias são dado de saúde (Art. 11).

**Bloco A — Necessidade** ✅ Agregado diário, sem série temporal fina. É o
mínimo para acompanhamento.

**Bloco B — Base legal** ✅ `syncDailyMetrics` já checa
`hasCollectionConsent` antes de persistir, e o dado pode ser exibido sem ser
gravado. O desenho está certo.

**Bloco C — Segurança** ⚠️ `student_id` vem da sessão, não do parâmetro — bom.
Ao corrigir F3, o log não pode passar a imprimir o número de passos: é dado de
saúde e não vai para observabilidade em texto claro (Art. 6°, VII). O log atual
já respeita isso; a correção precisa manter.

**Bloco D — Direitos** ⚠️ Verificar se o agregado diário está coberto pela
exportação e pela exclusão de conta.

---

## Escopo

### Incluído

**Fase 1 — parar de gravar zero**
- Distinguir "sem permissão" de "zero passos": leitura sem nenhum registro
  devolve ausência, não `{steps: 0}`
- `hasAndroidPermissions()` passa a conferir `READ_HEALTH_DATA_IN_BACKGROUND`
  no caminho de background
- Um agregado já gravado nunca é sobrescrito por leitura vazia

**Fase 2 — dizer por que falhou**
- A task registra o `SyncOutcome` em log estruturado, sem o valor lido
- A tela separa "permissão negada", "sem consentimento" e "falha" — com ação
  para os dois primeiros

**Fase 3 — iOS**
- `readDeviceMetrics` passa a atender iOS chamando `readIOSMetrics`
- Verificar `UIBackgroundModes` e o comportamento real do HealthKit em background

### Fora do escopo

- **Escrever no Health Connect.** As permissões `WRITE_*` estão declaradas mas
  nada as usa; decidir se saem é outro trabalho.
- **Série temporal por hora.** O agregado diário basta e coleta menos.
- **Substituir o `expo-background-fetch`.** O intervalo que o SO concede é o
  que é; trocar de biblioteca não muda isso.

---

## Referências

- `app/src/hooks/useHealthData.ts`
- `app/src/services/backgroundHealthTask.ts`
- `app/src/services/healthSync.ts`
- `shared/src/services/health.service.ts`
