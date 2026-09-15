import {
  getGrantedPermissions,
  initialize,
  openHealthConnectSettings,
  readRecords,
  requestPermission,
  revokeAllPermissions,
} from 'react-native-health-connect';
import { registrarAviso } from '@/lib/registro';
import { ASLEEP_STAGES, type DailyAggregate, sleepRange, todayRange } from './daily';
import { healthConnectReadTypes } from './permissions';
import type {
  BackgroundReadStatus,
  DisconnectResult,
  ReadContext,
  WearablePlatform,
} from './platform';
import { plausibleInteger, RESTING_BPM, SLEEP_MINUTES } from './plausible';
import { minutesBetween } from './time';
import type { Capability, TimeRange, WearableReader } from './types';

type ProbeType = 'Steps' | 'ActiveCaloriesBurned' | 'SleepSession' | 'RestingHeartRate';

interface TimeRangeQuery {
  timeRangeFilter: { operator: 'between'; startTime: string; endTime: string };
}

function between({ start, end }: TimeRange): TimeRangeQuery {
  return {
    timeRangeFilter: {
      operator: 'between',
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    },
  };
}

async function isAvailable(): Promise<boolean> {
  try {
    return await initialize();
  } catch {
    return false;
  }
}

/**
 * Há ao menos um registro do tipo no intervalo?
 *
 * Uma página de um registro basta para provar a capacidade: ler a semana inteira
 * só para contar traria série de dado de saúde sem uso. Falha é "não há", o mesmo
 * que o Health Connect responde quando a leitura foi negada.
 */
async function hasAnyRecord(type: ProbeType, range: TimeRange): Promise<boolean> {
  if (!(await isAvailable())) return false;
  try {
    const { records } = await readRecords(type, { ...between(range), pageSize: 1 });
    return records.length > 0;
  } catch {
    return false;
  }
}

