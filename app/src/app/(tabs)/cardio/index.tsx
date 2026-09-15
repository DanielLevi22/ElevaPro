import { useCallback } from 'react';
import { useAuthStore } from '@/auth';
import { useGamificationStore } from '@/modules/gamification';
import { getLocalDateISOString } from '@/utils/dateUtils';
import { CardioScreen } from '@/workout';

/**
 * O cardio livre (issue #304). A rota compõe o que é de outros módulos — a conta
 * e a ofensiva do dia —, e a tela recebe só o que precisa.
 */
export default function CardioRoute() {
  const { user, isMasquerading, accountType } = useAuthStore();
  const incrementWorkoutProgress = useGamificationStore((s) => s.incrementWorkoutProgress);
  const onCardioSaved = useCallback(
    () => incrementWorkoutProgress(getLocalDateISOString()),
    [incrementWorkoutProgress]
  );

  if (!user?.id) return null;
  return (
    <CardioScreen
      studentId={user.id}
      masquerading={isMasquerading}
      hasSpecialist={accountType !== 'member'}
      onCardioSaved={onCardioSaved}
    />
  );
}
