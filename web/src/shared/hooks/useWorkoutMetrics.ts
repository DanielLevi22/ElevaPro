"use client";

import { supabase } from "@elevapro/supabase";
import { useQuery } from "@tanstack/react-query";

// ── Internal row types ──────────────────────────────────────────────────────

interface SessionRow {
  id: string;
  completed_at: string;
}

interface SessionExerciseRow {
  id: string;
  session_id: string;
  exercise_id: string | null;
}

interface ExerciseRow {
  id: string;
  name: string;
  muscle_group: string | null;
}

interface SetRow {
  session_exercise_id: string;
  reps_actual: number | null;
  weight_actual: number | null;
  completed: boolean;
}

// ── Public types ────────────────────────────────────────────────────────────

export interface WeeklyFrequency {
  week: string;
  sessions: number;
}

export interface MuscleVolume {
  muscle: string;
  volume: number;
}

export interface StimulusItem {
  name: string;
  value: number;
  color: string;
}

export interface DailyCount {
  date: string;
  count: number;
}

export interface WorkoutMetrics {
  totalSessions: number;
  totalVolume: number;
  topMuscle: string | null;
  weeklyFrequency: WeeklyFrequency[];
  volumeByMuscle: MuscleVolume[];
  stimulus: StimulusItem[];
  dailyFrequency: DailyCount[];
}

export interface ExerciseOption {
  id: string;
  name: string;
}

export interface LoadPoint {
  date: string;
  weight: number;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function weekLabel(iso: string): string {
  const d = new Date(iso);
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay());
  return `${String(start.getDate()).padStart(2, "0")}/${String(start.getMonth() + 1).padStart(2, "0")}`;
}

const EMPTY: WorkoutMetrics = {
  totalSessions: 0,
  totalVolume: 0,
  topMuscle: null,
  weeklyFrequency: [],
  volumeByMuscle: [],
  stimulus: [],
  dailyFrequency: [],
};

// ── Core fetch ───────────────────────────────────────────────────────────────

async function fetchWorkoutMetrics(studentId: string, since: Date): Promise<WorkoutMetrics> {
  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select("id, completed_at")
    .eq("student_id", studentId)
    .not("completed_at", "is", null)
    .gte("completed_at", since.toISOString())
    .order("completed_at", { ascending: true });

  if (!sessions?.length) return { ...EMPTY };

  const sessionIds = (sessions as SessionRow[]).map((s) => s.id);

  const { data: sessionExercises } = await supabase
    .from("workout_session_exercises")
    .select("id, session_id, exercise_id")
    .in("session_id", sessionIds);

  const exerciseIds = new Set(
    ((sessionExercises ?? []) as SessionExerciseRow[])
      .map((e) => e.exercise_id)
      .filter(Boolean) as string[],
  );

  const [{ data: exercises }, sessionExerciseData] = await Promise.all([
    exerciseIds.size > 0
      ? supabase
          .from("exercises")
          .select("id, name, muscle_group")
          .in("id", [...exerciseIds])
      : Promise.resolve({ data: [] as ExerciseRow[] }),
    Promise.resolve((sessionExercises ?? []) as SessionExerciseRow[]),
  ]);

  const sessionExerciseIds = sessionExerciseData.map((e) => e.id);

  const { data: sets } = sessionExerciseIds.length
    ? await supabase
        .from("workout_session_sets")
        .select("session_exercise_id, reps_actual, weight_actual, completed")
        .in("session_exercise_id", sessionExerciseIds)
    : { data: [] as SetRow[] };

  // Build lookups
  const exerciseMap = new Map(((exercises ?? []) as ExerciseRow[]).map((e) => [e.id, e]));

  const setsByExercise = new Map<string, SetRow[]>();
  for (const s of (sets ?? []) as SetRow[]) {
    if (!setsByExercise.has(s.session_exercise_id)) setsByExercise.set(s.session_exercise_id, []);
    setsByExercise.get(s.session_exercise_id)?.push(s);
  }

  const exercisesBySession = new Map<string, SessionExerciseRow[]>();
  for (const e of sessionExerciseData) {
    if (!exercisesBySession.has(e.session_id)) exercisesBySession.set(e.session_id, []);
    exercisesBySession.get(e.session_id)?.push(e);
  }

  // Aggregate
  const weekFreqMap = new Map<string, number>();
  const dayFreqMap = new Map<string, number>();
  const muscleVolumeMap: Record<string, number> = {};
  let totalVolume = 0;
  let strength = 0;
  let hypertrophy = 0;
  let endurance = 0;
  let totalSets = 0;

  for (const session of sessions as SessionRow[]) {
    const week = weekLabel(session.completed_at);
    weekFreqMap.set(week, (weekFreqMap.get(week) ?? 0) + 1);

    const day = session.completed_at.slice(0, 10);
    dayFreqMap.set(day, (dayFreqMap.get(day) ?? 0) + 1);

    for (const ex of exercisesBySession.get(session.id) ?? []) {
      if (!ex.exercise_id) continue;
      const muscle = exerciseMap.get(ex.exercise_id)?.muscle_group ?? "Outros";

      for (const s of setsByExercise.get(ex.id) ?? []) {
        if (!s.completed) continue;
        const reps = s.reps_actual ?? 0;
        const weight = s.weight_actual ?? 0;
        const vol = reps * weight;

        totalVolume += vol;
        muscleVolumeMap[muscle] = (muscleVolumeMap[muscle] ?? 0) + vol;
        totalSets++;
        if (reps <= 6) strength++;
        else if (reps <= 12) hypertrophy++;
        else endurance++;
      }
    }
  }

  const weeklyFrequency = [...weekFreqMap.entries()].map(([week, s]) => ({ week, sessions: s }));

  // Sem corte: o `.slice(0, 7)` que existia aqui era do tempo em que isto
  // alimentava só um gráfico de barras. O mapa muscular pinta o corpo inteiro,
  // e cortar em sete deixava quatro grupos cinzas para sempre — indistinguíveis
  // de quem não treinou.
  const volumeByMuscle = Object.entries(muscleVolumeMap)
    .map(([muscle, volume]) => ({ muscle, volume: Math.round(volume) }))
    .sort((a, b) => b.volume - a.volume);

  const stimulus: StimulusItem[] = [
    {
      name: "Força",
      value: totalSets ? Math.round((strength / totalSets) * 100) : 0,
      color: "#FACC15",
    },
    {
      name: "Hipertrofia",
      value: totalSets ? Math.round((hypertrophy / totalSets) * 100) : 0,
      color: "#60A5FA",
    },
    {
      name: "Resistência",
      value: totalSets ? Math.round((endurance / totalSets) * 100) : 0,
      color: "#34D399",
    },
  ].filter((s) => s.value > 0);

  const dailyFrequency = [...dayFreqMap.entries()].map(([date, count]) => ({ date, count }));

  return {
    totalSessions: sessions.length,
    totalVolume: Math.round(totalVolume),
    topMuscle: volumeByMuscle[0]?.muscle ?? null,
    weeklyFrequency,
    volumeByMuscle,
    stimulus,
    dailyFrequency,
  };
}

