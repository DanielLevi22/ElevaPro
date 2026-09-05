import {
  queryCategorySamples,
  queryStatisticsForQuantity,
  requestAuthorization,
} from '@kingstinct/react-native-healthkit';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { getGrantedPermissions, initialize, readRecords } from 'react-native-health-connect';
import { localDateKey, syncDailyMetrics } from '@/services/healthSync';

/**
 * Origem do dado exibido. Existe porque o fallback de desenvolvimento é
 * indistinguível de leitura real no tipo antigo — a UI precisa poder sinalizar
 * que o número é simulado, senão falha de permissão parece dado congelado.
 */
export type HealthDataSource = 'device' | 'mock' | 'unavailable';

export interface HealthData {
  steps: number;
  calories: number;
  /** Minutos dormidos na noite anterior. `null` = sem leitura, nunca zero. */
  sleepMinutes: number | null;
  /** FC de repouso em bpm. `null` = sem leitura. */
  restingHeartRate: number | null;
  loading: boolean;
  error: string | null;
  source: HealthDataSource;
}

interface HealthMetrics {
  steps: number;
  calories: number;
  /**
   * Nulo é ausência de leitura, e zero é uma leitura de zero — a mesma
   * distinção que `hasRecords` faz para passos, aplicada por métrica. Sem ela,
   * "o relógio não mediu o sono" e "a pessoa não dormiu" chegam idênticos ao
   * banco, e o segundo apaga o primeiro.
   */
  sleepMinutes: number | null;
  restingHeartRate: number | null;
  /**
   * Falso quando o Health Connect não devolveu nenhum registro.
   *
   * Sem esta bandeira, "o aparelho não anda desde a meia-noite" e "a leitura
   * foi negada" chegam idênticos aqui — os dois viram `{ steps: 0 }`. O
   * segundo caso sobrescrevia o agregado bom com zero.
   */
  hasRecords: boolean;
}

const MOCK_METRICS: HealthMetrics = {
  steps: 7543,
  calories: 450,
  sleepMinutes: 431,
  restingHeartRate: 58,
  hasRecords: true,
};

const IOS_AUTH = {
  toRead: [
    'HKQuantityTypeIdentifierStepCount',
    'HKQuantityTypeIdentifierActiveEnergyBurned',
    'HKQuantityTypeIdentifierRestingHeartRate',
    'HKCategoryTypeIdentifierSleepAnalysis',
  ],
} as const;

/**
 * Estágios que contam como sono dormido.
 *
 * `inBed` (0) e `awake` (2) ficam de fora: deitar às 22h e dormir às 23h30 são
 * uma hora e meia que não é sono, e somá-la infla a duração em quem demora a
 * pegar no sono — justamente quem o especialista precisaria enxergar.
 *
 * Os três estágios finos são somados sem distinção porque a Onda 1 guarda só a
 * duração. Separar leve, profundo e REM é decisão de minimização tomada na
 * migration 0046, não limitação da API.
 */
const ESTAGIOS_DORMIDOS = new Set([1, 3, 4, 5]);

/**
 * Janela de sono: ontem ao meio-dia até hoje ao meio-dia.
 *
 * Não é o dia civil. Quem dorme às 23h teria a noite partida em dois dias por
 * `todayRange()`, e cada metade seria gravada num registro diferente — o
 * especialista veria duas noites de quatro horas onde houve uma de oito. O
 * corte ao meio-dia é o mesmo que Apple e Google usam para atribuir uma noite a
 * um dia, e sobrevive a quem dorme de madrugada.
 */
function sleepRange(): { startTime: string; endTime: string } {
  const end = new Date();
  end.setHours(12, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - 1);
  return { startTime: start.toISOString(), endTime: end.toISOString() };
}

function todayRange(): { startTime: string; endTime: string } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { startTime: start.toISOString(), endTime: end.toISOString() };
}

/**
 * Checa permissões do Health Connect de forma auto-suficiente.
 *
 * Sempre chama `initialize()` antes de consultar: o SDK rejeita
 * `getGrantedPermissions()` num cliente não inicializado, e este caminho roda
 * no retorno do background, quando o processo pode ter sido recriado.
 *
 * @example
 * if (await hasAndroidPermissions()) await readAndroidMetrics();
 */
