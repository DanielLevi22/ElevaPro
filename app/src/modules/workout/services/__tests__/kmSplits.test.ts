import { kmSplits, type Posicao } from '../percurso';

const T0 = 1_000_000;

/** Pontos em linha reta rumo ao norte, `metersPerStep` a cada `secondsPerStep`. */
function straightRun(steps: number, metersPerStep: number, secondsPerStep: number): Posicao[] {
  const degreesPerMeter = 1 / 111_195;
  return Array.from({ length: steps + 1 }, (_, i) => ({
    latitude: -3.7 + i * metersPerStep * degreesPerMeter,
    longitude: -38.5,
    timestamp: T0 + i * secondsPerStep * 1000,
    accuracy: 5,
  }));
}

describe('kmSplits', () => {
  it('fecha uma parcial a cada quilômetro, com o tempo que ele levou', () => {
    // 10 m a cada 3 s: 1 km em 300 s.
    const splits = kmSplits(straightRun(250, 10, 3), []);
    expect(splits.map((split) => split.km)).toEqual([1, 2]);
    expect(splits[0].seconds).toBeCloseTo(300, 0);
    expect(splits[1].seconds).toBeCloseTo(300, 0);
  });

  it('o km incompleto do fim não vira parcial', () => {
    expect(kmSplits(straightRun(90, 10, 3), [])).toEqual([]);
  });

  // Parar num semáforo com a sessão pausada não pode entrar na parcial: o tempo da
  // pausa sai da conta do quilômetro em que ela aconteceu.
  it('desconta da parcial o tempo em pausa', () => {
    const points = straightRun(110, 10, 3);
    const paused = { start: T0 + 60_000, end: T0 + 180_000 };
    const shifted = points.map((point) =>
      point.timestamp > paused.start ? { ...point, timestamp: point.timestamp + 120_000 } : point
    );

    const [first] = kmSplits(shifted, [paused]);
    expect(first.seconds).toBeCloseTo(300, 0);
  });

  it('ignora o salto de satélite, como a distância total', () => {
    const points = straightRun(110, 10, 3);
    points[50] = { ...points[50], latitude: points[50].latitude + 0.05 };
    const [first] = kmSplits(points, []);
    expect(first.seconds).toBeCloseTo(300, -1);
  });
});
