/**
 * Mede distância e ritmo a partir das posições de GPS de uma corrida.
 *
 * As posições entram e **não saem**: o percurso é medida derivada, e a série de
 * coordenadas não é devolvida nem persistida em lugar nenhum. Ela revela
 * endereço de casa e janela de ausência sem mudar nenhuma decisão de prescrição
 * — ver a issue #278 e a §2.3 de `docs/LGPD_COMPLIANCE.md`.
 */

/** Raio médio da Terra, em metros. */
const RAIO_DA_TERRA = 6_371_000;

/**
 * Acima disto o fix é chute do aparelho, não posição. O expo-location reporta
 * `accuracy` como raio de incerteza em metros; com `BestForNavigation` a
 * corrida a céu aberto fica na casa de 5 m, e o que passa de 30 m é reflexo em
 * prédio ou perda de satélite.
 */
const PRECISAO_MINIMA_METROS = 30;

/**
 * 25 m/s são 90 km/h. Nenhuma atividade do app chega perto — o recorde dos 100 m
 * rasos é 10,4 m/s e uma descida de bicicleta passa raspando de 20 m/s. Serve
 * para cortar o salto de satélite, que aparece como centenas de m/s.
 */
const VELOCIDADE_MAXIMA_M_POR_S = 25;

/**
 * Abaixo disto o ritmo é aritmética sem significado: 40 minutos parado num
 * semáforo, com 3 m de deriva de GPS, dariam 13 dias por quilômetro.
 */
const DISTANCIA_MINIMA_PARA_RITMO = 50;

/**
 * Faixa que o CHECK da migration `0049` aceita. Precisa ser respeitada **aqui**,
 * e não só no banco: o INSERT recusado não descarta o ritmo, derruba a gravação
 * da sessão inteira — a corrida some junto com o número ruim.
 *
 * 60 s/km são 60 km/h, teto de bicicleta; 3600 s/km é 1 km/h, mais lento que
 * caminhada de idoso. O corte de distância acima não cobre este caso: 60 m de
 * deriva ao longo de 40 minutos passam dele e dariam 40000 s/km.
 */
const RITMO_MINIMO_S_POR_KM = 60;
const RITMO_MAXIMO_S_POR_KM = 3600;

export interface Posicao {
  latitude: number;
  longitude: number;
  /** Milissegundos desde a época, do fix do GPS — nunca do relógio da tela. */
  timestamp: number;
  /** Raio de incerteza em metros, como o expo-location entrega. */
  accuracy?: number | null;
}

export interface Percurso {
  distanceMeters: number;
  /** `null` quando não houve percurso suficiente para o ritmo significar algo. */
  paceSecondsPerKm: number | null;
}

const PERCURSO_VAZIO: Percurso = { distanceMeters: 0, paceSecondsPerKm: null };

function paraRadianos(graus: number): number {
  return (graus * Math.PI) / 180;
}