async function hasAndroidPermissions(options?: { background?: boolean }): Promise<boolean> {
  const isInitialized = await initialize();
  if (!isInitialized) return false;

  const granted = await getGrantedPermissions();
  const canRead = (recordType: string) =>
    granted.some((p) => p.recordType === recordType && p.accessType === 'read');

  if (!canRead('Steps') || !canRead('ActiveCaloriesBurned')) return false;

  // Sono e FC de repouso são permissões próprias, e a ausência de uma não
  // invalida a leitura das outras: o aluno pode conceder passos e negar sono, e
  // negar sono não é motivo para a tela inteira dizer "sem permissão". Por isso
  // não entram na recusa acima — cada leitura decide sozinha, em
  // `readAndroidMetrics`.

  // A leitura em background exige uma permissão própria, concedida à parte das
  // comuns. Sem ela o Health Connect devolve lista vazia em vez de recusar —
  // o dano já está contido por `hasRecords`, mas sem esta checagem ninguém
  // sabe *por que* o background nunca traz nada.
  if (options?.background && !canRead('BackgroundAccessPermission')) {
    console.log('[HealthConnect] leitura em background sem permissão própria');
    return false;
  }

  return true;
}

/**
 * Leitura sem React, para a task de background reaproveitar exatamente as
 * mesmas regras de permissão e agregação que a UI usa.
 *
 * Retorna `null` quando não há permissão ou o SDK falhou — nunca lança, porque
 * o chamador é um TaskManager que não tem onde tratar exceção.
 *
 * @example
 * const metrics = await readDeviceMetrics();
 * if (metrics) await syncDailyMetrics({ date, ...metrics });
 */
export async function readDeviceMetrics(): Promise<HealthMetrics | null> {
  try {
    // O iOS saía aqui com `return null` e a task de background nunca lia nada:
    // `readIOSMetrics` existia, não era exportada, e ninguém a chamava. Em iOS
    // a sincronização era um no-op completo.
    if (Platform.OS === 'ios') {
      const metrics = await readIOSMetrics();
      return metrics.hasRecords ? metrics : null;
    }

    if (Platform.OS !== 'android') return null;
    if (!(await hasAndroidPermissions({ background: true }))) return null;

    const metrics = await readAndroidMetrics();

    // Leitura sem nenhum registro vira ausência, não zero. Gravar `{steps: 0}`
    // aqui sobrescreveria o agregado que o primeiro plano já salvou — o dado
    // não sumia por não ser lido, sumia por ser sobrescrito.
    if (!metrics.hasRecords) return null;

    return metrics;
  } catch {
    return null;
  }
}

/**
 * Minutos dormidos na noite, do Health Connect.
 *
 * Prefere os estágios quando a fonte os escreve e cai para a duração da sessão
 * quando não escreve — Zepp, Mi Fitness e Garmin Connect divergem nisso, e a
 * mesma marca muda de comportamento entre versões. Somar `stages` de quem não
 * os manda daria zero num aluno que dormiu.
 *
 * Devolve `null` quando não houve sessão nenhuma: ausência de leitura não pode
 * chegar ao banco como uma noite de zero minuto.
 */
async function readAndroidSleep(): Promise<number | null> {
  try {
    const { records } = await readRecords('SleepSession', {
      timeRangeFilter: { operator: 'between', ...sleepRange() },
    });
    if (records.length === 0) return null;

    const minutos = records.reduce((total, session) => {
      const stages = session.stages ?? [];
      const dormidos = stages.filter((stage) => ESTAGIOS_DORMIDOS.has(stage.stage));

      if (dormidos.length > 0) {
        return (
          total + dormidos.reduce((acc, s) => acc + intervaloEmMinutos(s.startTime, s.endTime), 0)
        );
      }
      return total + intervaloEmMinutos(session.startTime, session.endTime);
    }, 0);

    return metricaValida(minutos, 1, 1440);
  } catch {
    // Permissão de sono negada isoladamente não pode derrubar passos.
    return null;
  }
}

function intervaloEmMinutos(inicio: string, fim: string): number {
  const minutos = (new Date(fim).getTime() - new Date(inicio).getTime()) / 60000;
  // Data ausente ou ilegível produz NaN, e NaN atravessa soma, `Math.round` e
  // `JSON.stringify` sem reclamar — chega ao banco como null e some do dia sem
  // erro nenhum. Registro malformado vale zero, não contamina a noite inteira.
  return Number.isFinite(minutos) && minutos > 0 ? minutos : 0;
}

/**
 * Barreira entre a leitura do aparelho e o banco.
 *
 * As duas SDKs devolvem objetos tipados, mas o objeto vem de um app de
 * terceiro — Zepp, Mi Fitness, Garmin Connect — que pode gravar campo faltando
 * ou fora de escala. Sem esta guarda, `NaN` e `Infinity` viram null na
 * serialização e o dia perde a métrica silenciosamente; um valor absurdo bate
 * no CHECK da 0046 e derruba a gravação inteira, levando junto os passos que
 * estavam certos.
 */
