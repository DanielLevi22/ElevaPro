import { act, renderHook } from '@testing-library/react-native';
import { useLightWeek, useLightWeekStore } from '../lightWeekStore';

describe('a semana leve do "Semana corrida?" (F5)', () => {
  it('vale sete dias a partir de hoje, e depois acaba', () => {
    act(() => useLightWeekStore.getState().start('2026-10-14'));
    expect(useLightWeekStore.getState().until).toBe('2026-10-20');

    expect(renderHook(() => useLightWeek('2026-10-14')).result.current).toBe(true);
    expect(renderHook(() => useLightWeek('2026-10-20')).result.current).toBe(true);
    expect(renderHook(() => useLightWeek('2026-10-21')).result.current).toBe(false);
  });

  it('sem ter escolhido, não há semana leve', () => {
    act(() => useLightWeekStore.setState({ until: null }));
    expect(renderHook(() => useLightWeek('2026-10-14')).result.current).toBe(false);
  });
});
