import { trendGeometry } from '../trendGeometry';

const BOX = { width: 320, height: 110 };
const WEEKS = [
  { assessedAt: '2026-09-14T10:00:00Z', weightKg: 78.4 },
  { assessedAt: '2026-09-28T10:00:00Z', weightKg: 77.6 },
  { assessedAt: '2026-09-21T10:00:00Z', weightKg: 78 },
];

describe('o gráfico da tendência do peso', () => {
  it('põe a pesagem mais antiga à esquerda, mesmo vindo da mais recente', () => {
    const geometry = trendGeometry(WEEKS, -0.5, BOX);
    const xs = geometry.points.map((point) => point.x);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
    expect(geometry.points[0].key).toBe('2026-09-14T10:00:00Z');
  });

  it('desenha a faixa do ritmo e a tendência a partir de duas pesagens', () => {
    const geometry = trendGeometry(WEEKS, -0.5, BOX);
    expect(geometry.band?.area).toMatch(/^M.* Z$/);
    expect(geometry.trend).toMatch(/^M/);
  });

  /** Regressão: com duas pesagens a média juntava as duas e a linha ficava reta, longe dos pontos. */
  it('com duas pesagens, a tendência liga os dois pontos', () => {
    const geometry = trendGeometry(WEEKS.slice(0, 2), -0.5, BOX);
    const [first, last] = geometry.points.sort((a, b) => a.x - b.x);
    expect(geometry.trend).toBe(`M${first.x} ${first.y} L${last.x} ${last.y}`);
  });

  it('com uma pesagem só, não inventa tendência nem faixa', () => {
    const geometry = trendGeometry(WEEKS.slice(0, 1), -0.5, BOX);
    expect(geometry.trend).toBeNull();
    expect(geometry.band).toBeNull();
    expect(geometry.points).toHaveLength(1);
  });

  it('sem pesagem, diz isso em vez de quebrar', () => {
    expect(trendGeometry([], -0.5, BOX).label).toBe('Sem pesagens ainda');
  });

  it('fica dentro da caixa', () => {
    for (const point of trendGeometry(WEEKS, -0.5, BOX).points) {
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(BOX.width);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThanOrEqual(BOX.height);
    }
  });
});