function metricaValida(valor: number, minimo: number, maximo: number): number | null {
  if (!Number.isFinite(valor)) return null;
  const arredondado = Math.round(valor);
  return arredondado >= minimo && arredondado <= maximo ? arredondado : null;
}

/**
 * FC de repouso do dia. O relógio grava um valor por dia; se houver mais de um,
 * o mais recente é o que a fonte considera consolidado.
 */
async function readAndroidRestingHeartRate(): Promise<number | null> {
  try {
    const { records } = await readRecords('RestingHeartRate', {
      timeRangeFilter: { operator: 'between', ...todayRange() },
    });
    if (records.length === 0) return null;

    const maisRecente = records.reduce((atual, record) =>
      new Date(record.time) > new Date(atual.time) ? record : atual
    );
    return metricaValida(maisRecente.beatsPerMinute, 20, 200);
  } catch {
    return null;
  }
}

async function readAndroidMetrics(): Promise<HealthMetrics> {
  const timeRangeFilter = { operator: 'between' as const, ...todayRange() };

  const [stepsResult, caloriesResult, sleepMinutes, restingHeartRate] = await Promise.all([
    readRecords('Steps', { timeRangeFilter }),
    readRecords('ActiveCaloriesBurned', { timeRangeFilter }),
    readAndroidSleep(),
    readAndroidRestingHeartRate(),
  ]);

  const steps = stepsResult.records.reduce((acc, record) => acc + record.count, 0);
  const calories = caloriesResult.records.reduce(
    (acc, record) => acc + record.energy.inKilocalories,
    0
  );

  // O Health Connect devolve lista vazia quando a leitura é negada, em vez de
  // lançar — inclusive quando falta `READ_HEALTH_DATA_IN_BACKGROUND`, que é
  // concedida à parte das permissões comuns.
  const hasRecords = stepsResult.records.length > 0 || caloriesResult.records.length > 0;

  return { steps, calories: Math.round(calories), sleepMinutes, restingHeartRate, hasRecords };
}

/** Em dev o emulador não tem Health Connect; sem o mock a tela fica sempre vazia. */
function unavailableState(reason: string): HealthData {
  if (__DEV__) {
    console.log(`[HealthConnect] ${reason} — usando dados MOCK (source: 'mock').`);
    return { ...MOCK_METRICS, loading: false, error: null, source: 'mock' };
  }
  return {
    steps: 0,
    calories: 0,
    sleepMinutes: null,
    restingHeartRate: null,
    loading: false,
    error: reason,
    source: 'unavailable',
  };
}

export function useHealthData() {
  const [data, setData] = useState<HealthData>({
    steps: 0,
    calories: 0,
    sleepMinutes: null,
    restingHeartRate: null,
    loading: true,
    error: null,
    source: 'unavailable',
  });

  const loadAndroid = useCallback(async () => {
    try {
      if (!(await hasAndroidPermissions())) {
        setData(unavailableState('Permissão não concedida'));
        return;
      }
      const metrics = await readAndroidMetrics();
      setData({ ...metrics, loading: false, error: null, source: 'device' });

      // Persiste só leitura real, e só quando houve registro. O mock nunca
      // chega ao banco, e zero-por-ausência nunca sobrescreve zero-medido.
      if (metrics.hasRecords) {
        await syncDailyMetrics({
          date: localDateKey(),
          steps: metrics.steps,
          active_calories: metrics.calories,
          // `?? undefined` e não `?? null`: nulo aqui apagaria a leitura boa de
          // mais cedo. Ver `upsertDaily`.
          sleep_minutes: metrics.sleepMinutes ?? undefined,
          resting_heart_rate: metrics.restingHeartRate ?? undefined,
        });
      }
    } catch (err: unknown) {
      const reason = err instanceof Error ? err.message : String(err);
      console.log('[HealthConnect] Falha ao ler dados:', reason);
      setData(unavailableState(reason));
    }
  }, []);

  const loadIOS = useCallback(async () => {
    try {
      const granted = await requestAuthorization(IOS_AUTH);
      if (!granted) {
        setData(unavailableState('Permissão não concedida'));
        return;
      }
      setData({ ...(await readIOSMetrics()), loading: false, error: null, source: 'device' });
    } catch (err: unknown) {
      const reason = err instanceof Error ? err.message : String(err);
      console.log('[HealthKit] Falha ao ler dados:', reason);
      setData(unavailableState(reason));
    }
  }, []);

  const refetch = useCallback(async () => {
    setData((prev) => ({ ...prev, loading: true }));
    if (Platform.OS === 'ios') {
      await loadIOS();
      return;
    }
    await loadAndroid();
  }, [loadAndroid, loadIOS]);

  useEffect(() => {
    refetch();

    // Health Connect acumula durante o background; só reconciliamos ao voltar.
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') refetch();
    });

    return () => subscription.remove();
  }, [refetch]);

  return { ...data, refetch, hasPermissions: data.source === 'device' };
}

