import { averageSessionHeartRate } from '../sessionHeartRate';
import type { TimeRange, WearableReader } from '../types';

const START = new Date('2026-09-02T18:41:00Z');
const END = new Date('2026-09-02T19:41:04Z');

function readerWith(samples: number[] | Error) {
  const ranges: TimeRange[] = [];
  const reader: WearableReader = {
    hasDailyActivity: async () => false,
    hasSleep: async () => false,
    hasRestingHeartRate: async () => false,
    heartRateSamples: async (range) => {
      ranges.push(range);
      if (samples instanceof Error) throw samples;
      return samples;
    },
  };
  return { reader, ranges };
}

describe('averageSessionHeartRate', () => {
  it('devolve a média das amostras da janela da sessão', async () => {
    const { reader, ranges } = readerWith([160, 164, 168]);

    await expect(averageSessionHeartRate(reader, START, END)).resolves.toBe(164);
    expect(ranges).toEqual([{ start: START, end: END }]);
  });

  // LGPD, Art. 6°, III, e ADR-0024. A série de batimentos permite inferir
  // estresse e crise de ansiedade, muito além de acompanhar treino. Por isso o
  // que sai daqui é um número, e a lista lida morre dentro do módulo. Devolver a
  // série "para a tela desenhar" é exatamente o que esta trava existe para barrar.
  it('devolve só a média, nunca a lista de amostras', async () => {
    const { reader } = readerWith([150, 152, 154]);

    const result: unknown = await averageSessionHeartRate(reader, START, END);

    if (typeof result !== 'number') {
      throw new Error(
        `SÉRIE DE BATIMENTOS EXPOSTA: saiu ${JSON.stringify(result)} em vez da média`
      );
    }
  });

  // Ausência de leitura é nulo, nunca zero: zero bpm gravado como medida
  // significaria parada cardíaca.
  it('devolve nulo quando não há amostra na janela', async () => {
    await expect(averageSessionHeartRate(readerWith([]).reader, START, END)).resolves.toBeNull();
  });

  // Falha de leitura e ausência de batimento significam o mesmo para quem grava:
  // não há o que gravar, e a sessão segue sem a FC.
  it('devolve nulo quando a leitura falha', async () => {
    const { reader } = readerWith(new Error('permission denied'));
    await expect(averageSessionHeartRate(reader, START, END)).resolves.toBeNull();
  });

  // Erro de unidade passaria despercebido: o CHECK da `0049` recusaria a linha e
  // a sessão inteira falharia ao gravar.
  it('descarta a média fora da faixa fisiológica', async () => {
    await expect(
      averageSessionHeartRate(readerWith([9, 11]).reader, START, END)
    ).resolves.toBeNull();
  });

  it('não lê nada quando a sessão não tem duração', async () => {
    const { reader, ranges } = readerWith([150]);

    await expect(averageSessionHeartRate(reader, END, START)).resolves.toBeNull();
    expect(ranges).toEqual([]);
  });
});
