import type {
  Exercise,
  Periodization,
  SaveSessionSetInput,
  TrainingPlan,
  UpdatePeriodizationInput,
  UpdateTrainingPlanInput,
  Workout,
  WorkoutExercise,
  WorkoutSession,
} from '@elevapro/shared';
import { createHealthService, createWorkoutsService } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { create } from 'zustand';
import { useAuthStore } from '@/modules/auth/store/authStore';
import { type AIWorkoutItem, WorkoutAIService } from '../services/WorkoutAIService';

export type {
  Exercise,
  Periodization,
  TrainingPlan,
  Workout,
  WorkoutExercise as WorkoutItem,
  WorkoutSession,
};

const workoutsService = createWorkoutsService(supabase);
const healthService = createHealthService(supabase);

/**
 * Devolve as observações do aluno só quando há consentimento vigente para dado
 * de saúde; caso contrário, `undefined` — a sessão é gravada sem elas.
 *
 * Séries, cargas, datas e RPE são execução de contrato e não dependem de
 * consentimento. O texto livre é o que exige Art. 11: é onde o aluno escreve
 * "senti dor no ombro". Gravar os dois sob a mesma decisão trataria uma medida
 * de carga como relato clínico, ou o contrário.
 *
 * É isto que dá sentido ao "Agora não" do `HealthDataConsentGate`: sem esta
 * verificação, recusar seria um botão que não muda nada.
 */
async function notasSeConsentido(
  studentId: string,
  notas: string | undefined
): Promise<string | undefined> {
  if (!notas?.trim()) return undefined;
  try {
    return (await healthService.hasCollectionConsent(studentId)) ? notas : undefined;
  } catch {
    // Falha de rede não autoriza: na dúvida, a sessão é gravada sem o texto.
    return undefined;
  }
}

export interface SelectedExercise {
  id: string;
  name: string;
  muscle_group: string;
  sets: number;
  reps: number;
  weight: string;
  rest_seconds: number;
  video_url?: string;
}

interface WorkoutState {
  workouts: Workout[];
  libraryWorkouts: Workout[];
  periodizations: Periodization[];
  exercises: Exercise[];
  selectedExercises: SelectedExercise[];
  currentPeriodizationPhases: TrainingPlan[];
  isLoading: boolean;
  fetchWorkouts: (specialistId: string) => Promise<void>;
  fetchWorkoutById: (id: string) => Promise<Workout | null>;
  fetchPeriodizations: (userId: string) => Promise<void>;
  fetchPeriodizationPhases: (periodizationId: string) => Promise<void>;
  fetchExercises: () => Promise<void>;
  createExercise: (exercise: {
    name: string;
    muscle_group: string;
    video_url?: string;
  }) => Promise<void>;
  createPeriodization: (
    periodization: Omit<Periodization, 'id' | 'created_at' | 'updated_at' | 'student'>
  ) => Promise<Periodization>;
  updatePeriodization: (id: string, updates: Partial<Periodization>) => Promise<void>;
  activatePeriodization: (periodizationId: string) => Promise<Periodization>;
  createTrainingPlan: (plan: Omit<TrainingPlan, 'id' | 'created_at'>) => Promise<TrainingPlan>;
  updateTrainingPlan: (id: string, updates: Partial<TrainingPlan>) => Promise<void>;
  deleteTrainingPlan: (id: string) => Promise<void>;
  fetchWorkoutsForPhase: (trainingPlanId: string) => Promise<void>;
  addWorkoutItems: (workoutId: string, items: WorkoutExercise[]) => Promise<void>;
  createWorkout: (workout: {
    training_plan_id: string;
    title: string;
    description?: string;
    muscle_group?: string;
    specialist_id: string;
  }) => Promise<void>;
  generateWorkoutsForPhase: (
    trainingPlanId: string,
    split: string,
    specialistId: string
  ) => Promise<void>;
  generateWorkoutsForPeriodization: (
    periodizationId: string,
    phases: TrainingPlan[],
    split: string,
    specialistId: string,
    agreedExercises?: string[]
  ) => Promise<void>;
  saveGeneratedWorkouts: (
    trainingPlanId: string,
    aiWorkouts: { letter: string; focus?: string; exercises: AIWorkoutItem[] }[],
    specialistId: string
  ) => Promise<void>;
  saveWorkoutSession: (sessionData: {
    workoutId: string;
    studentId: string;
    startedAt: string;
    completedAt: string;
    items: { workoutExerciseId: string; sets: SaveSessionSetInput[] }[];
    intensity?: number;
    notes?: string;
  }) => Promise<string>;
  saveCardioSession: (sessionData: {
    studentId: string;
    exerciseName: string;
    durationSeconds: number;
    calories: number;
    startedAt: string;
    completedAt: string;
    intensity?: number;
    notes?: string;
  }) => Promise<void>;
  fetchLastWorkoutSession: (
    studentId: string
  ) => Promise<{ workout_id: string | null; completed_at: string | null } | null>;
  fetchWorkoutSessionDetails: (
    workoutId: string,
    studentId: string
  ) => Promise<WorkoutSession | null>;
  setSelectedExercises: (exercises: SelectedExercise[]) => void;
  clearSelectedExercises: () => void;
  duplicateWorkout: (workoutId: string, targetPlanId: string) => Promise<void>;
  reset: () => void;
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  workouts: [],
  libraryWorkouts: [],
  periodizations: [],
  exercises: [],
  selectedExercises: [],
  currentPeriodizationPhases: [],
  isLoading: false,

