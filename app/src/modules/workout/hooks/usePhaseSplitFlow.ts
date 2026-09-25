import { useCallback, useState } from 'react';
import { showAlert } from '@/components/ui/appAlert';
import { useWorkoutStore } from '../store/workoutStore';

type Phase = ReturnType<typeof useWorkoutStore.getState>['currentPeriodizationPhases'][0];
type StoreState = ReturnType<typeof useWorkoutStore.getState>;

interface UsePhaseSplitFlowParams {
  phase: Phase | undefined;
  userId: string | undefined;
  workoutsCount: number;
  createWorkout: StoreState['createWorkout'];
  deleteWorkoutsForPhase: StoreState['deleteWorkoutsForPhase'];
  fetchWorkoutsForPhase: StoreState['fetchWorkoutsForPhase'];
  updateTrainingPlan: StoreState['updateTrainingPlan'];
  /** Pra onde "Usar Co-Pilot" leva depois de limpar os treinos antigos — o
   * passo de montagem do wizard (#335), que já tem a IA de verdade. Recebe a
   * divisão escolhida, pro wizard não abrir sem lembrar dela. */
  onAiReady: (split: string) => void;
}

/**
 * Divisão de treino, geração em lote e status da fase — o fluxo que vai da
 * escolha da divisão ("ABC") até treinos vazios ou a proposta da IA.
 *
 * Junto porque as duas pontas (divisão e status) mexem no mesmo `phase` e
 * disparam o mesmo `fetchWorkoutsForPhase`; separar viraria dois hooks
 * chamando um ao outro.
 */
export function usePhaseSplitFlow({
  phase,
  userId,
  workoutsCount,
  createWorkout,
  deleteWorkoutsForPhase,
  fetchWorkoutsForPhase,
  updateTrainingPlan,
  onAiReady,
}: UsePhaseSplitFlowParams) {
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [customSplit, setCustomSplit] = useState('');
  const [pendingSplit, setPendingSplit] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showStatusModalMenu, setShowStatusModalMenu] = useState(false);

  const handleSelectSplit = useCallback(
    async (split?: string) => {
      if (!phase || !userId) return;

      const finalSplit = split || customSplit.toUpperCase().trim();
      if (!finalSplit) {
        showAlert({
          title: 'Atenção',
          message: 'Digite uma divisão de treino válida.',
          type: 'warning',
        });
        return;
      }
      if (!/^[A-Z]+$/.test(finalSplit)) {
        showAlert({
          title: 'Erro',
          message: 'A divisão deve conter apenas letras (A-Z).',
          type: 'error',
        });
        return;
      }

      // Nova divisão ou mudança de uma existente: as duas passam pela
      // confirmação (treinos vazios vs. IA), nunca gravam direto.
      setPendingSplit(finalSplit);
      setShowWarningModal(true);
      setShowSplitModal(false);
    },
    [phase, userId, customSplit]
  );

  const createWorkoutsForSplit = useCallback(
    async (phaseId: string, split: string, specialistId: string) => {
      for (const letter of split.split('')) {
        await createWorkout({
          training_plan_id: phaseId,
          title: `Treino ${letter}`,
          description: '',
          specialist_id: specialistId,
        });
      }
    },
    [createWorkout]
  );

  const executeSplitChange = useCallback(
    async (finalSplit: string) => {
      if (!phase || !userId) return;

      setIsGenerating(true);
      try {
        await deleteWorkoutsForPhase(phase.id);
        await createWorkoutsForSplit(phase.id, finalSplit, userId);
        await fetchWorkoutsForPhase(phase.id);
        setShowSplitModal(false);
        setCustomSplit('');
        showAlert({
          title: 'Sucesso! 🏋️',
          message: `Treinos vazios criados para divisão ${finalSplit}. Adicione exercícios manualmente ou use o Co-Pilot.`,
          type: 'success',
        });
      } catch (_error: unknown) {
        showAlert({ title: 'Erro', message: 'Não foi possível criar os treinos.', type: 'error' });
      } finally {
        setIsGenerating(false);
      }
    },
    [phase, userId, deleteWorkoutsForPhase, createWorkoutsForSplit, fetchWorkoutsForPhase]
  );

  const handleAIAssist = useCallback(
    (split?: string) => {
      if (!phase) return;
      const finalSplit = split || customSplit.toUpperCase().trim();
      if (!finalSplit) {
        showAlert({
          title: 'Atenção',
          message: 'Selecione ou digite uma divisão primeiro.',
          type: 'warning',
        });
        return;
      }
      setShowSplitModal(false);
      setCustomSplit('');
      onAiReady(finalSplit);
    },
    [phase, customSplit, onAiReady]
  );

  const handleUseAiFromConfirm = useCallback(async () => {
    if (!phase) return;
    setShowWarningModal(false);
    if (workoutsCount > 0) {
      setIsGenerating(true);
      try {
        await deleteWorkoutsForPhase(phase.id);
        await fetchWorkoutsForPhase(phase.id);
      } catch (_error) {
        setIsGenerating(false);
        showAlert({ title: 'Erro', message: 'Falha ao limpar treinos antigos.', type: 'error' });
        return;
      } finally {
        setIsGenerating(false);
      }
    }
    handleAIAssist(pendingSplit);
  }, [
    phase,
    workoutsCount,
    deleteWorkoutsForPhase,
    fetchWorkoutsForPhase,
    handleAIAssist,
    pendingSplit,
  ]);

  const handleEmptyWorkoutsFromConfirm = useCallback(() => {
    setShowWarningModal(false);
    setTimeout(() => {
      executeSplitChange(pendingSplit);
    }, 200);
  }, [executeSplitChange, pendingSplit]);

  const handleCancelSplitConfirm = useCallback(() => {
    setShowWarningModal(false);
    setPendingSplit('');
  }, []);

  const handleUpdateStatus = useCallback(
    async (newStatus: 'planned' | 'active' | 'completed') => {
      if (!phase) return;
      const statusLabel =
        newStatus === 'planned' ? 'Planejado' : newStatus === 'active' ? 'Ativo' : 'Concluído';
      try {
        await updateTrainingPlan(phase.id, { status: newStatus });
        setShowStatusModalMenu(false);
        showAlert({
          title: 'Sucesso! ✨',
          message: `O status da fase foi alterado para ${statusLabel}.`,
          type: 'success',
        });
      } catch (_error: unknown) {
        showAlert({
          title: 'Erro',
          message: 'Houve um problema ao atualizar o status.',
          type: 'error',
        });
      }
    },
    [phase, updateTrainingPlan]
  );

  return {
    showSplitModal,
    setShowSplitModal,
    showWarningModal,
    customSplit,
    setCustomSplit,
    pendingSplit,
    isGenerating,
    showStatusModalMenu,
    setShowStatusModalMenu,
    handleSelectSplit,
    handleUseAiFromConfirm,
    handleEmptyWorkoutsFromConfirm,
    handleCancelSplitConfirm,
    handleUpdateStatus,
  };
}
