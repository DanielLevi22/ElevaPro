/**
 * A geometria dos gráficos do kit de métricas, fora dos componentes.
 *
 * Coordenada com uma casa: o SVG não ganha nada com a sexta casa decimal, e o
 * caminho da curva de 52 semanas fica com um terço do tamanho.
 */

export type Point = readonly [number, number];

const round = (value: number) => Math.round(value * 10) / 10;

/**
 * A curva do kit (`smoothPath`): Catmull-Rom em Bézier cúbica, suave sem inventar
 * pico que os dados não têm entre dois pontos vizinhos.
 *
 * @example smoothPath([[0, 10], [50, 4], [100, 8]]) // "M0,10 C…"
 */
export function smoothPath(points: readonly Point[]): string {
  if (points.length < 2) return '';
  let path = `M${round(points[0][0])},${round(points[0][1])}`;
  for (let index = 0; index < points.length - 1; index++) {
    const p0 = points[index - 1] ?? points[index];
    const p1 = points[index];
    const p2 = points[index + 1];
    const p3 = points[index + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    path += ` C${round(c1[0])},${round(c1[1])} ${round(c2[0])},${round(c2[1])} ${round(p2[0])},${round(p2[1])}`;
  }
  return path;
}

/**
 * Os pontos de uma série com buracos: `null` some, e o ponto seguinte fica na
 * própria posição, e não colado no anterior.
 *
 * @example seriesPoints([3, null, 5], 100, (v) => v) // [[0, 3], [100, 5]]
 */
export function seriesPoints(
  values: readonly (number | null)[],
  width: number,
  toY: (value: number) => number
): Point[] {
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  return values.flatMap((value, index) =>
    value === null ? [] : [[round(index * step), round(toY(value))] as const]
  );
}

/**
 * Até `count` rótulos espalhados pela série, sempre com o primeiro e o último.
 *
 * @example evenLabels(["S1","S2","S3","S4","S5"], 3) // ["S1","S3","S5"]
 */
export function evenLabels<T>(items: readonly T[], count: number): T[] {
  if (items.length <= count) return [...items];
  const step = (items.length - 1) / (count - 1);
  return Array.from({ length: count }, (_, index) => items[Math.round(index * step)]);
}
