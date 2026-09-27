import { createNutritionService } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useRef, useState } from 'react';
import { getLocalDateISOString } from '@/utils/dateUtils';
import { draftInput } from '../services/dietDraft';
import { useDietWizardStore } from '../store/dietWizardStore';

const nutrition = createNutritionService(supabase);

interface DraftAccess {
  userId: string | null;
  canCreate: boolean;
}

/** Cria o rascunho do formulário e devolve seu destino, sem decidir navegação.
 * @example const creation = useDietDraftCreation({ userId, canCreate });
 */
export function useDietDraftCreation(access: DraftAccess) {
  const currentAccess = useRef(access);
  currentAccess.current = access;
  const pending = useRef(false);
  const [saving, setSaving] = useState(false);

  async function createDraft(): Promise<string | null> {
    const { userId, canCreate } = currentAccess.current;
    const wizard = useDietWizardStore.getState();
    if (!canCreate || !wizard.studentId || !userId || wizard.actorId !== userId || pending.current)
      return null;
    pending.current = true;
    setSaving(true);
    try {
      const input = draftInput(
        { ...wizard, studentId: wizard.studentId, macroGrams: wizard.macroGrams() },
        userId,
        getLocalDateISOString()
      );
      const plan = await nutrition.createDietPlanFromStrategy(input, wizard.strategy);
      if (
        useDietWizardStore.getState().generation !== wizard.generation ||
        currentAccess.current.userId !== userId ||
        !currentAccess.current.canCreate
      )
        return null;
      wizard.setCreatedPlan(plan.id);
      return plan.id;
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }

  return { saving, createDraft };
}
