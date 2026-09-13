import {
  evolucoesDaSessao,
  formatarDuracao,
  numeroDaPrescricao,
  resumoDaSessao,
  seriesDaSessaoAnterior,
  type Workout,
} from '@elevapro/shared';
import { useMemo, useState } from 'react';
import { showAlert } from '@/components/ui/appAlert';
import { ShareWorkoutModal } from '@/components/workout/ShareWorkoutModal';
import { fotoDoGrupo } from '@/shared/imagens/fotosDeTreino';
import { AjusteDoExercicio } from '../../../components/sessao/AjusteDoExercicio';
import { TelaDeFeedback } from '../../../components/sessao/TelaDeFeedback';
import { usePesoDoAluno } from '../../../hooks/usePesoDoAluno';
import { useUltimaSessaoDoTreino } from '../../../hooks/useUltimaSessaoDoTreino';
import { gravarSessaoDeForca } from '../../../services/registroDaSessao';
import type { EstadoDaSessao } from '../../../store/maquinaDaSessao';
import { DescansoDoTreino } from './DescansoDoTreino';
import { ExecucaoDoTreino, type PropsDaEtapa } from './ExecucaoDoTreino';
import { PreInicioDoTreino } from './PreInicioDoTreino';
import { ResumoDoTreino } from './ResumoDoTreino';
import type { SessaoDeTreinoScreenProps } from './SessaoDeTreinoScreen';

/**
 * Desenha a tela da etapa em que a sessão está e liga cada uma ao que ela faz:
 * ajustar exercício, gravar no feedback, compartilhar no resumo.
 */
type EtapaDaSessaoProps = PropsDaEtapa &
  Omit<SessaoDeTreinoScreenProps, 'treinoId'> & { onSair: () => void };

export function EtapaDaSessao(props: EtapaDaSessaoProps) {
  const { treino, sessao, despachar, alunoId } = props;
  const anterior = useUltimaSessaoDoTreino(treino.id, alunoId);
  const anteriores = useMemo(() => seriesDaSessaoAnterior(anterior), [anterior]);
  const [ajustando, setAjustando] = useState<string | null>(null);
  const gravacao = useGravacaoDaSessao(props);

  switch (sessao.etapa) {
    case 'preInicio':
      return (
        <PreInicioDoTreino
          treino={treino}
          anterior={anterior}
          onIniciar={() => despachar({ tipo: 'iniciar', agora: Date.now() })}
          onVoltar={props.onSair}
        />
      );
    case 'execucao':
      return (
        <>
          <ExecucaoDoTreino {...props} anteriores={anteriores} onAjustar={setAjustando} />
          <AjusteDoExercicio
            item={sessao.itens.find((item) => item.id === ajustando) ?? null}
            podeEditarVideo={props.podeEditarVideo}
            onFechar={() => setAjustando(null)}
            onSalvar={(item) => despachar({ tipo: 'ajustarExercicio', item })}
          />
        </>
      );
    case 'descanso':
      return <DescansoDoTreino {...props} />;
    case 'feedback':
      return (
        <TelaDeFeedback
          imagem={fotoDoGrupo(treino.muscle_group)}
          salvando={gravacao.salvando}
          onFechar={() => despachar({ tipo: 'voltarAoTreino' })}
          onSalvar={gravacao.salvar}
        />
      );
    case 'resumo':
      return <Resumo {...props} anteriores={anteriores} />;
  }
}

/** Grava a sessão e só então vai ao resumo: o resumo afirma que o treino foi salvo. */
function useGravacaoDaSessao({
  treino,
  sessao,
  despachar,
  alunoId,
  mascarado,
  onTreinoRegistrado,
}: EtapaDaSessaoProps) {
  const [salvando, setSalvando] = useState(false);

  const salvar = async (pse: number, notas: string) => {
    setSalvando(true);
    try {
      await gravarSessaoDeForca(sessaoParaGravar(treino, sessao, alunoId, pse, notas), {
        mascarado,
      });
      if (!mascarado) onTreinoRegistrado();
      despachar({ tipo: 'salva' });
    } catch {
      showAlert({
        type: 'error',
        title: 'Treino não salvo',
        message: 'Não consegui salvar o treino. Confira a conexão e tente de novo.',
      });
    } finally {
      setSalvando(false);
    }
  };

  return { salvando, salvar };
}

/**
 * O prescrito vem do treino como o especialista o montou; o executado, do que
 * o aluno fez com os ajustes da sessão. Separar os dois é o que torna a
 * evolução mensurável.
 */
function sessaoParaGravar(
  treino: Workout,
  sessao: EstadoDaSessao,
  alunoId: string,
  pse: number,
  notas: string
) {
  const prescritos = new Map((treino.exercises ?? []).map((item) => [item.id, item]));
  const agora = Date.now();
  return {
    workoutId: treino.id,
    studentId: alunoId,
    startedAt: new Date(sessao.iniciadaEm ?? agora).toISOString(),
    completedAt: new Date(sessao.concluidaEm ?? agora).toISOString(),
    perceivedExertion: pse,
    notes: notas,
    items: sessao.itens
      .filter((item) => (sessao.feitas[item.id]?.length ?? 0) > 0)
      .map((item) => {
        const prescrito = prescritos.get(item.id);
        return {
          workoutExerciseId: item.id,
          exerciseId: item.exercise_id,
          sets: (sessao.feitas[item.id] ?? []).map((serie) => ({
            reps_prescribed: prescrito?.reps ?? null,
            reps_actual: serie.reps,
            weight_prescribed: numeroDaPrescricao(prescrito?.weight),
            weight_actual: serie.carga,
            rest_prescribed: prescrito?.rest_seconds ?? null,
            completed: true,
          })),
        };
      }),
  };
}

function Resumo({
  treino,
  sessao,
  alunoId,
  anteriores,
  onSair,
}: EtapaDaSessaoProps & { anteriores: ReturnType<typeof seriesDaSessaoAnterior> }) {
  const pesoKg = usePesoDoAluno(alunoId);
  const [compartilhando, setCompartilhando] = useState(false);
  const inicio = sessao.iniciadaEm ?? 0;
  const fim = sessao.concluidaEm ?? inicio;
  const resumo = resumoDaSessao(sessao.feitas, inicio, fim, pesoKg);
  const itens = sessao.itens.map((item) => ({
    id: item.id,
    nome: item.exercise?.name ?? 'Exercício',
  }));

  return (
    <>
      <ResumoDoTreino
        treino={treino}
        resumo={resumo}
        evolucoes={evolucoesDaSessao(itens, sessao.feitas, anteriores)}
        concluidaEm={fim}
        onSair={onSair}
        onCompartilhar={() => setCompartilhando(true)}
      />
      <ShareWorkoutModal
        visible={compartilhando}
        onClose={() => setCompartilhando(false)}
        stats={{
          title: 'Treino Concluído',
          duration: formatarDuracao(resumo.duracaoSegundos),
          calories: `${resumo.kcal} kcal`,
          date: new Date(fim).toLocaleDateString('pt-BR'),
          exerciseName: treino.title,
        }}
      />
    </>
  );
}
