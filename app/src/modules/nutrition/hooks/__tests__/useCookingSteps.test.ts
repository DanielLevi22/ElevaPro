import { act, renderHook } from '@testing-library/react-native';
import { useCookingSteps } from '../useCookingSteps';

jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn().mockResolvedValue(undefined),
}));
beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

it('inicia o timer do primeiro passo, pausa e termina sem reiniciar a contagem', () => {
  const { result } = renderHook(() =>
    useCookingSteps([{ instruction: 'Aqueça', timerSeconds: 3 }])
  );
  expect(result.current.secondsLeft).toBe(3);
  act(() => result.current.toggleTimer());
  act(() => jest.advanceTimersByTime(1000));
  expect(result.current.secondsLeft).toBe(2);
  act(() => result.current.toggleTimer());
  act(() => jest.advanceTimersByTime(5000));
  expect(result.current.secondsLeft).toBe(2);
  act(() => result.current.toggleTimer());
  act(() => jest.advanceTimersByTime(2000));
  expect(result.current.secondsLeft).toBe(0);
  expect(result.current.running).toBe(false);
});
