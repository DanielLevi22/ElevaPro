import { act, renderHook, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { getGrantedPermissions, initialize, readRecords } from 'react-native-health-connect';
import { readDeviceMetrics, useHealthData } from '@/hooks/useHealthData';
import { syncDailyMetrics } from '@/services/healthSync';

jest.mock('react-native-health-connect', () => ({
  initialize: jest.fn(),
  getGrantedPermissions: jest.fn(),
  readRecords: jest.fn(),
}));

// Só o caminho Android é exercitado aqui; o mock existe para o import não
// carregar o módulo nativo do HealthKit no ambiente de teste.
jest.mock('@kingstinct/react-native-healthkit', () => ({
  requestAuthorization: jest.fn(),
  queryStatisticsForQuantity: jest.fn(),
}));

jest.mock('@/services/healthSync', () => ({
  syncDailyMetrics: jest.fn().mockResolvedValue('saved'),
  localDateKey: () => '2026-08-16',
}));

const mockSync = syncDailyMetrics as unknown as jest.Mock;

const mockInitialize = initialize as unknown as jest.Mock;
const mockGetGranted = getGrantedPermissions as unknown as jest.Mock;
const mockReadRecords = readRecords as unknown as jest.Mock;

/** Permissões comuns — o que a tela em primeiro plano precisa. */
const grantAll = () =>
  mockGetGranted.mockResolvedValue([
    { recordType: 'Steps', accessType: 'read' },
    { recordType: 'ActiveCaloriesBurned', accessType: 'read' },
  ]);

/** Comuns mais a de background, que é concedida à parte. */
const grantAllWithBackground = () =>
  mockGetGranted.mockResolvedValue([
    { recordType: 'Steps', accessType: 'read' },
    { recordType: 'ActiveCaloriesBurned', accessType: 'read' },
    { recordType: 'BackgroundAccessPermission', accessType: 'read' },
  ]);

const stubRecords = () =>
  mockReadRecords.mockImplementation((recordType: string) => {
    if (recordType === 'Steps') {
      return Promise.resolve({ records: [{ count: 1200 }, { count: 300 }] });
    }
    if (recordType === 'ActiveCaloriesBurned') {
      return Promise.resolve({ records: [{ energy: { inKilocalories: 88.4 } }] });
    }
    if (recordType === 'SleepSession') {
      return Promise.resolve({
        records: [
          {
            startTime: '2026-09-03T23:00:00.000Z',
            endTime: '2026-09-04T07:00:00.000Z',
            stages: [
              // 3h de leve + 2h de profundo + 1h de REM = 6h. A hora acordado
              // no meio fica de fora, e é justamente ela que separa "deitou" de
              // "dormiu".
              {
                stage: 4,
                startTime: '2026-09-03T23:00:00.000Z',
                endTime: '2026-09-04T01:00:00.000Z',
              },
              {
                stage: 2,
                startTime: '2026-09-04T01:00:00.000Z',
                endTime: '2026-09-04T02:00:00.000Z',
              },
              {
                stage: 1,
                startTime: '2026-09-04T02:00:00.000Z',
                endTime: '2026-09-04T05:00:00.000Z',
              },
              {
                stage: 5,
                startTime: '2026-09-04T05:00:00.000Z',
                endTime: '2026-09-04T06:00:00.000Z',
              },
            ],
          },
        ],
      });
    }
    if (recordType === 'RestingHeartRate') {
      return Promise.resolve({
        records: [
          { time: '2026-09-04T06:00:00.000Z', beatsPerMinute: 61 },
          { time: '2026-09-04T09:00:00.000Z', beatsPerMinute: 57 },
        ],
      });
    }
    return Promise.resolve({ records: [] });
  });

beforeEach(() => {
  jest.clearAllMocks();
  // O preset jest-expo roda com Platform.OS = 'ios'; estes casos cobrem o
  // caminho Android (Health Connect), que é onde o bug do refetch acontecia.
  Object.defineProperty(Platform, 'OS', { get: () => 'android', configurable: true });
});

describe('useHealthData', () => {
  it('agrega passos e calorias do dia quando há permissão', async () => {
    mockInitialize.mockResolvedValue(true);
    grantAll();
    stubRecords();

    const { result } = renderHook(() => useHealthData());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.steps).toBe(1500);
    expect(result.current.calories).toBe(88);
    expect(result.current.source).toBe('device');
    expect(result.current.hasPermissions).toBe(true);
  });

  // Regressão: refetch chamava getGrantedPermissions() sem initialize() prévio e
  // sem try/catch. Como refetch é o handler de retorno do background, a rejeição
  // ficava sem tratamento e o estado travava em loading: true.
  it('não trava em loading quando o Health Connect rejeita no refetch', async () => {
    mockInitialize.mockResolvedValue(true);
    grantAll();
    stubRecords();

    const { result } = renderHook(() => useHealthData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockInitialize.mockRejectedValueOnce(new Error('SDK unavailable'));

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.loading).toBe(false);
  });

  it('sempre inicializa antes de consultar permissões', async () => {
    mockInitialize.mockResolvedValue(true);
    grantAll();
    stubRecords();

    renderHook(() => useHealthData());

    await waitFor(() => expect(mockGetGranted).toHaveBeenCalled());
    expect(mockInitialize.mock.invocationCallOrder[0]).toBeLessThan(
      mockGetGranted.mock.invocationCallOrder[0]
    );
  });

  it('marca a origem como mock quando a permissão foi negada em dev', async () => {
    mockInitialize.mockResolvedValue(true);
    mockGetGranted.mockResolvedValue([]);

    const { result } = renderHook(() => useHealthData());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.source).toBe('mock');
    // O mock não pode se passar por leitura real — era esse o defeito original.
    expect(result.current.hasPermissions).toBe(false);
  });
});

