import type { WeightPoint } from '@elevapro/shared';

export interface TrendGeometry {
  points: { key: string; x: number; y: number }[];
  /** A média móvel de três pesagens: o peso de um dia oscila com água. Com menos, liga os pontos. */
  trend: string | null;
  last: { x: number; y: number } | null;
  /** A faixa do ritmo da meta a partir da primeira pesagem. */
  band: { area: string; upper: string; lower: string } | null;
  label: string;
}

/** A mesma tolerância da recalibração (`weeklyRecalibration`). */
const PACE_TOLERANCE_KG = 0.2;
const PADDING = 10;
const MARGIN_KG = 0.15;
const DAY_MS = 86_400_000;

const kg = (value: number) => value.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

/**
 * As coordenadas do gráfico de tendência (A5) num espaço `width × height`, com
 * a pesagem mais antiga à esquerda.
 *
 * @example trendGeometry(proposta.weights, -0.5, { width: 320, height: 110 }).trend
 */
export function trendGeometry(
  weights: WeightPoint[],
  expectedChangeKg: number | null,
  box: { width: number; height: number }
): TrendGeometry {
  const sorted = [...weights].sort((a, b) => a.assessedAt.localeCompare(b.assessedAt));
  if (sorted.length === 0) {
    return { points: [], trend: null, last: null, band: null, label: 'Sem pesagens ainda' };
  }

  const days = sorted.map((point) => daysBetween(sorted[0].assessedAt, point.assessedAt));
  const span = Math.max(days[days.length - 1], 1);
  const bandAt = (day: number) => sorted[0].weightKg + ((expectedChangeKg ?? 0) * day) / 7;
  const withBand = expectedChangeKg !== null && sorted.length > 1;

  const values = sorted.map((point) => point.weightKg);
  if (withBand) values.push(bandAt(0), bandAt(span));
  const min = Math.min(...values) - PACE_TOLERANCE_KG - MARGIN_KG;
  const max = Math.max(...values) + PACE_TOLERANCE_KG + MARGIN_KG;

  const x = (day: number) =>
    sorted.length === 1 ? box.width / 2 : PADDING + (day / span) * (box.width - 2 * PADDING);
  const y = (weight: number) =>
    PADDING + ((max - weight) / (max - min)) * (box.height - 2 * PADDING);

  const points = sorted.map((point, i) => ({
    key: point.assessedAt,
    x: x(days[i]),
    y: y(point.weightKg),
  }));
  const averaged = movingAverage(sorted.map((point) => point.weightKg));
  const trendPoints = averaged.map((weight, i) => ({ x: x(days[i]), y: y(weight) }));

  return {
    points,
    trend: trendPoints.length > 1 ? polyline(trendPoints) : null,
    last: trendPoints[trendPoints.length - 1],
    band: withBand ? bandPaths(x, y, bandAt, span) : null,
    label: `Peso de ${kg(sorted[0].weightKg)} kg para ${kg(sorted[sorted.length - 1].weightKg)} kg`,
  };
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS);
}

/** Com menos de três pesagens não há o que suavizar: a média juntava as duas num ponto só. */
const MIN_FOR_AVERAGE = 3;

function movingAverage(values: number[]): number[] {
  if (values.length < MIN_FOR_AVERAGE) return values;
  return values.map((_, i) => {
    const window = values.slice(Math.max(0, i - 1), i + 2);
    return window.reduce((sum, value) => sum + value, 0) / window.length;
  });
}

function polyline(points: { x: number; y: number }[]): string {
  return points.map((point, i) => `${i ? 'L' : 'M'}${point.x} ${point.y}`).join(' ');
}

function bandPaths(
  x: (day: number) => number,
  y: (weight: number) => number,
  bandAt: (day: number) => number,
  span: number
): NonNullable<TrendGeometry['band']> {
  const upper = [
    { x: x(0), y: y(bandAt(0) + PACE_TOLERANCE_KG) },
    { x: x(span), y: y(bandAt(span) + PACE_TOLERANCE_KG) },
  ];
  const lower = [
    { x: x(0), y: y(bandAt(0) - PACE_TOLERANCE_KG) },
    { x: x(span), y: y(bandAt(span) - PACE_TOLERANCE_KG) },
  ];
  return {
    upper: polyline(upper),
    lower: polyline(lower),
    area: `${polyline([...upper, ...lower.reverse()])} Z`,
  };
}
