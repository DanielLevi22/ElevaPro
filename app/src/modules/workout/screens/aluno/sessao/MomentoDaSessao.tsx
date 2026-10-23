import {
  blockWeek,
  evolucoesDaSessao,
  resumoDaSessao,
  returnWeekOf,
  seriesDaSessaoAnterior,
  type Workout,
} from '@elevapro/shared';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { showAlert } from '@/components/ui/appAlert';
import { useActiveBlock } from '@/hooks/useActiveBlock';
import { useRestPeriods } from '@/hooks/useRestPeriods';
import { localDateKey } from '@/services/healthSync';
import { fotoDoGrupo } from '@/shared/imagens/fotosDeTreino';
import { useLightWeek } from '@/shared/lightWeek';
import { celebrateSession } from '@/shared/notices';
import { ExerciseSwapSheet } from '../../../components/ExerciseSwapSheet';
import { AjusteDoExercicio } from '../../../components/sessao/AjusteDoExercicio';
import { EffortPrompt } from '../../../components/sessao/EffortPrompt';
import { TelaDeFeedback } from '../../../components/sessao/TelaDeFeedback';
import { useExerciseHistory } from '../../../hooks/useExerciseHistory';
import { isSelfGuidedWorkout } from '../../../hooks/useExerciseSwap';
import { usePesoDoAluno } from '../../../hooks/usePesoDoAluno';
import { useSessionSummaryExit } from '../../../hooks/useSessionSummaryExit';
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
  const selfGuided = isSelfGuidedWorkout(treino, alunoId);
  const history = useExerciseHistory(treino.id, alunoId, selfGuided);
  const deload = useDeloadWeek(treino, selfGuided ? alunoId : null);
  const rests = useRestPeriods(selfGuided ? alunoId : null);
  // A semana leve do "Semana corrida?" (F5) pesa como a volta do descanso.
  const lightWeek = useLightWeek(localDateKey());
  const returnWeek = lightWeek || returnWeekOf(rests, localDateKey()) !== null;
  const today = useMemo(
    () =>
      selfGuided ? todaySuggestions(treino.exercises ?? [], history, { deload, returnWeek }) : {},
    [selfGuided, treino.exercises, history, deload, returnWeek]
  );

  switch (sessao.momento) {
    case 'preInicio':
      return (
        <PreInicioDoTreino
          treino={treino}
          anterior={anterior}
          loadSuggestions={today}
          deload={deload}
          curta={props.curta ?? false}
          onIniciar={() => {
            despachar({
              tipo: 'applySuggestedLoads',
              weights: weightsToApply(sessao.itens, today),
            });
            if (deload) despachar({ tipo: 'applyDeload' });
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
 * Se o treino é do bloco do próprio Praticante e o bloco está na semana de
 * descarga (#376, A7). O treino de outro plano, ou do especialista, segue como
 * está.
 */
function useDeloadWeek(treino: Workout, studentId: string | null): boolean {
  const block = useActiveBlock(studentId);
  if (!block || !treino.training_plan_id || !block.planIds.includes(treino.training_plan_id)) {
    return false;
  }
  return blockWeek(block, localDateKey()).deload;
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
  const { treino, sessao, despachar, podeEditarVideo, alunoId } = props;
  const [ajustando, setAjustando] = useState<string | null>(null);
  const [trocando, setTrocando] = useState<string | null>(null);

  return (
    <>
      <ExecucaoDoTreino {...props} onAjustar={setAjustando} onTrocar={setTrocando} />
      <ExerciseSwapSheet
        item={sessao.itens.find((item) => item.id === trocando) ?? null}
        workoutId={treino.id}
        studentId={alunoId}
        selfGuided={isSelfGuidedWorkout(treino, alunoId)}
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
  onTreinoRegistrado,
}: MomentoDaSessaoProps): GravacaoDaSessao {
  const [salvando, setSalvando] = useState(false);

  const salvar = async (pse: number, notas: string) => {
    setSalvando(true);
    try {
      const paraGravar = montarSessaoDeForca(treino, sessao, { alunoId, pse, notas }, Date.now());
      await gravarSessaoDeForca(paraGravar);
      onTreinoRegistrado();
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
}: MomentoDaSessaoProps & ResumoExtras) {
  const [compartilhando, setCompartilhando] = useState(false);
  // Concluir leva ao início de Treinos, e não ao que estava antes da sessão (#440).
  const concluir = useSessionSummaryExit(
    compartilhando ? () => setCompartilhando(false) : undefined
  );
  const { resumo, evolucoes, concluidaEm } = useResumoDaSessao(sessao, alunoId, anteriores);
  useVictoryOnce(alunoId, evolucoes[0] ?? null);
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
      onConcluir={concluir}
      onCompartilhar={() => setCompartilhando(true)}
    />
  );
}

/** F1 · O aviso de vitória, uma vez por resumo: cada re-render o mandaria de novo. */
function useVictoryOnce(studentId: string, record: { nome: string; texto: string } | null) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    void celebrateSession(studentId, record);
  }, [studentId, record]);
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