describe('leitura vazia não vira zero', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInitialize.mockResolvedValue(true);
    grantAll();
  });

  it('não persiste quando o Health Connect devolve lista vazia', async () => {
    // O Health Connect devolve lista vazia quando a leitura é negada — inclusive
    // por falta de READ_HEALTH_DATA_IN_BACKGROUND — em vez de lançar. Persistir
    // aqui gravava zero por cima do agregado bom.
    mockReadRecords.mockResolvedValue({ records: [] });

    renderHook(() => useHealthData());

    await waitFor(() => expect(mockReadRecords).toHaveBeenCalled());
    expect(mockSync).not.toHaveBeenCalled();
  });

  it('persiste quando há registro, mesmo somando zero', async () => {
    // Zero passos medidos é um fato; zero por ausência de leitura não é. Os
    // dois chegavam idênticos antes desta distinção.
    mockReadRecords.mockImplementation((recordType: string) =>
      recordType === 'Steps'
        ? Promise.resolve({ records: [{ count: 0 }] })
        : Promise.resolve({ records: [{ energy: { inKilocalories: 0 } }] })
    );

    renderHook(() => useHealthData());

    await waitFor(() => expect(mockSync).toHaveBeenCalled());
    expect(mockSync).toHaveBeenCalledWith(
      expect.objectContaining({ steps: 0, active_calories: 0 })
    );
  });

  it('readDeviceMetrics devolve ausência quando não há registro', async () => {
    grantAllWithBackground();
    mockReadRecords.mockResolvedValue({ records: [] });

    await expect(readDeviceMetrics()).resolves.toBeNull();
  });

  it('readDeviceMetrics devolve as métricas quando há registro e permissão de background', async () => {
    grantAllWithBackground();
    stubRecords();

    await expect(readDeviceMetrics()).resolves.toEqual({
      steps: 1500,
      calories: 88,
      // 6h dormidas: o trecho `awake` (2) do meio da noite não entra.
      sleepMinutes: 360,
      // O mais recente, não o primeiro nem a média.
      restingHeartRate: 57,
      hasRecords: true,
    });
  });

  // Sono e FC de repouso são permissões próprias no Health Connect, concedidas
  // tipo a tipo. Se a falha de uma derrubasse a leitura toda, recusar o sono —
  // escolha legítima — apagaria os passos do aluno.
  it('lê passos mesmo quando a leitura de sono falha', async () => {
    grantAllWithBackground();
    mockReadRecords.mockImplementation((recordType: string) => {
      if (recordType === 'Steps') {
        return Promise.resolve({ records: [{ count: 1500 }] });
      }
      if (recordType === 'ActiveCaloriesBurned') {
        return Promise.resolve({ records: [{ energy: { inKilocalories: 88.4 } }] });
      }
      return Promise.reject(new Error('permissão de sono negada'));
    });

    await expect(readDeviceMetrics()).resolves.toEqual({
      steps: 1500,
      calories: 88,
      sleepMinutes: null,
      restingHeartRate: null,
      hasRecords: true,
    });
  });

  // O registro vem de app de terceiro (Zepp, Mi Fitness, Garmin Connect) e pode
  // chegar sem campo. NaN atravessa soma, arredondamento e serialização sem
  // reclamar, e o dia perderia a métrica sem erro nenhum — ou, pior, derrubaria
  // a gravação inteira no CHECK da 0046, levando junto os passos que estavam
  // certos.
  it('descarta leitura malformada em vez de gravar NaN', async () => {
    grantAllWithBackground();
    mockReadRecords.mockImplementation((recordType: string) => {
      if (recordType === 'Steps') {
        return Promise.resolve({ records: [{ count: 1500 }] });
      }
      if (recordType === 'ActiveCaloriesBurned') {
        return Promise.resolve({ records: [{ energy: { inKilocalories: 88.4 } }] });
      }
      if (recordType === 'SleepSession') {
        return Promise.resolve({ records: [{ startTime: undefined, endTime: undefined }] });
      }
      return Promise.resolve({ records: [{ time: '2026-09-04T06:00:00.000Z' }] });
    });

    const metrics = await readDeviceMetrics();
    expect(metrics?.sleepMinutes).toBeNull();
    expect(metrics?.restingHeartRate).toBeNull();
    expect(metrics?.steps).toBe(1500);
  });

  it('readDeviceMetrics recusa sem a permissão de background', async () => {
    // Só as comuns concedidas. Sem a de background o Health Connect devolveria
    // lista vazia em vez de recusar — parar aqui deixa o motivo no log em vez
    // de virar mais um "não tem dado".
    grantAll();
    stubRecords();

    await expect(readDeviceMetrics()).resolves.toBeNull();
  });
});