async function heartRateSamples(range: TimeRange): Promise<number[]> {
  if (!(await isAvailable())) return [];
  try {
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
 * Sempre inicializa antes de consultar: o SDK rejeita `getGrantedPermissions()`
 * num cliente não inicializado, e este caminho roda no retorno do background,
 * quando o processo pode ter sido recriado.
 */
async function ensureTodayAccess(context: ReadContext): Promise<boolean> {
  if (!(await initialize())) return false;
  const granted = await getGrantedPermissions();
  const canRead = (recordType: string): boolean =>
    granted.some(
      (permission) => permission.recordType === recordType && permission.accessType === 'read'
    );

  // Sono e FC de repouso são permissões próprias, e negar uma não é motivo para a
  // tela inteira dizer "sem permissão": cada leitura decide sozinha.
  if (!canRead('Steps') || !canRead('ActiveCaloriesBurned')) return false;
  if (context === 'foreground' || canRead('BackgroundAccessPermission')) return true;

  // Sem a permissão de background o Health Connect devolve lista vazia em vez de
  // recusar, e ninguém saberia por que o background nunca traz nada.
  registrarAviso('wearable.background_without_permission', { platform: 'health_connect' });
  return false;
}

interface SleepSession {
  startTime: string;
  endTime: string;
  stages?: { stage: number; startTime: string; endTime: string }[];
}

function intervalMinutes(start: string, end: string): number {
  const minutes = minutesBetween(new Date(start).getTime(), new Date(end).getTime());
  // Data ausente ou ilegível produz NaN, que atravessa soma e serialização sem
  // reclamar. Registro malformado vale zero, e não contamina a noite inteira.
  return Number.isFinite(minutes) && minutes > 0 ? minutes : 0;
}

/**
 * Prefere os estágios quando a fonte os escreve e cai para a duração da sessão
 * quando não escreve — Zepp, Mi Fitness e Garmin Connect divergem nisso, e a mesma
 * marca muda entre versões. Somar `stages` de quem não os manda daria zero.
 */
function asleepMinutes(session: SleepSession): number {
  const asleep = (session.stages ?? []).filter((stage) => ASLEEP_STAGES.has(stage.stage));
  if (asleep.length === 0) return intervalMinutes(session.startTime, session.endTime);
  return asleep.reduce(
    (total, stage) => total + intervalMinutes(stage.startTime, stage.endTime),
    0
  );
}

/** Minutos dormidos na noite, ou `null` quando não houve sessão nenhuma. */
async function readSleepMinutes(): Promise<number | null> {
  try {
    const { records } = await readRecords('SleepSession', between(sleepRange()));
    if (records.length === 0) return null;
    const minutes = records.reduce((total, session) => total + asleepMinutes(session), 0);
    return plausibleInteger(minutes, SLEEP_MINUTES);
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
    const { records } = await readRecords('RestingHeartRate', between(todayRange()));
    if (records.length === 0) return null;
    const latest = records.reduce((current, record) =>
      new Date(record.time) > new Date(current.time) ? record : current
    );
    return plausibleInteger(latest.beatsPerMinute, RESTING_BPM);
  } catch {
    return null;
  }
}

async function readToday(): Promise<DailyAggregate> {
  const query = between(todayRange());
  const [stepsResult, caloriesResult, sleepMinutes, restingHeartRate] = await Promise.all([
    readRecords('Steps', query),
    readRecords('ActiveCaloriesBurned', query),
    readSleepMinutes(),
    readRestingHeartRate(),
  ]);

  const steps = stepsResult.records.reduce((total, record) => total + record.count, 0);
  const kcal = caloriesResult.records.reduce(
    (total, record) => total + record.energy.inKilocalories,
    0
  );
  // Lista vazia é o que o Health Connect devolve quando a leitura é negada, em vez
  // de lançar — inclusive sem a permissão de background.
  const hasRecords = stepsResult.records.length > 0 || caloriesResult.records.length > 0;
  return { steps, calories: Math.round(kcal), sleepMinutes, restingHeartRate, hasRecords };
}

/**
 * Sono e FC são pedidos junto, mas recusá-los é escolha legítima que não pode
 * barrar o resto: o Art. 8°, §4° anula autorização em bloco. Por isso só passos ou
 * calorias decidem.
 */
async function requestPermissions(capabilities: readonly Capability[]): Promise<boolean> {
  const types = healthConnectReadTypes(capabilities);
  const granted = await requestPermission(
    types.map((recordType) => ({ accessType: 'read' as const, recordType }))
  );
  return granted.some(
    (permission) =>
      permission.accessType === 'read' &&
      (permission.recordType === 'Steps' || permission.recordType === 'ActiveCaloriesBurned')
  );
}

/**
 * Num pedido à parte: o Health Connect só concede a leitura em background depois
 * das permissões comuns, e misturada a elas o diálogo volta vazio.
 */
async function requestBackgroundRead(): Promise<void> {
  try {
    await requestPermission([{ accessType: 'read', recordType: 'BackgroundAccessPermission' }]);
  } catch {
    registrarAviso('wearable.background_unavailable', { platform: 'health_connect' });
  }
}

async function backgroundReadStatus(): Promise<BackgroundReadStatus> {
  if (!(await isAvailable())) return 'denied';
  const granted = await getGrantedPermissions();
  const hasBackground = granted.some(
    (permission) =>
      permission.recordType === 'BackgroundAccessPermission' && permission.accessType === 'read'
  );
  return hasBackground ? 'granted' : 'denied';
}

async function openSettings(): Promise<void> {
  openHealthConnectSettings();
}

/**
 * Revoga tudo o que o app recebeu. O Health Connect aplica a revogação quando o app
 * reinicia, mas a partir daqui nenhuma leitura nova é pedida.
 */
async function disconnect(): Promise<DisconnectResult> {
  if (await isAvailable()) await revokeAllPermissions();
  return 'revoked';
}

/** O Health Connect, no Android. */
export const healthConnectPlatform: WearablePlatform = {
  name: 'health_connect',
  reader: healthConnectReader,
  isAvailable,
  requestPermissions,
  requestBackgroundRead,
  ensureTodayAccess,
  readToday,
  backgroundReadStatus,
  openSettings,
  disconnect,
};
