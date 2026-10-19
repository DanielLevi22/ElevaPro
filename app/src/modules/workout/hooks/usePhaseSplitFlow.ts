import { useCallback, useState } from 'react';
import { showAlert, showConfirm } from '@/components/ui/appAlert';
import { useWorkoutStore } from '../store/workoutStore';

type Phase = ReturnType<typeof useWorkoutStore.getState>['currentPeriodizationPhases'][0];
type StoreState = ReturnType<typeof useWorkoutStore.getState>;

interface UsePhaseSplitFlowParams {
  phase: Phase | undefined;
  userId: string | undefined;
  createWorkout: StoreState['createWorkout'];
  deleteWorkoutsForPhase: StoreState['deleteWorkoutsForPhase'];
  fetchWorkoutsForPhase: StoreState['fetchWorkoutsForPhase'];
  updateTrainingPlan: StoreState['updateTrainingPlan'];
}

const STATUS_LABEL = { planned: 'Planejado', active: 'Ativo', completed: 'Concluído' } as const;

/**
 * Divisão de treino e status da fase — o mesmo comportamento do web.
 *
 * Escolher a divisão pede confirmação, apaga as fichas da fase e cria uma
 * ficha vazia por letra ("ABC" → Treino A, B e C). Junto com o status porque
 * os dois mexem no mesmo `phase` e recarregam a mesma lista.
 *
 * @example const splitFlow = usePhaseSplitFlow({ phase, userId, ...store });
 */
export function usePhaseSplitFlow({
  phase,
  userId,
  createWorkout,
  deleteWorkoutsForPhase,
  fetchWorkoutsForPhase,
  updateTrainingPlan,
}: UsePhaseSplitFlowParams) {
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [customSplit, setCustomSplit] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showStatusModalMenu, setShowStatusModalMenu] = useState(false);

  const applySplit = useCallback(
    async (split: string) => {
      if (!phase || !userId) return;
      setIsGenerating(true);
      try {
        await deleteWorkoutsForPhase(phase.id);
        for (const letter of split) {
          await createWorkout({
            training_plan_id: phase.id,
            title: `Treino ${letter}`,
            specialist_id: userId,
          });
        }
        await fetchWorkoutsForPhase(phase.id);
      } catch {
        showAlert({ title: 'Erro', message: 'Não foi possível criar os treinos.', type: 'error' });
      } finally {
        setIsGenerating(false);
      }
    },
    [phase, userId, deleteWorkoutsForPhase, createWorkout, fetchWorkoutsForPhase]
  );

  const handleSelectSplit = useCallback(
    (split?: string) => {
      const finalSplit = (split || customSplit).toUpperCase().trim();
      if (!/^[A-Z]+$/.test(finalSplit)) {
        showAlert({
          title: 'Divisão inválida',
          message: `"${finalSplit}" não serve: use só letras de A a Z, como ABC.`,
          type: 'warning',
        });
        return;
      }
      setShowSplitModal(false);
      setCustomSplit('');
      showConfirm({
        title: 'Alterar divisão de treino?',
        message: confirmMessage(finalSplit),
        type: 'danger',
        confirmText: 'Sim, alterar',
        onConfirm: () => applySplit(finalSplit),
      });
    },
    [customSplit, applySplit]
  );

  const handleUpdateStatus = useCallback(
    async (newStatus: keyof typeof STATUS_LABEL) => {
      if (!phase) return;
      try {
        await updateTrainingPlan(phase.id, { status: newStatus });
        setShowStatusModalMenu(false);
        showAlert({
          title: 'Status alterado',
          message: `A fase agora está ${STATUS_LABEL[newStatus]}.`,
          type: 'success',
        });
      } catch {
        showAlert({ title: 'Erro', message: 'Não foi possível alterar o status.', type: 'error' });
      }
    },
    [phase, updateTrainingPlan]
  );

  return {
    showSplitModal,
    setShowSplitModal,
    customSplit,
    setCustomSplit,
    isGenerating,
    showStatusModalMenu,
    setShowStatusModalMenu,
    handleSelectSplit,
    handleUpdateStatus,
  };
}

/** O mesmo aviso do web: o que some e o que nasce no lugar. */
function confirmMessage(split: string): string {
  const total = split.length;
  const plural = total !== 1 ? 's' : '';
  const verb = total !== 1 ? 'serão' : 'será';
  return `Ao mudar para a divisão ${split}, todos os treinos atuais desta fase serão excluídos e ${total} treino${plural} vazio${plural} ${verb} criado${plural}. Esta ação não pode ser desfeita.`;
}
