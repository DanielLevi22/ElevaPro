import { Platform } from 'react-native';
import { readRecords } from 'react-native-health-connect';
import { mediaDeBatimentos } from '../frequenciaDaSessao';

jest.mock('react-native-health-connect', () => ({
  readRecords: jest.fn(),
}));

jest.mock('@kingstinct/react-native-healthkit', () => ({
  queryStatisticsForQuantity: jest.fn(),
}));

const mockReadRecords = readRecords as unknown as jest.Mock;

const INICIO = new Date('2026-09-02T18:41:00Z');
const FIM = new Date('2026-09-02T19:41:04Z');

/** Amostra no formato que o Health Connect devolve para `HeartRate`. */
function amostras(...bpm: number[]) {
  return [{ samples: bpm.map((beatsPerMinute) => ({ beatsPerMinute })) }];
}

describe('mediaDeBatimentos', () => {
  beforeEach(() => {
    Platform.OS = 'android';
    jest.clearAllMocks();
  });

  it('devolve a média das amostras do período', async () => {
    mockReadRecords.mockResolvedValue({ records: amostras(160, 164, 168) });

    await expect(mediaDeBatimentos(INICIO, FIM)).resolves.toBe(164);
  });

  it('lê só o intervalo da sessão', async () => {
    mockReadRecords.mockResolvedValue({ records: amostras(150) });

    await mediaDeBatimentos(INICIO, FIM);

    expect(mockReadRecords).toHaveBeenCalledWith('HeartRate', {
      timeRangeFilter: {
        operator: 'between',
        startTime: INICIO.toISOString(),
        endTime: FIM.toISOString(),
      },
    });
  });

  // Ausência de leitura é nulo, nunca zero — a mesma distinção que o
  // `hasRecords` de `useHealthData` fez para passos. Zero bpm gravado como
  // medida significaria parada cardíaca.
  it('devolve nulo quando não há registro no período', async () => {
    mockReadRecords.mockResolvedValue({ records: [] });

    await expect(mediaDeBatimentos(INICIO, FIM)).resolves.toBeNull();
  });

  it('devolve nulo quando o registro vem sem amostra', async () => {
    mockReadRecords.mockResolvedValue({ records: [{ samples: [] }] });

    await expect(mediaDeBatimentos(INICIO, FIM)).resolves.toBeNull();
  });

  // O Health Connect devolve lista vazia quando a permissão é negada, em vez de
  // lançar. Falha de leitura e ausência de batimento chegam aqui iguais, e as
  // duas significam a mesma coisa para quem grava: não há o que gravar.
  it('devolve nulo quando a leitura falha', async () => {
    mockReadRecords.mockRejectedValue(new Error('permission denied'));

    await expect(mediaDeBatimentos(INICIO, FIM)).resolves.toBeNull();
  });

  // Erro de unidade é a falha real deste caminho, e passaria despercebida para
  // sempre: o banco recusaria a linha e a sessão inteira falharia ao gravar.
  it('descarta a média fora da faixa fisiológica', async () => {
    mockReadRecords.mockResolvedValue({ records: amostras(9, 11) });

    await expect(mediaDeBatimentos(INICIO, FIM)).resolves.toBeNull();
  });

  it('não lê nada quando a sessão não tem duração', async () => {
    await expect(mediaDeBatimentos(FIM, INICIO)).resolves.toBeNull();
    expect(mockReadRecords).not.toHaveBeenCalled();
  });
});
