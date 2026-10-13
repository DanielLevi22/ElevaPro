import { evolucoesDaSessao, resumoDaSessao, seriesDaSessaoAnterior } from '@elevapro/shared';
import { type ReactNode, useMemo, useState } from 'react';
import { View } from 'react-native';
import { showAlert } from '@/components/ui/appAlert';
import { fotoDoGrupo } from '@/shared/imagens/fotosDeTreino';
import { ExerciseSwapSheet } from '../../../components/ExerciseSwapSheet';
import { AjusteDoExercicio } from '../../../components/sessao/AjusteDoExercicio';
import { EffortPrompt } from '../../../components/sessao/EffortPrompt';
import { TelaDeFeedback } from '../../../components/sessao/TelaDeFeedback';
import { useExerciseHistory } from '../../../hooks/useExerciseHistory';
import { isSelfGuidedWorkout } from '../../../hooks/useExerciseSwap';
import { usePesoDoAluno } from '../../../hooks/usePesoDoAluno';
import { useUltimaSessaoDoTreino } from '../../../hooks/useUltimaSessaoDoTreino';
import { gravarSessaoDeForca, montarSessaoDeForca } from '../../../services/registroDaSessao';
import {
  type ExerciseHistory,
  type LoadSuggestions,
  nextTimeSuggestions,
  todaySuggestions,
  weightsToApply,
} from '../../../services/sessionLoadSuggestions';
import type { EstadoDaSessao } from '../../../store/maquinaDaSessao';
import { CompartilharTreino } from './CompartilharTreino';
import { CronometroDoTreino } from './CronometroDoTreino';
import { ExecucaoDoTreino, type PropsDoMomento } from './ExecucaoDoTreino';
import { PreInicioDoTreino } from './PreInicioDoTreino';
import { ResumoDoTreino } from './ResumoDoTreino';
import type { SessaoEmAndamentoScreenProps } from './SessaoEmAndamentoScreen';

type MomentoDaSessaoProps = PropsDoMomento &
  Omit<SessaoEmAndamentoScreenProps, 'treinoId'> & { onSair: () => void };

type SeriesAnteriores = ReturnType<typeof seriesDaSessaoAnterior>;

/**
 * Desenha a tela do momento em que a sessão está e liga cada uma ao que ela faz:
 * ajustar exercício, gravar no feedback, compartilhar no resumo.
 *
 * @example
 * <MomentoDaSessao {...props} sessao={sessao} despachar={despachar} onSair={sair} />
 */
export function MomentoDaSessao(props: MomentoDaSessaoProps) {
  const { treino, sessao, despachar, alunoId } = props;
  const anterior = useUltimaSessaoDoTreino(treino.id, alunoId);
  const anteriores = useMemo(() => seriesDaSessaoAnterior(anterior), [anterior]);
  const gravacao = useGravacaoDaSessao(props);
  // A carga sugerida é só do treino do próprio Praticante (#376): no
  // prescrito, quem decide a carga é o especialista.
  const selfGuided = !props.mascarado && isSelfGuidedWorkout(treino, alunoId);
  const history = useExerciseHistory(treino.id, alunoId, selfGuided);
  const today = useMemo(
    () => (selfGuided ? todaySuggestions(treino.exercises ?? [], history) : {}),
    [selfGuided, treino.exercises, history]
  );

  switch (sessao.momento) {
    case 'preInicio':
      return (
        <PreInicioDoTreino
          treino={treino}
          anterior={anterior}
          loadSuggestions={today}
          onIniciar={() => {
            despachar({
              tipo: 'applySuggestedLoads',
              weights: weightsToApply(sessao.itens, today),
            });
            despachar({ tipo: 'iniciar', agora: Date.now() });
          }}
          onVoltar={props.onSair}
        />
      );
    case 'execucao':
      return (
        <WithEffortPrompt {...props} enabled={selfGuided}>
          <ExecucaoComAjuste {...props} anteriores={anteriores} />
        </WithEffortPrompt>
      );
    case 'serie':
    case 'descanso':
      return (
        <WithEffortPrompt {...props} enabled={selfGuided && sessao.momento === 'descanso'}>
          <CronometroDoTreino {...props} />
        </WithEffortPrompt>
      );
    case 'feedback':
      return (
        <WithEffortPrompt {...props} enabled={selfGuided}>
          <TelaDeFeedback
            imagem={fotoDoGrupo(treino.muscle_group)}
            salvando={gravacao.salvando}
            onFechar={() => despachar({ tipo: 'voltarAoTreino' })}
            onSalvar={gravacao.salvar}
          />
        </WithEffortPrompt>
      );
    case 'resumo':
      return (
        <Resumo {...props} anteriores={anteriores} history={history} selfGuided={selfGuided} />
      );
  }
}

/**
 * A tela do momento com a pergunta do esforço por cima, enquanto houver um
 * exercício terminado sem resposta (A2). No meio da série ela espera: a
 * pessoa está com a carga na mão.
 */