/** Distância de grande círculo entre dois pontos, em metros (haversine). */
function distanciaEntre(origem: Posicao, destino: Posicao): number {
  const deltaLat = paraRadianos(destino.latitude - origem.latitude);
  const deltaLon = paraRadianos(destino.longitude - origem.longitude);
  const latOrigem = paraRadianos(origem.latitude);
  const latDestino = paraRadianos(destino.latitude);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(latOrigem) * Math.cos(latDestino) * Math.sin(deltaLon / 2) ** 2;

  return RAIO_DA_TERRA * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function temPrecisaoUtil(posicao: Posicao): boolean {
  // Ausência de `accuracy` não é imprecisão: alguns aparelhos simplesmente não
  // reportam. Descartar por omissão zeraria a corrida inteira nesses.
  return posicao.accuracy == null || posicao.accuracy <= PRECISAO_MINIMA_METROS;
}

interface TrustedStep {
  from: Posicao;
  to: Posicao;
  meters: number;
}

/**
 * Os trechos confiáveis de uma corrida, já sem o ruído do GPS: sem fix impreciso e
 * sem salto de satélite. É a mesma régua para a distância total e para as parciais.
 */
function trustedSteps(confiaveis: Posicao[]): TrustedStep[] {
  const steps: TrustedStep[] = [];
  let anterior = confiaveis[0];

  for (const atual of confiaveis.slice(1)) {
    const trecho = distanciaEntre(anterior, atual);
    const segundos = (atual.timestamp - anterior.timestamp) / 1000;

    // O salto é descartado sem virar âncora: manter `anterior` faz o ponto
    // seguinte ser medido a partir do último lugar onde o aluno realmente
    // esteve, em vez de somar o salto de ida e o de volta.
    if (segundos <= 0 || trecho / segundos > VELOCIDADE_MAXIMA_M_POR_S) continue;

    steps.push({ from: anterior, to: atual, meters: trecho });
    anterior = atual;
  }
  return steps;
}

/**
 * Distância e ritmo de uma corrida, ignorando o ruído do GPS.
 *
 * @example
 * const { distanceMeters, paceSecondsPerKm } = medirPercurso(posicoes);
 */
export function medirPercurso(posicoes: Posicao[]): Percurso {
  const confiaveis = posicoes.filter(temPrecisaoUtil);
  if (confiaveis.length < 2) return PERCURSO_VAZIO;

  const distanceMeters = trustedSteps(confiaveis).reduce((total, step) => total + step.meters, 0);
  if (distanceMeters < DISTANCIA_MINIMA_PARA_RITMO) {
    return { distanceMeters, paceSecondsPerKm: null };
  }

  const segundosTotais =
    (confiaveis[confiaveis.length - 1].timestamp - confiaveis[0].timestamp) / 1000;
  const ritmo = Math.round(segundosTotais / (distanceMeters / 1000));

  const persistivel = ritmo >= RITMO_MINIMO_S_POR_KM && ritmo <= RITMO_MAXIMO_S_POR_KM;

  return { distanceMeters, paceSecondsPerKm: persistivel ? ritmo : null };
}

/** Um intervalo em pausa, em instantes. `end` nulo é pausa ainda aberta. */
export interface PausedRange {
  start: number;
  end: number | null;
}

export interface KmSplit {
  km: number;
  /** Tempo em movimento do quilômetro, sem as pausas. */
  seconds: number;
}

function pausedMsBetween(from: number, to: number, pauses: PausedRange[]): number {
  return pauses.reduce((total, pause) => {
    const overlap = Math.min(to, pause.end ?? to) - Math.max(from, pause.start);
    return total + Math.max(0, overlap);
  }, 0);
}

/** O instante em que o trecho cruza a distância pedida, por interpolação linear. */
function crossingInstant(step: TrustedStep, metersIntoStep: number): number {
  const fraction = step.meters === 0 ? 0 : metersIntoStep / step.meters;
  return step.from.timestamp + (step.to.timestamp - step.from.timestamp) * fraction;
}

/**
 * Uma parcial a cada quilômetro completo, com o tempo em movimento de cada um. O
 * quilômetro incompleto do fim não entra. As posições entram e não saem: só o tempo
 * por quilômetro é devolvido (issue #278).
 *
 * @example
 * kmSplits(positions, session.pauses) // [{ km: 1, seconds: 342 }, { km: 2, seconds: 331 }]
 */
export function kmSplits(posicoes: Posicao[], pauses: PausedRange[]): KmSplit[] {
  const steps = trustedSteps(posicoes.filter(temPrecisaoUtil));
  const splits: KmSplit[] = [];
  let covered = 0;
  let lastCrossing = steps[0]?.from.timestamp ?? 0;

  for (const step of steps) {
    while (covered + step.meters >= (splits.length + 1) * 1000) {
      const crossing = crossingInstant(step, (splits.length + 1) * 1000 - covered);
      const movingMs = crossing - lastCrossing - pausedMsBetween(lastCrossing, crossing, pauses);
      splits.push({ km: splits.length + 1, seconds: Math.round(movingMs / 1000) });
      lastCrossing = crossing;
    }
    covered += step.meters;
  }
  return splits;
}
