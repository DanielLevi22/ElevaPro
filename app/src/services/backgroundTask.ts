import { supabase } from '@elevapro/supabase';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { useNutritionStore } from '@/modules/nutrition/routes/index';

const BACKGROUND_DIET_SYNC = 'BACKGROUND_DIET_SYNC';

TaskManager.defineTask(BACKGROUND_DIET_SYNC, async () => {
  try {
    console.log('🔄 Background Fetch: Starting diet sync check...');

    // 1. Check if user is logged in
    // Note: Zustand state might not be persisted across app kills unless using persist middleware.
    // However, Supabase client usually persists session in SecureStore.
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      console.log('⏹️ Background Fetch: No active session. Skipping.');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const studentId = session.user.id;
    console.log(`👤 Background Fetch: User ${studentId} is logged in.`);

    // 2. Fetch the active diet plan for this student
    const { data: activePlan, error } = await supabase
      .from('diet_plans')
      // `updated_at` não existe em `diet_plans`, e pedi-la fazia o PostgREST
      // recusar a consulta inteira com 42703. O erro caía no `if` abaixo e
      // virava "nenhum plano ativo" — a sincronização em background da dieta
      // nunca rodou, e o log dizia que era falta de plano.
      // O `version` já é o que a comparação usa; a coluna extra era só ruído.
      .select('id, version')
      .eq('student_id', studentId)
      .eq('status', 'active')
      .single();

    if (error || !activePlan) {
      console.log('⏹️ Background Fetch: No active plan found or error.', error);
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // 3. Check if we have this plan version locally
    // We can access the store state directly
    const currentStorePlan = useNutritionStore.getState().currentDietPlan;

    // If we don't have a plan in store (app killed) OR the version/updated_at is different
    // We should fetch and reschedule.
    // Note: 'version' might not be incremented reliably by backend triggers, so updated_at is safer if available.
    // If updated_at is not available, we rely on version or just fetch anyway if we want to be safe.

    const needsUpdate =
      !currentStorePlan ||
      currentStorePlan.id !== activePlan.id ||
      currentStorePlan.version !== activePlan.version;

    if (needsUpdate) {
      console.log('📥 Background Fetch: New plan data detected. Fetching full plan...');

      // Fetch full plan logic (reusing store action would be ideal, but we need to be careful about async)
      // We can manually fetch to avoid side effects or just call the store action.
      // Calling store action is cleaner but might trigger UI updates if app is in foreground (which is fine).

      await useNutritionStore.getState().fetchDietPlan(studentId);

      // O agendamento vive em `fetchMeals`, não em `fetchDietPlan`: lembrete de
      // refeição precisa das refeições, e o plano sozinho não as traz. Este
      // comentário já afirmou que `fetchDietPlan` agendava, e foi por isso que
      // ninguém percebeu que nada era agendado em lugar nenhum.
      const plano = useNutritionStore.getState().currentDietPlan;
      if (plano?.id) await useNutritionStore.getState().fetchMeals(plano.id);

      console.log('✅ Background Fetch: Plan updated and notifications rescheduled.');
      return BackgroundFetch.BackgroundFetchResult.NewData;
    }

    console.log('✅ Background Fetch: Plan is up to date.');
    return BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (error) {
    console.error('❌ Background Fetch failed:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundFetchAsync() {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_DIET_SYNC);

    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_DIET_SYNC, {
        minimumInterval: 60 * 15, // 15 minutes
        stopOnTerminate: false, // Android only
        startOnBoot: true, // Android only
      });
      console.log('✅ Background Fetch registered: 15 min interval');
    } else {
      console.log('ℹ️ Background Fetch already registered');
    }
  } catch (err) {
    console.error('❌ Task Register failed:', err);
  }
}

export async function unregisterBackgroundFetchAsync() {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_DIET_SYNC);
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_DIET_SYNC);
      console.log('✅ Background Fetch unregistered');
    }
  } catch (err) {
    console.error('❌ Task Unregister failed:', err);
  }
}
