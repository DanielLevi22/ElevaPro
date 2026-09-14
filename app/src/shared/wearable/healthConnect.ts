import {
  getGrantedPermissions,
  initialize,
  readRecords,
  requestPermission,
} from 'react-native-health-connect';
import { registrarAviso } from '@/lib/registro';
import {
  ASLEEP_STAGES,
  type DailyAggregate,
  RESTING_BPM,
  SLEEP_MINUTES,
  sleepRange,
  todayRange,
} from './daily';
import { healthConnectReadTypes } from './permissions';
import { plausibleInteger } from './plausible';
import type { Capability, TimeRange, WearableReader } from './types';

type ReadableType = 'Steps' | 'ActiveCaloriesBurned' | 'SleepSession' | 'RestingHeartRate';

function between({ start, end }: TimeRange) {
  return {
    timeRangeFilter: {
      operator: 'between' as const,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    },
  };
}

/**
 * Há ao menos um registro do tipo no intervalo?
 *
 * Uma página de um registro basta para provar a capacidade: ler a semana inteira
 * só para contar traria série de dado de saúde sem uso. Falha é "não há", o mesmo
 * que o Health Connect responde quando a leitura foi negada.
 */
async function hasAnyRecord(type: ReadableType, range: TimeRange): Promise<boolean> {
  try {
    if (!(await initialize())) return false;
    const { records } = await readRecords(type, { ...between(range), pageSize: 1 });
    return records.length > 0;
  } catch {
    return false;
  }
}

async function heartRateSamples(range: TimeRange): Promise<number[]> {
  try {
    if (!(await initialize())) return [];
    const { records } = await readRecords('HeartRate', between(range));
    // Cada registro carrega uma série de amostras. A média é a das amostras, não
    // a das séries: séries têm tamanhos diferentes, e a média de médias daria peso
    // igual a um bloco de 2 e a um de 200.
    return records.flatMap((record) =>
      (record.samples ?? []).map((sample) => sample.beatsPerMinute)
    );
  } catch {
    return [];
  }
}

/** O leitor do Health Connect para a detecção de capacidades e a média da sessão. */
export const healthConnectReader: WearableReader = {
  hasDailyActivity: async (range) =>
    (await hasAnyRecord('Steps', range)) || hasAnyRecord('ActiveCaloriesBurned', range),
  hasSleep: (range) => hasAnyRecord('SleepSession', range),
  hasRestingHeartRate: (range) => hasAnyRecord('RestingHeartRate', range),
  heartRateSamples,
};

/**
 * O Health Connect existe e responde neste aparelho? A causa mais comum de não
 * responder é não estar instalado.
 *
 * @example
 * if (!(await isHealthConnectAvailable())) showAlert(...);
 */
export async function isHealthConnectAvailable(): Promise<boolean> {
  try {
    return await initialize();
  } catch {
    return false;
  }
}

/**
 * O app pode ler o dia no Health Connect?
 *
 * Sempre chama `initialize()` antes de consultar: o SDK rejeita
 * `getGrantedPermissions()` num cliente não inicializado, e este caminho roda no
 * retorno do background, quando o processo pode ter sido recriado.
 *
 * @example
 * if (await canReadHealthConnectToday({ background: true })) await readHealthConnectToday();
 */
export async function canReadHealthConnectToday(options: { background: boolean }) {
  if (!(await initialize())) return false;

  const granted = await getGrantedPermissions();
  const canRead = (recordType: string) =>
    granted.some((p) => p.recordType === recordType && p.accessType === 'read');

  // Sono e FC de repouso são permissões próprias, e a ausência de uma não invalida
  // a leitura das outras: negar o sono não é motivo para a tela inteira dizer
  // "sem permissão". Cada leitura decide sozinha, em `readHealthConnectToday`.
  if (!canRead('Steps') || !canRead('ActiveCaloriesBurned')) return false;

  // A leitura em background exige permissão própria. Sem ela o Health Connect
  // devolve lista vazia em vez de recusar, e ninguém saberia por que o background
  // nunca traz nada.
  if (options.background && !canRead('BackgroundAccessPermission')) {
    registrarAviso('relogio.background_sem_permissao', { plataforma: 'health_connect' });
    return false;
  }
  return true;
}

function minutesBetween(start: string, end: string): number {
  const minutes = (new Date(end).getTime() - new Date(start).getTime()) / 60000;
  // Data ausente ou ilegível produz NaN, que atravessa soma e serialização sem
  // reclamar. Registro malformado vale zero, e não contamina a noite inteira.
  return Number.isFinite(minutes) && minutes > 0 ? minutes : 0;
}

