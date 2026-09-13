import type {
  Exercise,
  Periodization,
  TrainingPlan,
  UpdatePeriodizationInput,
  UpdateTrainingPlanInput,
  Workout,
  WorkoutExercise,
  WorkoutSession,
} from '@elevapro/shared';
import { createWorkoutsService } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { create } from 'zustand';
import { useAuthStore } from '@/modules/auth/store/authStore';

export type {
  Exercise,
  Periodization,
  TrainingPlan,
  Workout,
  WorkoutExercise as WorkoutItem,
  WorkoutSession,
};

const workoutsService = createWorkoutsService(supabase);

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
  fetchLastWorkoutSession: (
    studentId: string
  ) => Promise<{ workout_id: string | null; completed_at: string | null } | null>;
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