// ── Hooks ────────────────────────────────────────────────────────────────────

export function useWorkoutMetrics(studentId: string, days = 90) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  return useQuery({
    queryKey: ["workout-metrics", studentId, days],
    queryFn: () => fetchWorkoutMetrics(studentId, since),
    enabled: Boolean(studentId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useExercisesWithHistory(studentId: string) {
  return useQuery({
    queryKey: ["exercises-with-history", studentId],
    enabled: Boolean(studentId),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<ExerciseOption[]> => {
      const { data: sessions } = await supabase
        .from("workout_sessions")
        .select("id")
        .eq("student_id", studentId)
        .not("completed_at", "is", null)
        .limit(50);

      if (!sessions?.length) return [];

      const { data: sessionExercises } = await supabase
        .from("workout_session_exercises")
        .select("exercise_id")
        .in(
          "session_id",
          sessions.map((s) => s.id),
        )
        .not("exercise_id", "is", null);

      const exerciseIds = new Set((sessionExercises ?? []).map((e) => e.exercise_id as string));
      if (!exerciseIds.size) return [];

      const { data: exercises } = await supabase
        .from("exercises")
        .select("id, name")
        .in("id", [...exerciseIds]);

      return ((exercises ?? []) as ExerciseOption[]).sort((a, b) => a.name.localeCompare(b.name));
    },
  });
}

export function useExerciseLoadHistory(studentId: string, exerciseId: string | null) {
  return useQuery({
    queryKey: ["exercise-load-history", studentId, exerciseId],
    enabled: Boolean(studentId && exerciseId),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<LoadPoint[]> => {
      if (!exerciseId) return [];

      const { data: sessionExercises } = await supabase
        .from("workout_session_exercises")
        .select("id, workout_sessions!inner(completed_at, student_id)")
        .eq("exercise_id", exerciseId)
        .eq("workout_sessions.student_id", studentId);

      if (!sessionExercises?.length) return [];

      const { data: sets } = await supabase
        .from("workout_session_sets")
        .select("session_exercise_id, weight_actual")
        .in(
          "session_exercise_id",
          sessionExercises.map((e) => e.id),
        )
        .eq("completed", true);

      const maxByExercise = new Map<string, number>();
      for (const s of (sets ?? []) as {
        session_exercise_id: string;
        weight_actual: number | null;
      }[]) {
        const cur = maxByExercise.get(s.session_exercise_id) ?? 0;
        maxByExercise.set(s.session_exercise_id, Math.max(cur, s.weight_actual ?? 0));
      }

      return sessionExercises
        .map((ex) => {
          const session = Array.isArray(ex.workout_sessions)
            ? ex.workout_sessions[0]
            : ex.workout_sessions;
          const weight = maxByExercise.get(ex.id) ?? 0;
          if (!weight) return null;
          return {
            date: new Date((session as { completed_at: string }).completed_at).toLocaleDateString(
              "pt-BR",
              { day: "2-digit", month: "2-digit" },
            ),
            weight,
          };
        })
        .filter((h): h is LoadPoint => h !== null);
    },
  });
}