interface SleepSession {
  startTime: string;
  endTime: string;
  stages?: { stage: number; startTime: string; endTime: string }[];
}

/**
 * Prefere os estágios quando a fonte os escreve e cai para a duração da sessão
 * quando não escreve — Zepp, Mi Fitness e Garmin Connect divergem nisso, e a mesma
 * marca muda entre versões. Somar `stages` de quem não os manda daria zero.
 */
function asleepMinutes(session: SleepSession): number {
  const asleep = (session.stages ?? []).filter((stage) => ASLEEP_STAGES.has(stage.stage));
  if (asleep.length === 0) return minutesBetween(session.startTime, session.endTime);
  return asleep.reduce((total, stage) => total + minutesBetween(stage.startTime, stage.endTime), 0);
}

/** Minutos dormidos na noite, ou `null` quando não houve sessão nenhuma. */
async function readSleepMinutes(): Promise<number | null> {
  try {
    const { records } = await readRecords('SleepSession', {
      timeRangeFilter: { operator: 'between', ...sleepRange() },
    });
    if (records.length === 0) return null;
    const minutes = records.reduce((total, session) => total + asleepMinutes(session), 0);
    return plausibleInteger(minutes, SLEEP_MINUTES.min, SLEEP_MINUTES.max);
  } catch {
    // Permissão de sono negada isoladamente não pode derrubar passos.
    return null;
  }
}

/**
 * FC de repouso do dia. O relógio grava um valor por dia; se houver mais de um, o
 * mais recente é o que a fonte considera consolidado.
 */
async function readRestingHeartRate(): Promise<number | null> {
  try {
    const { records } = await readRecords('RestingHeartRate', {
      timeRangeFilter: { operator: 'between', ...todayRange() },
    });
    if (records.length === 0) return null;
    const latest = records.reduce((current, record) =>
      new Date(record.time) > new Date(current.time) ? record : current
    );
    return plausibleInteger(latest.beatsPerMinute, RESTING_BPM.min, RESTING_BPM.max);
  } catch {
    return null;
  }
}

/**
 * O agregado de hoje no Health Connect. Chamar depois de `canReadHealthConnectToday`.
 *
 * @example
 * const today = await readHealthConnectToday();
 */
export async function readHealthConnectToday(): Promise<DailyAggregate> {
  const timeRangeFilter = { operator: 'between' as const, ...todayRange() };
  const [stepsResult, caloriesResult, sleepMinutes, restingHeartRate] = await Promise.all([
    readRecords('Steps', { timeRangeFilter }),
    readRecords('ActiveCaloriesBurned', { timeRangeFilter }),
    readSleepMinutes(),
    readRestingHeartRate(),
  ]);

  const steps = stepsResult.records.reduce((total, record) => total + record.count, 0);
  const calories = caloriesResult.records.reduce(
    (total, record) => total + record.energy.inKilocalories,
    0
  );
  // Lista vazia é o que o Health Connect devolve quando a leitura é negada, em vez
  // de lançar — inclusive sem a permissão de background.
  const hasRecords = stepsResult.records.length > 0 || caloriesResult.records.length > 0;
  return { steps, calories: Math.round(calories), sleepMinutes, restingHeartRate, hasRecords };
}

/**
 * Pede a leitura dos tipos das capacidades. Devolve se passos ou calorias foram
 * concedidos: sono e FC são pedidos junto, mas recusá-los é escolha legítima que
 * não pode barrar o resto (Art. 8°, §4° anula autorização em bloco).
 *
 * @example
 * const granted = await requestHealthConnectPermissions(ALL_CAPABILITIES);
 */
export async function requestHealthConnectPermissions(capabilities: Capability[]) {
  const granted = await requestPermission(
    healthConnectReadTypes(capabilities).map((recordType) => ({
      accessType: 'read' as const,
      recordType,
    }))
  );
  return granted.some(
    (p) =>
      p.accessType === 'read' &&
      (p.recordType === 'Steps' || p.recordType === 'ActiveCaloriesBurned')
  );
}

/**
 * Pede a leitura em background, num pedido à parte: o Health Connect só a concede
 * depois de as permissões comuns existirem, e misturada a elas o diálogo volta
 * vazio. Recusar é escolha legítima e não bloqueia nada.
 *
 * @example
 * await requestHealthConnectBackgroundRead();
 */
export async function requestHealthConnectBackgroundRead(): Promise<void> {
  try {
    await requestPermission([{ accessType: 'read', recordType: 'BackgroundAccessPermission' }]);
  } catch {
    registrarAviso('relogio.background_indisponivel', { plataforma: 'health_connect' });
  }
}
