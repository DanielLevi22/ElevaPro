import type { WorkoutExercise } from '@elevapro/shared';
import { simplePrescriptionToSetPlan } from '@elevapro/shared';
import { act, renderHook } from '@testing-library/react-native';
import type { RestAction } from '../../../../../modules/rest-timer-activity';
import { restanteDoDescanso } from '../../store/maquinaDaSessao';
import { useRestOnLockScreen } from '../useRestOnLockScreen';
import { useSessaoEmAndamento } from '../useSessaoEmAndamento';

const mockNativo = {
  show: jest.fn((_rest: unknown) => Promise.resolve()),
  end: jest.fn(() => Promise.resolve()),
  pendentes: [] as RestAction[],
  aviso: null as null | (() => void),
};

jest.mock('../../../../../modules/rest-timer-activity', () => ({
  showRest: (rest: unknown) => mockNativo.show(rest),
  endRest: () => mockNativo.end(),
  takeRestActions: () => mockNativo.pendentes.splice(0),
  onRestAction: (ouvinte: () => void) => {
    mockNativo.aviso = ouvinte;
    return { remove: () => undefined };
  },
}));

const T0 = Date.UTC(2026, 8, 13, 10, 0, 0);

const REMADA = {
  id: 'remada',
  workout_id: 'w1',
  exercise_id: 'ex-remada',
  set_plan: simplePrescriptionToSetPlan({ sets: 4, reps: '10', weight: '45', rest_seconds: 90 })
    .plan,
  order_index: 0,
  notes: null,
  created_at: '2026-09-01T00:00:00Z',
  exercise: { id: 'ex-remada', name: 'Remada curvada', muscle_group: 'Costas' },
} as WorkoutExercise;

function useSessaoNaTelaBloqueada() {
  const sessao = useSessaoEmAndamento([REMADA]);
  useRestOnLockScreen(sessao.sessao, sessao.despachar);
  return sessao;
}

/** Inicia e conclui a primeira série: o descanso de 90 s começa em T0 + 40 s. */
async function descansando() {
  const hook = await renderHook(useSessaoNaTelaBloqueada);
  await act(() => {
    hook.result.current.despachar({ tipo: 'iniciar', agora: T0 });
    hook.result.current.despachar({ tipo: 'abrirSerie' });
    hook.result.current.despachar({ tipo: 'alternarSerie', agora: T0 });
    hook.result.current.despachar({ tipo: 'concluirSerie', agora: T0 + 40_000 });
  });
  return hook;
}

describe('o descanso na tela bloqueada, ligado à sessão', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: T0 + 40_000 });
    mockNativo.show.mockClear();
    mockNativo.end.mockClear();
    mockNativo.pendentes = [];
  });
  afterEach(() => jest.useRealTimers());

  it('mostra o descanso quando ele começa e tira quando a sessão sai dele', async () => {
    const hook = await descansando();
    expect(mockNativo.show).toHaveBeenLastCalledWith(
      expect.objectContaining({ title: 'Descanso · Remada curvada', endsAt: T0 + 130_000 })
    );
    mockNativo.end.mockClear();
    await act(() => hook.result.current.despachar({ tipo: 'terminarDescanso' }));
    expect(mockNativo.end).toHaveBeenCalled();
  });

  it('o +15 s da tela bloqueada soma na sessão, a partir do instante do toque', async () => {
    const hook = await descansando();
    mockNativo.pendentes.push({ type: 'add_time', at: T0 + 100_000 });
    await act(() => mockNativo.aviso?.());
    // No toque faltavam 30 s; com +15 s, o descanso acaba em T0 + 145 s.
    expect(restanteDoDescanso(hook.result.current.sessao, T0 + 100_000)).toBe(45);
    expect(hook.result.current.sessao.descanso?.terminaEm).toBe(T0 + 145_000);
  });

  it('o Pular da tela bloqueada encerra o descanso na sessão', async () => {
    const hook = await descansando();
    mockNativo.pendentes.push({ type: 'skip', at: T0 + 60_000 });
    await act(() => mockNativo.aviso?.());
    expect(hook.result.current.sessao.momento).toBe('execucao');
  });

  it('toque que sobrou de outra sessão não age fora do descanso', async () => {
    mockNativo.pendentes.push({ type: 'skip', at: T0 - 600_000 });
    const hook = await renderHook(useSessaoNaTelaBloqueada);
    expect(hook.result.current.sessao.momento).toBe('preInicio');
    expect(mockNativo.pendentes).toEqual([]);
  });
});
