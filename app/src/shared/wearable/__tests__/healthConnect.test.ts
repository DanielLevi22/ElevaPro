import { initialize, readRecords } from 'react-native-health-connect';
import { healthConnectReader } from '../healthConnect';

jest.mock('react-native-health-connect', () => ({
  initialize: jest.fn(),
  getGrantedPermissions: jest.fn(),
  readRecords: jest.fn(),
  requestPermission: jest.fn(),
}));

const mockInitialize = initialize as jest.Mock;
const mockReadRecords = readRecords as jest.Mock;

const RUN = {
  start: new Date('2026-09-02T18:41:00Z'),
  end: new Date('2026-09-02T19:41:04Z'),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockInitialize.mockResolvedValue(true);
});

describe('leitor do Health Connect', () => {
  // Cada registro de FC carrega uma série de amostras de tamanhos diferentes. A
  // média tem de ser das amostras, e não das séries, então o leitor as achata.
  it('achata as séries de amostras de FC do intervalo', async () => {
    mockReadRecords.mockResolvedValue({
      records: [
        { samples: [{ beatsPerMinute: 160 }, { beatsPerMinute: 164 }] },
        { samples: [{ beatsPerMinute: 168 }] },
      ],
    });

    await expect(healthConnectReader.heartRateSamples(RUN)).resolves.toEqual([160, 164, 168]);
    expect(mockReadRecords).toHaveBeenCalledWith('HeartRate', {
      timeRangeFilter: {
        operator: 'between',
        startTime: RUN.start.toISOString(),
        endTime: RUN.end.toISOString(),
      },
    });
  });

  it('leitura negada ou falha vira lista vazia, e não erro', async () => {
    mockReadRecords.mockRejectedValue(new Error('permission denied'));
    await expect(healthConnectReader.heartRateSamples(RUN)).resolves.toEqual([]);
  });

  // Provar a capacidade não pede a semana inteira: um registro basta, e ler mais
  // traria série de dado de saúde sem uso.
  it('prova a atividade diária pedindo uma página de um registro só', async () => {
    mockReadRecords.mockResolvedValue({ records: [{ count: 10 }] });

    await expect(healthConnectReader.hasDailyActivity(RUN)).resolves.toBe(true);
    expect(mockReadRecords).toHaveBeenCalledWith('Steps', expect.objectContaining({ pageSize: 1 }));
  });

  it('sem Health Connect no aparelho, não há capacidade', async () => {
    mockInitialize.mockResolvedValue(false);

    await expect(healthConnectReader.hasSleep(RUN)).resolves.toBe(false);
    expect(mockReadRecords).not.toHaveBeenCalled();
  });
});