/**
 * Total do dia no HealthKit.
 *
 * `queryStatisticsForQuantity` com `cumulativeSum` devolve o agregado pronto,
 * o que dispensa somar amostras na mão como fazia a API antiga.
 */
async function readIOSMetrics(): Promise<HealthMetrics> {
  const { startTime, endTime } = todayRange();
  const filter = {
    filter: { date: { startDate: new Date(startTime), endDate: new Date(endTime) } },
  };

  const [stepsStats, caloriesStats, sleepMinutes, restingHeartRate] = await Promise.all([
    queryStatisticsForQuantity('HKQuantityTypeIdentifierStepCount', ['cumulativeSum'], filter),
    queryStatisticsForQuantity(
      'HKQuantityTypeIdentifierActiveEnergyBurned',
      ['cumulativeSum'],
      filter
    ),
    readIOSSleep(),
    readIOSRestingHeartRate(),
  ]);

  // `sumQuantity` ausente é o equivalente iOS da lista vazia do Android: não
  // houve amostra no período. Distinto de ter havido e somado zero.
  const semAmostra = stepsStats.sumQuantity == null && caloriesStats.sumQuantity == null;

  return {
    steps: Math.round(stepsStats.sumQuantity?.quantity ?? 0),
    calories: Math.round(caloriesStats.sumQuantity?.quantity ?? 0),
    sleepMinutes,
    restingHeartRate,
    hasRecords: !semAmostra,
  };
}

/**
 * Minutos dormidos na noite, do HealthKit.
 *
 * O HealthKit devolve uma amostra por trecho de estágio, e o iPhone e o Apple
 * Watch escrevem os mesmos trechos — somar tudo contaria a noite duas vezes.
 * Por isso a soma é feita sobre a **união dos intervalos**, e não sobre a
 * duração de cada amostra.
 */
async function readIOSSleep(): Promise<number | null> {
  try {
    const { startTime, endTime } = sleepRange();
    const samples = await queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', {
      filter: { date: { startDate: new Date(startTime), endDate: new Date(endTime) } },
      // Uma noite fragmentada rende dezenas de trechos, e o iPhone duplica os do
      // relógio. O teto é folgado de propósito: cortar cedo demais truncaria a
      // noite pelo fim e a leitura sairia menor sem erro nenhum.
      limit: 2000,
    });

    const dormidos = samples
      .filter((sample) => ESTAGIOS_DORMIDOS.has(sample.value))
      .map((sample) => ({
        inicio: new Date(sample.startDate).getTime(),
        fim: new Date(sample.endDate).getTime(),
      }))
      .sort((a, b) => a.inicio - b.inicio);

    if (dormidos.length === 0) return null;

    let total = 0;
    let janelaInicio = dormidos[0].inicio;
    let janelaFim = dormidos[0].fim;

    for (const trecho of dormidos.slice(1)) {
      if (trecho.inicio <= janelaFim) {
        janelaFim = Math.max(janelaFim, trecho.fim);
        continue;
      }
      total += janelaFim - janelaInicio;
      janelaInicio = trecho.inicio;
      janelaFim = trecho.fim;
    }
    total += janelaFim - janelaInicio;

    return metricaValida(total / 60000, 1, 1440);
  } catch {
    return null;
  }
}

/** FC de repouso do dia. `discreteAverage` porque o HealthKit grava várias. */
async function readIOSRestingHeartRate(): Promise<number | null> {
  try {
    const { startTime, endTime } = todayRange();
    const stats = await queryStatisticsForQuantity(
      'HKQuantityTypeIdentifierRestingHeartRate',
      ['discreteAverage'],
      { filter: { date: { startDate: new Date(startTime), endDate: new Date(endTime) } } }
    );
    const media = stats.averageQuantity?.quantity;
    return media == null ? null : metricaValida(media, 20, 200);
  } catch {
    return null;
  }
}
