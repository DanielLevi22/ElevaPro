import type { Json } from "@elevapro/shared";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { NutritionProposal, WorkoutProposal } from "../tools/studentCoachTools";
import { updateSessionState } from "./chatService";

export async function getOrCreateStudentCoachSession(studentId: string): Promise<string> {
  const module = "student_coach";
  const { data: existing } = await supabaseAdmin
    .from("ai_chat_sessions")
    .select("id")
    .eq("student_id", studentId)
    .is("specialist_id", null)
    .eq("module", module)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created, error } = await supabaseAdmin
    .from("ai_chat_sessions")
    .insert({ student_id: studentId, specialist_id: null, module })
    .select("id")
    .single();

  if (error || !created) {
    throw new Error(
      `Failed to create student coach session for student ${studentId}: ${error?.message}`,
    );
  }
  return created.id;
}

export async function getStudentSessionMessages(
  sessionId: string,
): Promise<Array<{ id: string; role: "user" | "assistant"; content: string; createdAt: string }>> {
  const { data } = await supabaseAdmin
    .from("ai_chat_messages")
    .select("id, role, content, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  return (data ?? []).map((row) => ({
    id: row.id,
    role: row.role as "user" | "assistant",
    content: row.content,
    createdAt: row.created_at ?? new Date().toISOString(),
  }));
}

/**
 * Grava a mensagem e devolve o id.
 *
 * O id existe para quem precisa voltar na linha depois: a resposta do coach
 * nasce na primeira palavra e cresce durante o turno, porque um corte aos 60s
 * da Vercel encerra o processo sem passar por `catch` nenhum.
 */
export async function saveStudentMessage(
  sessionId: string,
  role: "user" | "assistant",
  content: string,
  metadata?: Record<string, unknown>,
): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("ai_chat_messages")
    .insert({ session_id: sessionId, role, content, metadata: (metadata ?? {}) as Json })
    .select("id")
    .single();

  if (error) {
    // Mesmo motivo do `saveMessage`: `null` quer dizer "não gravou, tenta de
    // novo", e sem o log a resposta do coach sumiria sem uma linha explicando.
    // Sessão sim, conteúdo não (LGPD_COMPLIANCE, seção 4).
    console.error("[saveStudentMessage] não gravou", { sessionId, role, erro: error.message });
    return null;
  }

  return data?.id ?? null;
}

export async function saveCoachMode(
  studentId: string,
  mode: "express" | "analytical",
): Promise<void> {
  await supabaseAdmin.from("profiles").update({ coach_mode: mode }).eq("id", studentId);
}

/**
 * Data ISO (só o dia) somando semanas a partir de hoje.
 *
 * `training_periodizations` e `training_plans` têm `start_date` e `end_date`
 * NOT NULL desde a migration `0024`. Este serviço não mandava nenhuma das duas:
 * o INSERT era recusado pelo banco e salvar o plano do coach nunca funcionou.
 */
function isoDatePlusWeeks(weeks: number): string {
  const date = new Date();
  date.setDate(date.getDate() + weeks * 7);
  return date.toISOString().split("T")[0];
}

export async function saveStudentCoachPlan(
  studentId: string,
  sessionId: string,
  workout: WorkoutProposal,
  nutrition: NutritionProposal,
): Promise<string> {
  const startDate = isoDatePlusWeeks(0);
  const endDate = isoDatePlusWeeks(workout.duration_weeks);

  const { data: period, error: periodError } = await supabaseAdmin
    .from("training_periodizations")
    .insert({
      student_id: studentId,
      specialist_id: null,
      name: workout.split_name,
      objective: workout.goal,
      duration_weeks: workout.duration_weeks,
      level: workout.level,
      status: "active",
      start_date: startDate,
      end_date: endDate,
    })
    .select("id")
    .single();

  if (periodError || !period) {
    throw new Error(
      `Failed to save student plan for student ${studentId}: ${periodError?.message}`,
    );
  }

  // Os "dias" do split rodam ao longo de toda a periodização, não em sequência
  // — por isso todos compartilham o intervalo dela.
  const phaseRows = workout.days.map((day, index) => ({
    periodization_id: period.id,
    name: day.day_label,
    duration_weeks: workout.duration_weeks,
    focus: day.muscle_groups.join(", "),
    order_index: index,
    start_date: startDate,
    end_date: endDate,
  }));

  const { error: phaseError } = await supabaseAdmin.from("training_plans").insert(phaseRows);

  if (phaseError) {
    throw new Error(`Failed to save plan days for student ${studentId}: ${phaseError.message}`);
  }

  // A nutrição não tem tabela própria na Fase 1 e fica no estado da sessão.
  //
  // Mesclando, nunca substituindo: um `update` de `state` troca o objeto
  // inteiro, e aqui já convivem a proposta pendente e a resolvida. Enquanto não
  // havia mais nada guardado, substituir não doía — passou a doer no instante
  // em que a proposta passou a morar ali.
  await updateSessionState(sessionId, {
    nutritionPlan: nutrition,
    savedPeriodizationId: period.id,
  } as Record<string, unknown>);

  return period.id;
}
