import type { CardioModalityId } from './store/cardioSessionMachine';

/** Medida que aparece ao vivo, conforme o que a modalidade consegue medir. */
export type LiveMetric =
  | 'calories'
  | 'distance'
  | 'pace'
  | 'speed'
  | 'cadence'
  | 'intensity'
  | 'laps';

/** O objeto do palco que o kit desenha. Caminhada, corrida e elíptico usam a esteira. */
export type CardioHeroKind = 'bike' | 'treadmill' | 'swim';

export interface CardioModality {
  id: CardioModalityId;
  /** O nome gravado em `activity_name` e mostrado na tela. */
  activityName: string;
  /** METs aproximados, para a estimativa de calorias. */
  met: number;
  /** A modalidade anda por um percurso: o GPS mede distância, ritmo e parciais. */
  usesGps: boolean;
  /** O contador de passos do aparelho dá a cadência. */
  countsSteps: boolean;
  heroKind: CardioHeroKind;
  liveMetrics: readonly LiveMetric[];
}

/**
 * As cinco modalidades do cardio livre (issue #304).
 *
 * O GPS liga só nas três ao ar livre: no elíptico e na natação não há percurso, e
 * pedir localização seria coleta sem finalidade (Art. 6°, III). A cadência vem do
 * contador de passos, então só caminhada e corrida a têm.
 */
export const CARDIO_MODALITIES: readonly CardioModality[] = [
  {
    id: 'walk',
    activityName: 'Caminhada',
    met: 3.5,
    usesGps: true,
    countsSteps: true,
    heroKind: 'treadmill',
    liveMetrics: ['calories', 'distance', 'pace', 'cadence', 'laps'],
  },
  {
    id: 'run',
    activityName: 'Corrida',
    met: 8,
    usesGps: true,
    countsSteps: true,
    heroKind: 'treadmill',
    liveMetrics: ['calories', 'distance', 'pace', 'cadence', 'laps'],
  },
  {
    id: 'bike',
    activityName: 'Bicicleta',
    met: 6,
    usesGps: true,
    countsSteps: false,
    heroKind: 'bike',
    liveMetrics: ['calories', 'distance', 'speed', 'laps'],
  },
  {
    id: 'elliptical',
    activityName: 'Elíptico',
    met: 5,
    usesGps: false,
    countsSteps: false,
    heroKind: 'treadmill',
    liveMetrics: ['calories', 'intensity', 'laps'],
  },
  {
    id: 'swim',
    activityName: 'Natação',
    met: 7,
    usesGps: false,
    countsSteps: false,
    heroKind: 'swim',
    liveMetrics: ['calories', 'intensity', 'laps'],
  },
];

/**
 * A modalidade pelo id.
 *
 * @example cardioModality('run').usesGps // true
 */
export function cardioModality(id: CardioModalityId): CardioModality {
  const found = CARDIO_MODALITIES.find((modality) => modality.id === id);
  if (!found)
    throw new Error(
      `modalidade de cardio desconhecida: "${id}" (esperado: walk, run, bike, elliptical ou swim)`
    );
  return found;
}

/**
 * A modalidade pelo nome gravado, para o "Repetir a última". Nome antigo que não
 * existe mais no catálogo devolve `null`, e o cartão some.
 *
 * @example modalityByActivityName('Bicicleta')?.id // 'bike'
 */
export function modalityByActivityName(activityName: string): CardioModality | null {
  return CARDIO_MODALITIES.find((modality) => modality.activityName === activityName) ?? null;
}
