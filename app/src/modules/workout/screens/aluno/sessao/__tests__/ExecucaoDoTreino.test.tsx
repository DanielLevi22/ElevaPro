import { simplePrescriptionToSetPlan, type Workout, type WorkoutExercise } from '@elevapro/shared';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useAppAlertStore } from '@/components/ui/appAlert/store';
import {
  type AcaoDaSessao,
  type EstadoDaSessao,
  estadoInicial,
  transicionar,
} from '../../../../store/maquinaDaSessao';
import { ExecucaoDoTreino } from '../ExecucaoDoTreino';

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

const TREINO = { id: 'treino-a', title: 'Treino A', muscle_group: 'Pernas' } as Workout;
const VOZ = { mudo: false, alternarMudo: jest.fn(), ouvindo: false, alternarMicrofone: jest.fn() };
const NOMES = /^(Abdominal|Abdução|Agachamento|Em execução)$/;

function sessaoCom(...acoes: AcaoDaSessao[]): EstadoDaSessao {
  const inicial = estadoInicial([item('Abdominal', 3), item('Abdução', 4), item('Agachamento', 3)]);
  return [{ tipo: 'iniciar', agora: T0 } as AcaoDaSessao, ...acoes].reduce(transicionar, inicial);
}

async function renderExecucao(sessao: EstadoDaSessao, despachar = jest.fn()) {
  await render(
    <ExecucaoDoTreino
      treino={TREINO}
      sessao={sessao}
      agora={T0}
      despachar={despachar}
      voz={VOZ}
      onFechar={jest.fn()}
      anteriores={{}}
      onAjustar={jest.fn()}
      onTrocar={jest.fn()}
    />
  );
  return despachar;
}

/** Os nomes e o "Em execução" do cartão, na ordem em que a tela os desenha. */
function ordemNaTela(): string[] {
  return screen.getAllByText(NOMES).map((node) => String(node.props.children));
}

describe('a lista da execução (#441)', () => {
  it('segue a ordem do treino, com o cartão no lugar do exercício escolhido', async () => {
    await renderExecucao(sessaoCom({ tipo: 'escolher', itemId: 'Agachamento' }));

    expect(ordemNaTela()).toEqual(['Abdominal', 'Abdução', 'Em execução', 'Agachamento']);
  });

  it('o exercício concluído continua no lugar dele', async () => {
    const sessao = sessaoCom({ tipo: 'concluirTodas', agora: T0 }, { tipo: 'terminarDescanso' });
    await renderExecucao(sessao);

    expect(ordemNaTela()).toEqual(['Abdominal', 'Em execução', 'Abdução', 'Agachamento']);
  });
});

describe('concluir todas as séries (#441)', () => {
  it('pede confirmação com a contagem e só registra depois dela', async () => {
    const despachar = await renderExecucao(sessaoCom());

    await fireEvent.press(screen.getByText('Concluir todas as séries'));
    expect(despachar).not.toHaveBeenCalled();

    const confirmacao = useAppAlertStore.getState().current;
    if (confirmacao?.kind !== 'confirm') throw new Error(`Esperado confirm, veio ${confirmacao}`);
    expect(confirmacao.message).toContain('3 séries');
    await act(async () => confirmacao.onConfirm());

    expect(despachar).toHaveBeenCalledWith({ tipo: 'concluirTodas', agora: expect.any(Number) });
  });
});
