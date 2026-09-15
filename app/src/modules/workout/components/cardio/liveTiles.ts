import type { Ionicons } from '@expo/vector-icons';
import type { CardioModality, LiveMetric } from '../../cardioModalities';
import {
  type CardioReading,
  formatKilometers,
  formatPace,
  speedKmh,
} from '../../services/cardioMetrics';
import type { MetricTone } from './MetricTile';

export interface TileSpec {
  metric: LiveMetric;
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  unit?: string;
  label: string;
  tone: MetricTone;
}

/** Sem leitura, traço: zero afirmaria que o aluno não saiu do lugar. */
const NO_READING = '—';

type TileBuilder = (reading: CardioReading) => Omit<TileSpec, 'metric'>;

const BUILDERS: Record<Exclude<LiveMetric, 'intensity'>, TileBuilder> = {
  calories: ({ calories }) => ({
    icon: 'flame-outline',
    value: String(Math.round(calories)),
    unit: 'kcal',
    label: 'Queima',
    tone: 'primary',
  }),
  distance: ({ distanceMeters }) => ({
    icon: 'map-outline',
    value: distanceMeters > 0 ? formatKilometers(distanceMeters) : NO_READING,
    unit: 'km',
    label: 'Distância',
    tone: 'pace',
  }),
  pace: ({ paceSecondsPerKm }) => ({
    icon: 'speedometer-outline',
    value: paceSecondsPerKm === null ? NO_READING : formatPace(paceSecondsPerKm),
    unit: '/km',
    label: 'Ritmo',
    tone: 'pace',
  }),
  speed: ({ distanceMeters, elapsedMs }) => {
    const speed = speedKmh(distanceMeters, elapsedMs);
    return {
      icon: 'speedometer-outline',
      value: speed === null ? NO_READING : speed.toFixed(1).replace('.', ','),
      unit: 'km/h',
      label: 'Velocidade',
      tone: 'pace',
    };
  },
  cadence: ({ cadenceSpm }) => ({
    icon: 'footsteps-outline',
    value: cadenceSpm === null ? NO_READING : String(cadenceSpm),
    unit: 'spm',
    label: 'Cadência',
    tone: 'cadence',
  }),
  laps: ({ laps }) => ({
    icon: 'flag-outline',
    value: String(laps),
    label: laps === 1 ? 'Volta' : 'Voltas',
    tone: 'muted',
  }),
};

/**
 * Os blocos da sessão ao vivo, na ordem do catálogo da modalidade. A intensidade
 * não é bloco: tem a linha de barras dela.
 *
 * @example liveTiles(cardioModality('bike'), reading).map((tile) => tile.label)
 * // ['Queima', 'Distância', 'Velocidade', 'Voltas']
 */
export function liveTiles(modality: CardioModality, reading: CardioReading): TileSpec[] {
  return modality.liveMetrics
    .filter((metric): metric is Exclude<LiveMetric, 'intensity'> => metric !== 'intensity')
    .map((metric) => ({ metric, ...BUILDERS[metric](reading) }));
}

/**
 * Em filas de três, como o kit as põe.
 *
 * @example inRowsOfThree([1, 2, 3, 4]) // [[1, 2, 3], [4]]
 */
export function inRowsOfThree<T>(items: readonly T[]): T[][] {
  const rows: T[][] = [];
  for (let start = 0; start < items.length; start += 3) rows.push(items.slice(start, start + 3));
  return rows;
}
