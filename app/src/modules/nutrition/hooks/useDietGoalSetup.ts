import { createNutritionService, type DietGoalSuggestion } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useEffect, useState } from 'react';
import { useDietWizardStore } from '../store/dietWizardStore';

const nutrition = createNutritionService(supabase);

export interface DietGoalSetup {
  suggestion: DietGoalSuggestion | null;
  /** A anamnese diz algo sobre alimentação que não virou etiqueta. */
  hasOtherNotes: boolean;
  loading: boolean;
}

/**
 * O que o passo 2 sugere ao abrir: a meta pela anamnese e pela última medida,
 * e as restrições pela anamnese. A sugestão entra uma vez; dali em diante vale
 * o que o especialista ajustar.
 *
 * @example const { suggestion, hasOtherNotes } = useDietGoalSetup(studentId);
 */
export function useDietGoalSetup(studentId: string): DietGoalSetup {
  const [suggestion, setSuggestion] = useState<DietGoalSuggestion | null>(null);
  const [hasOtherNotes, setHasOtherNotes] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) {
      setLoading(false);
      return;
    }
    let active = true;
    const generation = useDietWizardStore.getState().generation;
    setLoading(true);
    setSuggestion(null);
    setHasOtherNotes(false);
    Promise.all([
      nutrition.fetchDietGoalSuggestion(studentId),
      nutrition.fetchDietaryRestrictionHint(studentId),
    ])
      .then(([goal, hint]) => {
        if (!active) return;
        const wizard = useDietWizardStore.getState();
        if (wizard.generation !== generation) return;
        wizard.initializeGoals(studentId, goal, hint.suggested);
        setSuggestion(goal);
        setHasOtherNotes(hint.hasOtherNotes);
      })
      // Sem sugestão a tela segue com a meta à mão: a falha não trava o passo.
      .catch(() => undefined)
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [studentId]);

  return { suggestion, hasOtherNotes, loading };
}
