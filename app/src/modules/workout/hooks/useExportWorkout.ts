import { buildWorkoutSheet, type Workout } from '@elevapro/shared';
import { useNomeDoEspecialista } from '@/hooks/useNomeDoEspecialista';
import { useSharePdf } from '@/shared/pdf/useSharePdf';
import { shareWorkout } from '../services/workoutPdf';

/**
 * Exporta o treino em PDF, no papel do protocolo, pela folha de compartilhar.
 *
 * O PDF leva a prescrição do treino, e não as trocas de hoje: é o documento do
 * treino. O profissional é o especialista que prescreveu; no treino que o
 * próprio Praticante montou, a linha não aparece.
 *
 * @example const { exportPdf, generating } = useExportWorkout(workout, studentName);
 */
export function useExportWorkout(workout: Workout, studentName: string | null) {
  const specialist = useNomeDoEspecialista(workout.specialist_id);

  return useSharePdf(
    () =>
      shareWorkout(
        buildWorkoutSheet({ title: workout.title, exercises: workout.exercises ?? [] }),
        { document: 'Protocolo de treino', student: studentName, specialist, validity: null },
        new Date().toLocaleString('pt-BR')
      ),
    'Não consegui gerar o PDF do treino. Tente de novo.'
  );
}