function WithEffortPrompt({
  sessao,
  despachar,
  enabled,
  children,
}: MomentoDaSessaoProps & { enabled: boolean; children: ReactNode }) {
  const pending = sessao.itens.find((item) => item.id === sessao.pendingEffortId);
  if (!enabled || !pending) return children;
  return (
    <View className="flex-1">
      {children}
      <EffortPrompt
        name={pending.exercise?.name ?? 'o exercício'}
        // Só o feedback tem botão fixo no rodapé ("Salvar e finalizar").
        aboveButton={sessao.momento === 'feedback'}
        onAnswer={(effort) => despachar({ tipo: 'rateEffort', itemId: pending.id, effort })}
      />
    </View>
  );
}

/**
 * A lista da execução com a folha de ajuste do lápis e a de troca do "…". A
 * troca entra na sessão na hora; se for de vez, o plano também muda.
 */
function ExecucaoComAjuste(props: MomentoDaSessaoProps & { anteriores: SeriesAnteriores }) {
  const { treino, sessao, despachar, podeEditarVideo, alunoId, mascarado } = props;
  const [ajustando, setAjustando] = useState<string | null>(null);
  const [trocando, setTrocando] = useState<string | null>(null);

  return (
    <>
      <ExecucaoDoTreino {...props} onAjustar={setAjustando} onTrocar={setTrocando} />
      <ExerciseSwapSheet
        item={sessao.itens.find((item) => item.id === trocando) ?? null}
        workoutId={treino.id}
        studentId={alunoId}
        // Vendo como o aluno, o especialista não muda o plano de ninguém.
        selfGuided={!mascarado && isSelfGuidedWorkout(treino, alunoId)}
        onSwapped={(item, exercise) =>
          despachar({
            tipo: 'ajustarExercicio',
            item: { ...item, exercise_id: exercise.id, exercise },
          })
        }
        onClose={() => setTrocando(null)}
      />
      <AjusteDoExercicio
        item={sessao.itens.find((item) => item.id === ajustando) ?? null}
        podeEditarVideo={podeEditarVideo}
        onFechar={() => setAjustando(null)}
        onSalvar={(item) => despachar({ tipo: 'ajustarExercicio', item })}
      />
    </>
  );
}

interface GravacaoDaSessao {
  salvando: boolean;
  salvar: (pse: number, notas: string) => Promise<void>;
}

/** Grava a sessão e só então vai ao resumo: o resumo afirma que o treino foi salvo. */
function useGravacaoDaSessao({
  treino,
  sessao,
  despachar,
  alunoId,
  mascarado,
  onTreinoRegistrado,
}: MomentoDaSessaoProps): GravacaoDaSessao {
  const [salvando, setSalvando] = useState(false);

  const salvar = async (pse: number, notas: string) => {
    setSalvando(true);
    try {
      const paraGravar = montarSessaoDeForca(treino, sessao, { alunoId, pse, notas }, Date.now());
      await gravarSessaoDeForca(paraGravar, { mascarado });
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

interface ResumoExtras {
  anteriores: SeriesAnteriores;
  history: ExerciseHistory;
  selfGuided: boolean;
}

/** O resumo e, pelo botão dele, a tela de compartilhar. */
function Resumo({
  treino,
  sessao,
  alunoId,
  anteriores,
  history,
  selfGuided,
  onSair,
}: MomentoDaSessaoProps & ResumoExtras) {
  const [compartilhando, setCompartilhando] = useState(false);
  const { resumo, evolucoes, concluidaEm } = useResumoDaSessao(sessao, alunoId, anteriores);
  const nextTime = useMemo<LoadSuggestions>(
    () =>
      selfGuided ? nextTimeSuggestions(sessao.itens, sessao.feitas, sessao.efforts, history) : {},
    [selfGuided, sessao.itens, sessao.feitas, sessao.efforts, history]
  );

  if (compartilhando) {
    return (
      <CompartilharTreino
        treino={treino}
        resumo={resumo}
        recordes={evolucoes.length}
        concluidaEm={concluidaEm}
        onVoltar={() => setCompartilhando(false)}
      />
    );
  }
  return (
    <ResumoDoTreino
      treino={treino}
      resumo={resumo}
      evolucoes={evolucoes}
      itens={sessao.itens}
      nextTime={nextTime}
      concluidaEm={concluidaEm}
      onSair={onSair}
      onCompartilhar={() => setCompartilhando(true)}
    />
  );
}

/** Volume, gasto e evoluções da sessão — o gasto usa o peso do aluno quando há. */
function useResumoDaSessao(
  sessao: EstadoDaSessao,
  alunoId: string,
  anteriores: SeriesAnteriores
): {
  resumo: ReturnType<typeof resumoDaSessao>;
  evolucoes: ReturnType<typeof evolucoesDaSessao>;
  concluidaEm: number;
} {
  const pesoKg = usePesoDoAluno(alunoId);
  const inicio = sessao.iniciadaEm ?? 0;
  const concluidaEm = sessao.concluidaEm ?? inicio;
  const itens = sessao.itens.map((item) => ({
    id: item.id,
    nome: item.exercise?.name ?? 'Exercício',
  }));
  return {
    resumo: resumoDaSessao(sessao.feitas, inicio, concluidaEm, pesoKg),
    evolucoes: evolucoesDaSessao(itens, sessao.feitas, anteriores),
    concluidaEm,
  };
}
