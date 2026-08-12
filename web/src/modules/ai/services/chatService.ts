import type { Json } from "@/lib/database.types";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { AiSessionState, ChatMessage, ChatSession } from "../types";

export async function getOrCreateSession(
  studentId: string,
  specialistId: string,
  module: "workout" | "nutrition" | "general" = "workout",
): Promise<string> {
  const { data: existing } = await supabaseAdmin
    .from("ai_chat_sessions")
    .select("id")
    .eq("student_id", studentId)
    .eq("specialist_id", specialistId)
    .eq("module", module)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created, error } = await supabaseAdmin
    .from("ai_chat_sessions")
    .insert({ student_id: studentId, specialist_id: specialistId, module })
    .select("id")
    .single();

  if (error || !created) throw new Error("Failed to create chat session");
  return created.id;
}

export async function getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
  const { data } = await supabaseAdmin
    .from("ai_chat_messages")
    .select("id, role, content, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  return (data ?? []).map((row) => ({
    id: row.id,
    role: row.role as "user" | "assistant",
    content: row.content,
    createdAt: row.created_at ?? "",
  }));
}

export async function saveMessage(
  sessionId: string,
  role: "user" | "assistant",
  content: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await supabaseAdmin
    .from("ai_chat_messages")
    .insert({ session_id: sessionId, role, content, metadata: (metadata ?? {}) as Json });
}

export async function savePeriodization(
  studentId: string,
  specialistId: string,
  data: {
    name: string;
    goal: string;
    durationWeeks: number;
    level: string;
    phases: { name: string; weeks: number; focus: string }[];
  },
): Promise<string> {
  const { data: period, error: periodError } = await supabaseAdmin
    .from("training_periodizations")
    .insert({
      student_id: studentId,
      specialist_id: specialistId,
      name: data.name,
      objective: data.goal,
      duration_weeks: data.durationWeeks,
      level: data.level,
      status: "active",
    })
    .select("id")
    .single();

  if (periodError || !period)
    throw new Error(`Failed to save periodization: ${periodError?.message}`);

  const phaseRows = data.phases.map((ph) => ({
    periodization_id: period.id,
    name: ph.name,
    duration_weeks: ph.weeks,
    focus: ph.focus,
  }));

  const { error: phaseError } = await supabaseAdmin.from("training_plans").insert(phaseRows);

  if (phaseError) throw new Error(`Failed to save phases: ${phaseError.message}`);

  return period.id;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A fase existe e pertence a este aluno com este especialista?
 *
 * O `phase_id` chega do modelo, que já inventou `"fase-1-adaptacao"` em vez do
 * uuid. Além de quebrar a gravação, um id válido de outra pessoa gravaria
 * treino na fase dela: a rota de salvar usa `service_role` e não passa pela RLS.
 */
export async function phaseOwnedBy(
  phaseId: string,
  studentId: string,
  specialistId: string,
): Promise<boolean> {
  if (!UUID.test(phaseId ?? "")) return false;

  const { data, error } = await supabaseAdmin
    .from("training_plans")
    .select("id, training_periodizations!inner(student_id, specialist_id)")
    .eq("id", phaseId)
    .eq("training_periodizations.student_id", studentId)
    .eq("training_periodizations.specialist_id", specialistId)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

/**
 * Estado da sessão, sempre com a forma completa.
 *
 * `ai_chat_sessions.state` nasce como `{}` — um valor, não ausência —, então o
 * `?? { savedWorkouts: [] }` anterior nunca disparava e `savedWorkouts` chegava
 * indefinido. O `...sessionState.savedWorkouts` na rota de salvar estourava
 * depois de os treinos já terem sido gravados: 500 de corpo vazio, com o dado
 * no banco e o especialista sem saber.
 */
export async function getSessionState(sessionId: string): Promise<AiSessionState> {
  const { data, error } = await supabaseAdmin
    .from("ai_chat_sessions")
    .select("state")
    .eq("id", sessionId)
    .single();

  if (error) throw error;

  const state = (data?.state ?? {}) as Partial<AiSessionState>;
  return {
    savedWorkouts: state.savedWorkouts ?? [],
    pendingWorkoutProposal: state.pendingWorkoutProposal,
  };
}

export async function updateSessionState(
  sessionId: string,
  patch: Partial<AiSessionState>,
): Promise<void> {
  const current = await getSessionState(sessionId);
  const next = { ...current, ...patch };
  await supabaseAdmin
    .from("ai_chat_sessions")
    .update({ state: next as unknown as Json })
    .eq("id", sessionId);
}

export type { ChatMessage, ChatSession };