  fetchPeriodizationPhases: async (periodizationId) => {
    set({ isLoading: true });
    try {
      const plans = await workoutsService.fetchTrainingPlans(periodizationId);
      set({ currentPeriodizationPhases: plans });
    } catch (error) {
      console.error('Error fetching phases:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  createTrainingPlan: async (plan) => {
    try {
      const created = await workoutsService.createTrainingPlan({
        periodization_id: plan.periodization_id,
        name: plan.name,
        start_date: plan.start_date ?? undefined,
        end_date: plan.end_date ?? undefined,
        order_index: plan.order_index,
      });
      set((state) => ({
        currentPeriodizationPhases: [...state.currentPeriodizationPhases, created],
      }));
      return created;
    } catch (error) {
      console.error('Error creating training plan:', error);
      throw error;
    }
  },

  fetchPeriodizations: async (userId) => {
    set({ isLoading: true });
    try {
      const authState = useAuthStore.getState();
      const accountType = authState.accountType;

      if (!accountType) {
        console.warn('fetchPeriodizations: No account type found in authStore');
        set({ periodizations: [], isLoading: false });
        return;
      }

      let periodizations: Periodization[];
      if (accountType === 'specialist') {
        periodizations = await workoutsService.fetchPeriodizations(userId);
      } else {
        periodizations = await workoutsService.fetchStudentPeriodizations(userId);
      }

      set({ periodizations });
    } catch (error) {
      console.error('Error fetching periodizations:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchWorkouts: async (specialistId) => {
    set({ isLoading: true });
    try {
      const workouts = await workoutsService.fetchWorkouts(specialistId);
      set({ libraryWorkouts: workouts });
    } catch (error) {
      console.error('Error fetching workouts:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchWorkoutById: async (id) => {
    set({ isLoading: true });
    try {
      const data = await workoutsService.fetchWorkoutById(id);
      if (data) {
        set((state) => {
          const exists = state.workouts.find((w) => w.id === id);
          return {
            workouts: exists
              ? state.workouts.map((w) => (w.id === id ? data : w))
              : [...state.workouts, data],
          };
        });
      }
      return data;
    } catch (error) {
      console.error('Error fetching workout by id:', error);
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchExercises: async () => {
    try {
      const exercises = await workoutsService.fetchExercises();
      set({ exercises });
    } catch (error) {
      console.error('Error fetching exercises:', error);
    }
  },

  createExercise: async (exercise) => {
    try {
      await workoutsService.createExercise(exercise);
      await get().fetchExercises();
    } catch (error) {
      console.error('Error creating exercise:', error);
      throw error;
    }
  },

  createPeriodization: async (periodization) => {
    try {
      const created = await workoutsService.createPeriodization({
        specialist_id: periodization.specialist_id,
        student_id: periodization.student_id,
        name: periodization.name,
        objective: periodization.objective ?? undefined,
        start_date: periodization.start_date ?? undefined,
        end_date: periodization.end_date ?? undefined,
      });

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', periodization.student_id)
        .single();

      const newPeriodization = {
        ...created,
        student: profile
          ? { id: periodization.student_id, full_name: profile.full_name, email: profile.email }
          : undefined,
      };

      set((state) => ({ periodizations: [newPeriodization, ...state.periodizations] }));
      return created;
    } catch (error) {
      console.error('Error creating periodization:', error);
      throw error;
    }
  },

  updatePeriodization: async (id, updates) => {
    try {
      await workoutsService.updatePeriodization(id, updates as UpdatePeriodizationInput);
      set((state) => ({
        periodizations: state.periodizations.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      }));
    } catch (error) {
      console.error('Error updating periodization:', error);
      throw error;
    }
  },

  activatePeriodization: async (periodizationId) => {
    try {
      const activated = await workoutsService.activatePeriodization(periodizationId);
      set((state) => ({
        periodizations: state.periodizations.map((p) => {
          if (p.id === periodizationId) return { ...p, status: 'active' as const };
          if (p.student_id === activated.student_id && p.status === 'active')
            return { ...p, status: 'completed' as const };
          return p;
        }),
      }));
      return activated;
    } catch (error) {
      console.error('Error activating periodization:', error);
      throw error;
    }
  },

  updateTrainingPlan: async (id, updates) => {
    try {
      await workoutsService.updateTrainingPlan(id, updates as UpdateTrainingPlanInput);
      set((state) => ({
        currentPeriodizationPhases: state.currentPeriodizationPhases.map((p) =>
          p.id === id ? { ...p, ...updates } : p
        ),
      }));
    } catch (error) {
      console.error('Error updating training plan:', error);
      throw error;
    }
  },

  deleteTrainingPlan: async (id) => {
    try {
      await workoutsService.deleteTrainingPlan(id);
      set((state) => ({
        currentPeriodizationPhases: state.currentPeriodizationPhases.filter((p) => p.id !== id),
      }));
    } catch (error) {
      console.error('Error deleting training plan:', error);
      throw error;
    }
  },

  fetchWorkoutsForPhase: async (trainingPlanId) => {
    set({ isLoading: true });
    try {
      const workouts = await workoutsService.fetchWorkoutsByPlan(trainingPlanId);
      set({ workouts });
    } catch (error) {
      console.error('Error fetching workouts for phase:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  saveGeneratedWorkouts: async (trainingPlanId, aiWorkouts, specialistId) => {
    try {
      set({ isLoading: true });
      const availableExercises = get().exercises;
      if (availableExercises.length === 0) await get().fetchExercises();

      await workoutsService.deleteWorkout(trainingPlanId).catch(() => {
        // Ignore — we delete by plan below
      });

      const { error: deleteError } = await supabase
        .from('workouts')
        .delete()
        .eq('training_plan_id', trainingPlanId);
      if (deleteError) throw deleteError;

      if (aiWorkouts.length === 0) {
        await get().fetchWorkoutsForPhase(trainingPlanId);
        return;
      }

      const workoutsToInsert = aiWorkouts.map((aiWorkout) => ({
        training_plan_id: trainingPlanId,
        specialist_id: specialistId,
        title: `Treino ${aiWorkout.letter}`,
        description: aiWorkout.focus ? `Foco: ${aiWorkout.focus}` : '',
        muscle_group: aiWorkout.focus ?? null,
      }));

      const { data: newWorkouts, error: workoutError } = await supabase
        .from('workouts')
        .insert(workoutsToInsert)
        .select();
      if (workoutError) throw workoutError;

      const itemsToInsert: {
        workout_id: string;
        exercise_id: string;
        sets: number;
        reps: string;
        rest_seconds: number;
        notes: string;
        order_index: number;
      }[] = [];

      aiWorkouts.forEach((aiWorkout, wIndex) => {
        const matchingTitle = `Treino ${aiWorkout.letter}`;
        const newWorkout =
          newWorkouts.find((w) => w.title === matchingTitle) || newWorkouts[wIndex];
        if (aiWorkout.exercises && aiWorkout.exercises.length > 0) {
          aiWorkout.exercises.forEach((item: AIWorkoutItem, index: number) => {
            const exercise = availableExercises.find(
              (e: Exercise) => e.name.toLowerCase() === item.exerciseName.toLowerCase()
            );
            if (exercise) {
              itemsToInsert.push({
                workout_id: newWorkout.id,
                exercise_id: exercise.id,
                sets: item.sets,
                reps: item.reps,
                rest_seconds: item.rest,
                notes: item.technique
                  ? item.technique +
                    (item.load_suggestion ? ` | Carga: ${item.load_suggestion}` : '')
                  : item.load_suggestion
                    ? `Carga: ${item.load_suggestion}`
                    : '',
                order_index: index,
              });
            }
          });
        }
      });

      if (itemsToInsert.length > 0) {
        const { error: itemsError } = await supabase
          .from('workout_exercises')
          .insert(itemsToInsert);
        if (itemsError) throw itemsError;
      }

      await get().fetchWorkoutsForPhase(trainingPlanId);
    } catch (error) {
      console.error('Error saving generated workouts:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  generateWorkoutsForPhase: async (trainingPlanId, split, specialistId) => {
    try {
      const { data: plan } = await supabase
        .from('training_plans')
        .select('name')
        .eq('id', trainingPlanId)
        .single();

      const goal = plan?.name || 'Hipertrofia';

      if (get().exercises.length === 0) await get().fetchExercises();
      const availableExercises = get().exercises;

      const { plan: aiWorkouts } = await WorkoutAIService.generateWorkoutStructure(
        split,
        goal,
        'Intermediário',
        availableExercises
      );

      await get().saveGeneratedWorkouts(trainingPlanId, aiWorkouts, specialistId);
    } catch (error) {
      console.error('Error generating workouts:', error);
      throw error;
    }
  },

  generateWorkoutsForPeriodization: async (
    _periodizationId,
    phases,
    split,
    specialistId,
    agreedExercises
  ) => {
    try {
      set({ isLoading: true });

      const goal = phases[0]?.name || 'Hipertrofia';

      if (get().exercises.length === 0) await get().fetchExercises();
      const availableExercises = get().exercises;

      const aiPhases = phases.map((p) => ({
        name: p.name,
        focus: p.name,
        weeks:
          p.start_date && p.end_date
            ? Math.round(
                (new Date(p.end_date).getTime() - new Date(p.start_date).getTime()) /
                  (7 * 24 * 60 * 60 * 1000)
              ) || 4
            : 4,
      }));

      const batchResult = await WorkoutAIService.generateBatchWorkoutPlan(
        aiPhases,
        split,
        goal,
        'Intermediário',
        availableExercises,
        agreedExercises
          ? `Exercícios exigidos pelo aluno: ${agreedExercises.join(', ')}`
          : undefined
      );

      const savePromises = phases.map((phase, i) => {
        const aiResponse = batchResult[i];
        if (aiResponse?.plan) {
          return get().saveGeneratedWorkouts(phase.id, aiResponse.plan, specialistId);
        }
        return Promise.resolve();
      });

      await Promise.all(savePromises);
    } catch (error) {
      console.error('Error in batch generation:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  addWorkoutItems: async (workoutId, items) => {
    try {
      await workoutsService.addExercisesToWorkout(
        workoutId,
        items.map((item) => ({
          exercise_id: item.exercise_id,
          sets: item.sets ?? undefined,
          reps: item.reps ?? undefined,
          weight: item.weight ?? undefined,
          rest_seconds: item.rest_seconds ?? undefined,
          order_index: item.order_index,
          notes: item.notes ?? undefined,
        }))
      );
      await get().fetchWorkoutById(workoutId);
    } catch (error) {
      console.error('Error adding workout items:', error);
      throw error;
    }
  },

  createWorkout: async (workout) => {
    try {
      await workoutsService.createWorkout({
        specialist_id: workout.specialist_id,
        training_plan_id: workout.training_plan_id,
        title: workout.title,
        description: workout.description ?? null,
        muscle_group: workout.muscle_group ?? null,
      });
      await get().fetchWorkoutsForPhase(workout.training_plan_id);
    } catch (error) {
      console.error('Error creating workout:', error);
      throw error;
    }
  },

  saveWorkoutSession: async (sessionData) => {
    try {
      if (useAuthStore.getState().isMasquerading) {
        // Sem o objeto: `sessionData.notes` é o texto do aluno sobre a própria
        // saúde, e log de desenvolvimento vaza para onde ninguém controla.
        console.log('🎭 Masquerade Mode: sessão de treino não gravada');
        return `masquerade-session-id-${Date.now()}`;
      }

      const session = await workoutsService.createWorkoutSession({
        workout_id: sessionData.workoutId,
        student_id: sessionData.studentId,
        started_at: sessionData.startedAt,
        completed_at: sessionData.completedAt,
        intensity: sessionData.intensity,
        notes: await notasSeConsentido(sessionData.studentId, sessionData.notes),
        session_type: 'strength',
      });

      if (sessionData.items.length > 0) {
        await workoutsService.saveSessionExercises(
          session.id,
          sessionData.items.map((item) => ({
            workout_exercise_id: item.workoutExerciseId,
            sets: item.sets,
          }))
        );
      }

      return session.id;
    } catch (error) {
      // Sem o objeto de erro: o do PostgREST pode carregar o payload da linha.
      console.error('[workoutStore] falha ao salvar sessão de treino');
      throw error;
    }
  },

  saveCardioSession: async (sessionData) => {
    try {
      if (useAuthStore.getState().isMasquerading) {
        console.log('🎭 Masquerade Mode: sessão de cardio não gravada');
        return;
      }

      // Sem prescrição: cardio livre não vem de treino nenhum. Até a `0035` esta
      // função criava uma linha sintética em `workouts` só para ter um id aqui —
      // com `specialist_id` recebendo o id do **aluno**, o que produzia uma
      // prescrição órfã por aluno e tornava impossível qualquer sessão de cardio
      // aparecer nas telas que filtram por dono do treino.
      await workoutsService.createWorkoutSession({
        workout_id: null,
        student_id: sessionData.studentId,
        started_at: sessionData.startedAt,
        completed_at: sessionData.completedAt,
        intensity: sessionData.intensity,
        // Só o que o aluno digitou. A duração e as calorias moravam aqui dentro,
        // numa string gerada, e sumiam no instante em que ele escrevia qualquer
        // coisa — `notes || <resumo>` significa que os dois nunca coexistiram.
        notes: await notasSeConsentido(sessionData.studentId, sessionData.notes),
        session_type: 'cardio',
        duration_seconds: sessionData.durationSeconds,
        active_calories: Math.round(sessionData.calories),
        activity_name: sessionData.exerciseName,
      });
    } catch (error) {
      // Sem o objeto de erro: o do PostgREST pode carregar o payload da linha,
      // e `notes` é dado sensível de saúde.
      console.error('[workoutStore] falha ao salvar sessão de cardio');
      throw error;
    }
  },

  fetchLastWorkoutSession: async (studentId) => {
    try {
      const { data, error } = await supabase
        .from('workout_sessions')
        .select('workout_id, completed_at')
        .eq('student_id', studentId)
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('Error fetching last workout session:', error);
      return null;
    }
  },

  fetchWorkoutSessionDetails: async (workoutId, studentId) => {
    try {
      const { data, error } = await supabase
        .from('workout_sessions')
        // Série a série, com carga e repetição executadas — o que a análise de
        // progressão precisa e o antigo `sets_data` não entregava em formato
        // consultável.
        .select(`
          id, workout_id, student_id, started_at, completed_at, intensity, notes,
          exercises:workout_session_exercises(
            workout_exercise_id,
            sets:workout_session_sets(set_index, reps_actual, weight_actual, completed)
          )
        `)
        .eq('workout_id', workoutId)
        .eq('student_id', studentId)
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as WorkoutSession | null;
    } catch (error) {
      console.error('Error fetching workout session details:', error);
      return null;
    }
  },

  setSelectedExercises: (exercises) => set({ selectedExercises: exercises }),
  clearSelectedExercises: () => set({ selectedExercises: [] }),

  duplicateWorkout: async (workoutId, targetPlanId) => {
    set({ isLoading: true });
    try {
      const sourceWorkout = await get().fetchWorkoutById(workoutId);
      if (!sourceWorkout) throw new Error('Source workout not found');

      const newWorkout = await workoutsService.createWorkout({
        training_plan_id: targetPlanId,
        specialist_id: sourceWorkout.specialist_id,
        title: sourceWorkout.title,
        description: sourceWorkout.description,
        muscle_group: sourceWorkout.muscle_group,
        difficulty: sourceWorkout.difficulty,
        day_of_week: sourceWorkout.day_of_week,
      });

      if (sourceWorkout.exercises && sourceWorkout.exercises.length > 0) {
        await workoutsService.addExercisesToWorkout(
          newWorkout.id,
          sourceWorkout.exercises.map((item) => ({
            exercise_id: item.exercise_id,
            sets: item.sets ?? undefined,
            reps: item.reps ?? undefined,
            weight: item.weight ?? undefined,
            rest_seconds: item.rest_seconds ?? undefined,
            order_index: item.order_index,
            notes: item.notes ?? undefined,
          }))
        );
      }

      await get().fetchWorkoutsForPhase(targetPlanId);
    } catch (error) {
      console.error('Error duplicating workout:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  reset: () => {
    set({
      workouts: [],
      libraryWorkouts: [],
      periodizations: [],
      exercises: [],
      selectedExercises: [],
      currentPeriodizationPhases: [],
      isLoading: false,
    });
  },
}));
