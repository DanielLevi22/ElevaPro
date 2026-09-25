import type { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { showAlert, showConfirm } from '@/components/ui/appAlert';
import { ROUTES } from '@/navigation/types';
import { useWorkoutStore } from '../store/workoutStore';

type StoreState = ReturnType<typeof useWorkoutStore.getState>;
type Workout = StoreState['workouts'][0];

interface UseSuggestedWorkoutParams {
  workouts: Workout[];
  userId: string | undefined;
  accountType: string | null | undefined;
  isStudentView: boolean;
  mode: string | undefined;
  router: ReturnType<typeof useRouter>;
  fetchLastWorkoutSession: StoreState['fetchLastWorkoutSession'];
}

/** "Gym day" começa às 4h: quem treina 1h da manhã ainda está no dia anterior. */
function gymDateString(date: Date): string {
  const adjusted = new Date(date);
  adjusted.setHours(adjusted.getHours() - 4);
  return adjusted.toDateString();
}

/**
 * Qual treino sugerir hoje (rotaciona a partir do último feito) e pra onde
 * navegar ao tocar nele — a mesma regra de rota vale pro treino sugerido e
 * pra qualquer item da lista, então as duas navegações moram aqui juntas.
 */
export function useSuggestedWorkout({
  workouts,
  userId,
  accountType,
  isStudentView,
  mode,
  router,
  fetchLastWorkoutSession,
}: UseSuggestedWorkoutParams) {
  const [suggestedWorkout, setSuggestedWorkout] = useState<Workout | null>(null);
  const [isWorkoutDoneToday, setIsWorkoutDoneToday] = useState(false);

  useEffect(() => {
    const determineSuggested = async () => {
      if (!userId || workouts.length === 0) return;

      const lastSession = await fetchLastWorkoutSession(userId);
      if (!lastSession) {
        setSuggestedWorkout(workouts[0]);
        return;
      }

      const lastDate = gymDateString(new Date(lastSession.completed_at ?? ''));
      const today = gymDateString(new Date());
      if (lastDate === today) setIsWorkoutDoneToday(true);

      const lastIndex = workouts.findIndex((w) => w.id === lastSession.workout_id);
      if (lastIndex === -1) {
        // Último treino não está nesta fase (pode ser de outra) — sugere o primeiro.
        setSuggestedWorkout(workouts[0]);
      } else {
        setSuggestedWorkout(workouts[(lastIndex + 1) % workouts.length]);
      }
    };

    determineSuggested();
  }, [workouts, userId, fetchLastWorkoutSession]);

  /** Mesma regra que a lista de treinos já seguia: `isSpecialistOrPersonal` vai
   * pra tela nova; o resto cai na rota antiga, com o meio-termo de `/students/`
   * só pra quem não é `member`. */
  const goToWorkout = useCallback(
    (workoutId: string) => {
      const proceed = () => {
        const isSpecialistOrPersonal =
          (accountType as string) === 'personal' || (accountType as string) === 'specialist';
        if (isSpecialistOrPersonal) {
          router.push(ROUTES.WORKOUTS.DETAILS_FOR_SPECIALIST(workoutId, userId));
        } else if (isStudentView && accountType !== 'member' && userId) {
          router.push(ROUTES.STUDENTS.WORKOUT_DETAILS(userId, workoutId));
        } else {
          router.push(ROUTES.WORKOUTS.DETAILS_STUDENT(workoutId, mode === 'execute'));
        }
      };

      if (isStudentView && isWorkoutDoneToday) {
        showConfirm({
          title: 'Treino Realizado',
          message: 'Você já registrou um treino hoje. Deseja realizar outro treino?',
          type: 'warning',
          confirmText: 'Sim, Treinar',
          cancelText: 'Cancelar',
          onConfirm: proceed,
        });
        return;
      }
      proceed();
    },
    [accountType, isStudentView, isWorkoutDoneToday, mode, router, userId]
  );

  const goToSuggestedWorkout = useCallback(() => {
    if (!suggestedWorkout) return;
    const proceed = () => {
      const isSpecialistOrPersonal =
        (accountType as string) === 'personal' || (accountType as string) === 'specialist';
      if (isSpecialistOrPersonal) {
        router.push(ROUTES.WORKOUTS.DETAILS_FOR_SPECIALIST(suggestedWorkout.id, userId));
      } else if (isStudentView && accountType !== 'member' && userId) {
        router.push(ROUTES.STUDENTS.WORKOUT_DETAILS(userId, suggestedWorkout.id));
      } else {
        router.push(ROUTES.WORKOUTS.DETAILS_STUDENT(suggestedWorkout.id, mode === 'execute'));
      }
    };

    if (isWorkoutDoneToday) {
      showAlert({
        title: 'Meta Atingida! 🏆',
        message: 'Você já treinou hoje. Descanse para voltar mais forte amanhã!',
        type: 'info',
      });
      return;
    }
    proceed();
  }, [suggestedWorkout, accountType, isStudentView, mode, router, userId, isWorkoutDoneToday]);

  return { suggestedWorkout, isWorkoutDoneToday, goToWorkout, goToSuggestedWorkout };
}
