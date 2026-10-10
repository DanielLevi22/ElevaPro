import { practitionerDietTargetFromAnswers } from '@elevapro/shared';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/auth';
import { loadOnboardingAnswers } from '../services/onboardingAnswers';
import { projectWeight, type WeightProjection } from '../services/projection';

/**
 * A projeção de O8, calculada no aparelho com as respostas da própria pessoa
 * e a mesma meta que o BFF usa (`practitionerDietTargetFromAnswers`): a curva
 * aparece enquanto a IA ainda monta o plano.
 *
 * @example const projection = useWeightProjection(); // null sem dieta ou em manutenção
 */
export function useWeightProjection(): WeightProjection | null {
  const studentId = useAuthStore((state) => state.session?.user.id ?? null);
  const [projection, setProjection] = useState<WeightProjection | null>(null);

  useEffect(() => {
    if (!studentId) return;
    loadOnboardingAnswers(studentId)
      .then((answers) => {
        const target = practitionerDietTargetFromAnswers(answers);
        if (target?.kind !== 'target' || typeof answers.weight !== 'number') return;
        setProjection(
          projectWeight({
            weightKg: answers.weight,
            tdee: target.tdee,
            targetCalories: target.targetCalories,
          })
        );
      })
      // Sem as respostas, a espera segue sem a curva: ela é enfeite útil, não passo.
      .catch(() => setProjection(null));
  }, [studentId]);

  return projection;
}
