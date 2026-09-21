import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CreatePeriodizationInput,
  CreateTrainingPlanInput,
  Periodization,
  TrainingPlan,
  UpdatePeriodizationInput,
  UpdateTrainingPlanInput,
} from "../../types/workouts.types";

/**
 * As colunas que o tipo declara, e não `*`.
 *
 * O aluno lê o próprio ciclo e as fases por estas consultas. Com `*`, qualquer
 * coluna que a tabela ganhe depois chegaria ao aparelho sem ninguém decidir —
 * a minimização da LGPD (Art. 6°, III) é pedir o que a tela usa. `level`,
 * `focus` e `duration_weeks` existem na tabela e nenhuma tela as lê.
 */
const COLUNAS_DO_CICLO =
  "id, specialist_id, student_id, name, objective, status, start_date, end_date, created_at, updated_at";
const COLUNAS_DA_FASE =
  "id, periodization_id, name, status, start_date, end_date, order_index, created_at";

/**
 * Periodizações e as fases delas (`training_plans`).
 *
 * Parte do `createWorkoutsService`, que compõe este arquivo com o de sessões e
 * o núcleo de exercícios e treinos. O corte é por assunto, e a interface
 * pública não mudou: quem chama continua chamando `createWorkoutsService`.
 */
export const criarServicoDePeriodizacoes = (supabase: SupabaseClient) => ({
  // ── Periodizations ─────────────────────────────────────────────────────────

  fetchPeriodizations: async (specialistId: string): Promise<Periodization[]> => {
    const { data: periodizations, error } = await supabase
      .from("training_periodizations")
      .select("*")
      .eq("specialist_id", specialistId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    if (!periodizations || periodizations.length === 0) return [];

    const studentIds = [...new Set(periodizations.map((p) => p.student_id))];
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", studentIds);
    if (profilesError) throw profilesError;
    const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);

    const periodizationIds = periodizations.map((p) => p.id);
    const { data: plans, error: plansError } = await supabase
      .from("training_plans")
      .select("periodization_id")
      .in("periodization_id", periodizationIds);
    if (plansError) throw plansError;
    const countsMap = new Map<string, number>();
    plans?.forEach((plan) => {
      countsMap.set(plan.periodization_id, (countsMap.get(plan.periodization_id) ?? 0) + 1);
    });

    return periodizations.map((p) => ({
      ...p,
      student: profileMap.get(p.student_id),
      training_plans_count: countsMap.get(p.id) ?? 0,
    })) as Periodization[];
  },

  fetchStudentPeriodizations: async (studentId: string): Promise<Periodization[]> => {
    const { data, error } = await supabase
      .from("training_periodizations")
      .select(COLUNAS_DO_CICLO)
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []) as Periodization[];
  },

  fetchPeriodizationById: async (id: string): Promise<Periodization | null> => {
    const { data, error } = await supabase
      .from("training_periodizations")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;

    const [studentResult, planCountResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("id", data.student_id)
        .maybeSingle(),
      supabase
        .from("training_plans")
        .select("*", { count: "exact", head: true })
        .eq("periodization_id", id),
    ]);
    if (studentResult.error) throw studentResult.error;
    if (planCountResult.error) throw planCountResult.error;

    return {
      ...data,
      student: studentResult.data ?? undefined,
      training_plans_count: planCountResult.count ?? 0,
    } as Periodization;
  },

  createPeriodization: async (input: CreatePeriodizationInput): Promise<Periodization> => {
    const { data, error } = await supabase
      .from("training_periodizations")
      .insert({
        specialist_id: input.specialist_id,
        student_id: input.student_id,
        name: input.name,
        objective: input.objective ?? null,
        start_date: input.start_date,
        end_date: input.end_date,
        status: "planned",
      })
      .select()
      .single();
    if (error) throw error;
    return data as Periodization;
  },

  updatePeriodization: async (
    id: string,
    input: UpdatePeriodizationInput,
  ): Promise<Periodization> => {
    const { data, error } = await supabase
      .from("training_periodizations")
      .update(input)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as Periodization;
  },

  deletePeriodization: async (id: string): Promise<void> => {
    const { error } = await supabase.from("training_periodizations").delete().eq("id", id);
    if (error) throw error;
  },

  activatePeriodization: async (id: string): Promise<Periodization> => {
    const { data: periodization, error: fetchError } = await supabase
      .from("training_periodizations")
      .select("student_id")
      .eq("id", id)
      .single();
    if (fetchError) throw fetchError;

    const { error: completeError } = await supabase
      .from("training_periodizations")
      .update({ status: "completed" })
      .eq("student_id", periodization.student_id)
      .eq("status", "active");
    if (completeError) throw completeError;

    const { data, error } = await supabase
      .from("training_periodizations")
      .update({ status: "active" })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as Periodization;
  },

  // ── Training Plans ─────────────────────────────────────────────────────────

  fetchTrainingPlans: async (periodizationId: string): Promise<TrainingPlan[]> => {
    const { data, error } = await supabase
      .from("training_plans")
      .select(COLUNAS_DA_FASE)
      .eq("periodization_id", periodizationId)
      .order("order_index", { ascending: true });
    if (error) throw error;
    if (!data || data.length === 0) return [];

    const planIds = data.map((p) => p.id);
    const { data: workouts, error: workoutsError } = await supabase
      .from("workouts")
      .select("training_plan_id")
      .in("training_plan_id", planIds);
    if (workoutsError) throw workoutsError;
    const countsMap = new Map<string, number>();
    workouts?.forEach((w) => {
      if (w.training_plan_id) {
        countsMap.set(w.training_plan_id, (countsMap.get(w.training_plan_id) ?? 0) + 1);
      }
    });

    return data.map((p) => ({ ...p, workouts_count: countsMap.get(p.id) ?? 0 })) as TrainingPlan[];
  },

  fetchTrainingPlanById: async (id: string): Promise<TrainingPlan | null> => {
    // `maybeSingle`, não `single`: com `single` a fase inexistente vira erro
    // PGRST116 e a função lança, então o `if (!plan) notFound()` de quem chama
    // era código morto — a resposta nunca chegava a ser `null`. Fase que não
    // existe é 404; consulta que falhou é erro. São coisas diferentes.
    const { data, error } = await supabase
      .from("training_plans")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const { count, error: countError } = await supabase
      .from("workouts")
      .select("*", { count: "exact", head: true })
      .eq("training_plan_id", id);
    if (countError) throw countError;

    return { ...data, workouts_count: count ?? 0 } as TrainingPlan;
  },

  createTrainingPlan: async (input: CreateTrainingPlanInput): Promise<TrainingPlan> => {
    const { data, error } = await supabase
      .from("training_plans")
      .insert({
        periodization_id: input.periodization_id,
        name: input.name,
        start_date: input.start_date,
        end_date: input.end_date,
        order_index: input.order_index ?? 0,
        status: "planned",
      })
      .select()
      .single();
    if (error) throw error;
    return data as TrainingPlan;
  },

  updateTrainingPlan: async (id: string, input: UpdateTrainingPlanInput): Promise<TrainingPlan> => {
    const { data, error } = await supabase
      .from("training_plans")
      .update(input)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as TrainingPlan;
  },

  deleteTrainingPlan: async (id: string): Promise<{ periodization_id: string | undefined }> => {
    const { data: plan, error: planError } = await supabase
      .from("training_plans")
      .select("periodization_id")
      .eq("id", id)
      .single();
    if (planError) throw planError;

    const { error } = await supabase.from("training_plans").delete().eq("id", id);
    if (error) throw error;
    return { periodization_id: plan?.periodization_id };
  },

  cloneTrainingPlan: async (id: string): Promise<TrainingPlan> => {
    const { data: original, error: fetchError } = await supabase
      .from("training_plans")
      .select("*")
      .eq("id", id)
      .single();
    if (fetchError) throw fetchError;

    const { data: clone, error: cloneError } = await supabase
      .from("training_plans")
      .insert({
        periodization_id: original.periodization_id,
        name: `${original.name} (Cópia)`,
        status: "planned",
        start_date: original.start_date,
        end_date: original.end_date,
        order_index: original.order_index,
      })
      .select()
      .single();
    if (cloneError) throw cloneError;

    const { data: workouts, error: workoutsError } = await supabase
      .from("workouts")
      .select("*")
      .eq("training_plan_id", id);
    if (workoutsError) throw workoutsError;

    if (workouts && workouts.length > 0) {
      const clonedWorkouts = workouts.map((w) => ({
        specialist_id: w.specialist_id,
        training_plan_id: clone.id,
        title: w.title,
        description: w.description,
        muscle_group: w.muscle_group,
        difficulty: w.difficulty,
        day_of_week: w.day_of_week,
      }));
      const { error: insertError } = await supabase.from("workouts").insert(clonedWorkouts);
      if (insertError) throw insertError;
    }

    return clone as TrainingPlan;
  },
});
