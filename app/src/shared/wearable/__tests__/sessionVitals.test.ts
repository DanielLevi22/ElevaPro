import { vitalsFromReader } from '../sessionVitals';
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

describe('vitalsFromReader', () => {
  it('devolve a média das amostras da janela da sessão', async () => {
    const { reader, ranges } = readerWith([160, 164, 168]);

    const vitals = await vitalsFromReader(reader, { start: START, end: END }, null);

    expect(vitals?.avgHeartRate).toBe(164);
    expect(ranges).toEqual([{ start: START, end: END }]);
  });

  it('sem fc máxima, devolve a média e nenhuma zona', async () => {
    const vitals = await vitalsFromReader(
      readerWith([150]).reader,
      { start: START, end: END },
      null
    );
    expect(vitals).toEqual({ avgHeartRate: 150, zones: null });
  });

  it('com fc máxima, distribui as amostras nas cinco zonas', async () => {
    const vitals = await vitalsFromReader(
      readerWith([100, 130, 150, 170, 190]).reader,
      { start: START, end: END },
      200
    );
    expect(vitals?.zones).toEqual({ zone1: 20, zone2: 20, zone3: 20, zone4: 20, zone5: 20 });
  });

  // LGPD, Art. 6°, III, e ADR-0024. A série de batimentos permite inferir estresse
  // e crise de ansiedade, muito além de acompanhar treino. O que sai daqui é a média
  // e cinco percentuais, e a lista lida morre dentro do módulo. Devolver a série
  // "para a tela desenhar" é exatamente o que esta trava existe para barrar.
  it('a leitura dos sinais vitais devolve média e zonas, nunca a série', async () => {
    const vitals = await vitalsFromReader(
      readerWith([150, 152, 154]).reader,
      { start: START, end: END },
      190
    );

    const leaked = JSON.stringify(vitals);
    if (leaked.includes('[')) {
      throw new Error(`SÉRIE DE BATIMENTOS EXPOSTA: a leitura devolveu ${leaked}`);
    }
  });

  // Ausência de leitura é nulo, nunca zero: zero bpm gravado como medida
  // significaria parada cardíaca.
  it('devolve nulo quando não há amostra na janela', async () => {
    await expect(
      vitalsFromReader(readerWith([]).reader, { start: START, end: END }, 190)
    ).resolves.toBeNull();
  });

  // Falha de leitura e ausência de batimento significam o mesmo para quem grava:
  // não há o que gravar, e a sessão segue sem a FC.
  it('devolve nulo quando a leitura falha', async () => {
    const { reader } = readerWith(new Error('permission denied'));
    await expect(vitalsFromReader(reader, { start: START, end: END }, 190)).resolves.toBeNull();
  });

  // Erro de unidade passaria despercebido: o CHECK da `0049` recusaria a linha e
  // a sessão inteira falharia ao gravar.
  it('descarta a média fora da faixa fisiológica', async () => {
    await expect(
      vitalsFromReader(readerWith([9, 11]).reader, { start: START, end: END }, 190)
    ).resolves.toBeNull();
  });

  it('não lê nada quando a sessão não tem duração', async () => {
    const { reader, ranges } = readerWith([150]);

    await expect(vitalsFromReader(reader, { start: END, end: START }, 190)).resolves.toBeNull();
    expect(ranges).toEqual([]);
  });
});
