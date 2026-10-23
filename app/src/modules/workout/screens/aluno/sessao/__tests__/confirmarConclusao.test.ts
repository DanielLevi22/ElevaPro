import { simplePrescriptionToSetPlan, type WorkoutExercise } from '@elevapro/shared';
import { act } from '@testing-library/react-native';
import { useAppAlertStore } from '@/components/ui/appAlert/store';
import {
  type AcaoDaSessao,
  type EstadoDaSessao,
  estadoInicial,
  transicionar,
} from '../../../../store/maquinaDaSessao';
import { confirmarConclusao } from '../confirmarConclusao';

const T0 = Date.UTC(2026, 9, 22, 21, 0, 0);

function item(id: string, series: number): WorkoutExercise {
  return {
    id,
    workout_id: 'treino-a',
    exercise_id: `ex-${id}`,
    set_plan: simplePrescriptionToSetPlan({
      sets: series,
      reps: '12',
      weight: '',
      rest_seconds: 60,
    }).plan,
    order_index: 0,
    notes: null,
    created_at: '2026-10-01T00:00:00Z',
    exercise: { id: `ex-${id}`, name: id, muscle_group: 'Pernas' } as WorkoutExercise['exercise'],
  };
}

function sessaoCom(...acoes: AcaoDaSessao[]): EstadoDaSessao {
  const inicial = estadoInicial([item('Abdominal', 2), item('Abdução', 2), item('Agachamento', 2)]);
  return [{ tipo: 'iniciar', agora: T0 } as AcaoDaSessao, ...acoes].reduce(transicionar, inicial);
}

function confirmacaoAberta() {
  const atual = useAppAlertStore.getState().current;
  if (atual?.kind !== 'confirm') throw new Error(`Esperado confirm, veio ${atual}`);
  return atual;
}

const finalizar = jest.fn();
const sair = jest.fn();

beforeEach(() => {
  finalizar.mockClear();
  sair.mockClear();
  useAppAlertStore.setState({ current: null, queue: [] });
});

describe('Concluir treino (#441)', () => {
  it('avisa quais exercícios faltam e conclui mesmo assim se o aluno confirmar', async () => {
    confirmarConclusao(sessaoCom({ tipo: 'concluirTodas', agora: T0 }), { finalizar, sair });

    const confirmacao = confirmacaoAberta();
    expect(confirmacao.message).toContain('Abdução');
    expect(confirmacao.message).toContain('Agachamento');
    expect(confirmacao.message).not.toContain('Abdominal');
    expect(finalizar).not.toHaveBeenCalled();

    await act(async () => confirmacao.onConfirm());
    expect(finalizar).toHaveBeenCalled();
  });

  it('sem nada faltando, conclui direto', () => {
    const tudoFeito = sessaoCom(
      { tipo: 'concluirTodas', agora: T0 },
      { tipo: 'concluirTodas', agora: T0 }
    );
    const naLista: EstadoDaSessao = {
      ...tudoFeito,
      momento: 'execucao',
      feitas: { ...tudoFeito.feitas, Agachamento: tudoFeito.feitas.Abdominal ?? [] },
    };
    confirmarConclusao(naLista, { finalizar, sair });

    expect(finalizar).toHaveBeenCalled();
    expect(useAppAlertStore.getState().current).toBeNull();
  });

  it('sem nenhuma série feita, não há o que salvar: oferece sair', async () => {
    confirmarConclusao(sessaoCom(), { finalizar, sair });

    const confirmacao = confirmacaoAberta();
    expect(confirmacao.title).toBe('Sair do treino?');
    await act(async () => confirmacao.onConfirm());
    expect(sair).toHaveBeenCalled();
    expect(finalizar).not.toHaveBeenCalled();
  });
});
