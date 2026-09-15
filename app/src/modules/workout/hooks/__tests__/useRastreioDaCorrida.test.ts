import { act, renderHook } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { Pedometer } from 'expo-sensors';
import * as TaskManager from 'expo-task-manager';
import { cardioModality } from '../../cardioModalities';
import { useRastreioDaCorrida } from '../useRastreioDaCorrida';

jest.mock('expo-location', () => ({
  Accuracy: { BestForNavigation: 6 },
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  startLocationUpdatesAsync: jest.fn().mockResolvedValue(undefined),
  stopLocationUpdatesAsync: jest.fn().mockResolvedValue(undefined),
  watchPositionAsync: jest.fn(),
}));

jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
  isTaskRegisteredAsync: jest.fn().mockResolvedValue(false),
}));

jest.mock('expo-sensors', () => ({
  Pedometer: {
    requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
    isAvailableAsync: jest.fn().mockResolvedValue(true),
    watchStepCount: jest.fn(() => ({ remove: jest.fn() })),
  },
}));

// Capturado antes do `clearAllMocks`: o `defineTask` roda uma vez, no import do hook.
const deliverFromTask = (TaskManager.defineTask as jest.Mock).mock.calls[0][1] as (event: {
  data: unknown;
  error: null;
}) => Promise<void>;

type WatchCallback = (location: {
  coords: { latitude: number; longitude: number; accuracy: number };
  timestamp: number;
}) => void;

/** Dois pontos a ~22 m um do outro, com 5 s entre eles, depois do início da sessão. */
const AFTER_START = Date.now() + 60_000;
const START = {
  coords: { latitude: -3.73, longitude: -38.52, accuracy: 5 },
  timestamp: AFTER_START,
};
const NEXT = {
  coords: { latitude: -3.7298, longitude: -38.52, accuracy: 5 },
  timestamp: AFTER_START + 5_000,
};

beforeEach(() => jest.clearAllMocks());

describe('rastreio da sessão de cardio por modalidade', () => {
  // LGPD, Art. 6°, III. No elíptico e na natação o GPS não mede nada: pedir a
  // localização seria coleta sem finalidade, a mesma classe de defeito que a #278
  // encontrou com a permissão de background. A modalidade decide, e sem GPS o app
  // nem pergunta.
  it('a modalidade sem gps não pede localização', async () => {
    const { result } = renderHook(() => useRastreioDaCorrida(cardioModality('elliptical')));

    await act(async () => {
      await result.current.iniciar();
    });

    const asked = (Location.requestForegroundPermissionsAsync as jest.Mock).mock.calls.length;
    if (asked > 0) {
      throw new Error('LOCALIZAÇÃO SEM FINALIDADE: o elíptico pediu permissão de GPS');
    }
    expect(Location.startLocationUpdatesAsync).not.toHaveBeenCalled();
  });

  it('a corrida pede localização e conta passos', async () => {
    const { result } = renderHook(() => useRastreioDaCorrida(cardioModality('run')));

    await act(async () => {
      await result.current.iniciar();
    });

    expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();
    expect(Pedometer.watchStepCount).toHaveBeenCalled();
    await act(async () => {
      await result.current.encerrar();
    });
  });

  it('a bicicleta mede o percurso, mas não conta passos', async () => {
    const { result } = renderHook(() => useRastreioDaCorrida(cardioModality('bike')));

    await act(async () => {
      await result.current.iniciar();
    });

    expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();
    expect(Pedometer.requestPermissionsAsync).not.toHaveBeenCalled();
    await act(async () => {
      await result.current.encerrar();
    });
  });

  // O serviço de primeiro plano sobe sem erro, mas no Android com a nova
  // arquitetura as entregas dele não chegavam ao JS com o app aberto: a corrida
  // terminava sempre em 0,00 km. Com a tela aberta, a inscrição direta alimenta
  // o percurso, e o serviço fica para quando a tela apaga.
  it('com o serviço de primeiro plano de pé, a tela também recebe as posições', async () => {
    let onPosition: WatchCallback = () => undefined;
    (Location.watchPositionAsync as jest.Mock).mockImplementation(async (_options, callback) => {
      onPosition = callback;
      return { remove: jest.fn() };
    });
    const { result } = renderHook(() => useRastreioDaCorrida(cardioModality('run')));

    await act(async () => {
      await result.current.iniciar();
    });
    onPosition(START);
    onPosition(NEXT);
    await act(async () => {
      await result.current.pausar();
    });

    expect(Location.startLocationUpdatesAsync).toHaveBeenCalled();
    expect(result.current.distanceMeters).toBeGreaterThan(20);
    await act(async () => {
      await result.current.encerrar();
    });
  });

  it('a mesma posição entregue pela tela e pelo serviço conta uma vez só', async () => {
    let onPosition: WatchCallback = () => undefined;
    (Location.watchPositionAsync as jest.Mock).mockImplementation(async (_options, callback) => {
      onPosition = callback;
      return { remove: jest.fn() };
    });
    const { result } = renderHook(() => useRastreioDaCorrida(cardioModality('run')));

    await act(async () => {
      await result.current.iniciar();
    });
    onPosition(START);
    onPosition(NEXT);
    await deliverFromTask({ data: { locations: [START, NEXT] }, error: null });
    await act(async () => {
      await result.current.pausar();
    });

    expect(result.current.pontos).toHaveLength(2);
    await act(async () => {
      await result.current.encerrar();
    });
  });

  // O GPS entrega na hora a última posição conhecida, que pode ser de horas atrás
  // e de outro bairro. Contada, ela vira um trecho que o aluno não correu — visto
  // no emulador como uma diagonal de 240 m no começo do traçado.
  it('a posição de antes do início da sessão não entra no percurso', async () => {
    let onPosition: WatchCallback = () => undefined;
    (Location.watchPositionAsync as jest.Mock).mockImplementation(async (_options, callback) => {
      onPosition = callback;
      return { remove: jest.fn() };
    });
    const now = Date.now();
    const { result } = renderHook(() => useRastreioDaCorrida(cardioModality('run')));

    await act(async () => {
      await result.current.iniciar();
    });
    onPosition({ ...START, timestamp: now - 10 * 60_000 });
    onPosition({ ...NEXT, timestamp: now + 5_000 });
    await act(async () => {
      await result.current.pausar();
    });

    expect(result.current.pontos).toHaveLength(1);
    await act(async () => {
      await result.current.encerrar();
    });
  });
});
