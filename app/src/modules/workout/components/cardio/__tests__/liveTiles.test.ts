import { cardioModality } from '../../../cardioModalities';
import type { CardioReading } from '../../../services/cardioMetrics';
import { inRowsOfThree, liveTiles } from '../liveTiles';

const reading: CardioReading = {
  elapsedMs: 18.6 * 60_000,
  calories: 164.4,
  distanceMeters: 7400,
  paceSecondsPerKm: 151,
  cadenceSpm: null,
  laps: 3,
};

describe('blocos da sessão ao vivo', () => {
  it('a bicicleta mostra velocidade, e não ritmo nem cadência', () => {
    const labels = liveTiles(cardioModality('bike'), reading).map((tile) => tile.label);

    expect(labels).toEqual(['Queima', 'Distância', 'Velocidade', 'Voltas']);
  });

  it('o elíptico não mostra distância: não há percurso', () => {
    const metrics = liveTiles(cardioModality('elliptical'), reading).map((tile) => tile.metric);

    expect(metrics).toEqual(['calories', 'laps']);
  });

  it('medida sem leitura aparece como traço, e não como zero', () => {
    const tiles = liveTiles(cardioModality('run'), { ...reading, distanceMeters: 0 });

    expect(tiles.find((tile) => tile.metric === 'distance')?.value).toBe('—');
    expect(tiles.find((tile) => tile.metric === 'cadence')?.value).toBe('—');
  });

  it('escreve os números como o kit', () => {
    const tiles = liveTiles(cardioModality('bike'), reading);

    expect(tiles.map((tile) => tile.value)).toEqual(['164', '7,4', '23,9', '3']);
  });

  it('agrupa em filas de três', () => {
    expect(inRowsOfThree([1, 2, 3, 4, 5])).toEqual([
      [1, 2, 3],
      [4, 5],
    ]);
  });
});
