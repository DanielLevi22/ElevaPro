import { act, renderHook } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { Pedometer } from 'expo-sensors';
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
});
