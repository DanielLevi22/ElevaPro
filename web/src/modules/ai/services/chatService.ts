import type { Json } from "@/lib/database.types";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { AiSessionState, ChatMessage, ChatSession, ChatSessionSummary } from "../types";

/**
 * Confirma que a conversa é deste aluno com este especialista.
 *
 * O `sessionId` vem do cliente, e esta rota usa `service_role` — que não
 * consulta RLS. Sem esta checagem, trocar o id na requisição lê a conversa de
 * outro especialista sobre qualquer aluno: é a mesma classe do IDOR corrigido
 * na dívida 27, reintroduzida por uma feature nova.
 *
 * Devolve `null` quando não pertence, e o chamador trata como conversa
 * inexistente — não confirma nem desmente que o id existe.
 *
 * @example
 * const sessionId = body.sessionId
 *   ? await sessionOwnedBy(body.sessionId, studentId, specialistId)
 *   : await getOrCreateSession(studentId, specialistId, "workout");
 */
export async function sessionOwnedBy(
  sessionId: string,
  studentId: string,
  specialistId: string,
): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("ai_chat_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("student_id", studentId)
    .eq("specialist_id", specialistId)
    .maybeSingle();

  // Erro não é "não é dono": engolir aqui transformaria falha de consulta em
  // negativa de acesso, e o chamador criaria uma conversa nova sem motivo.
  if (error) throw error;
  return data?.id ?? null;
}

/**
 * Abre uma conversa nova, mesmo havendo outras.
 *
 * Diferente de `getOrCreateSession`, que reaproveita a mais recente e por isso
 * fazia toda conversa continuar a anterior.
 *
 * O que recomeça é o diálogo: mensagens e `state`. O que o coach sabe sobre o
 * aluno — anamnese, avaliação, periodizações — é lido do banco a cada turno e
 * **não** vive aqui, então conversa nova não significa coach sem contexto.
 */
export async function createSession(
  studentId: string,
  specialistId: string,
  module: "workout" | "nutrition" | "general" = "workout",
): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("ai_chat_sessions")
    .insert({ student_id: studentId, specialist_id: specialistId, module })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

/** Conversas não arquivadas, da mais recente para a mais antiga. */
export async function listSessions(
  studentId: string,
  specialistId: string,
  module: "workout" | "nutrition" | "general" = "workout",
): Promise<ChatSessionSummary[]> {
  const { data, error } = await supabaseAdmin
    .from("ai_chat_sessions")
    .select("id, title, created_at, updated_at")
    .eq("student_id", studentId)
    .eq("specialist_id", specialistId)
    .eq("module", module)
    .is("archived_at", null)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ChatSessionSummary[];
}

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

const DIA_MS = 86_400_000;

/** `AAAA-MM-DD` somado em semanas, sem passar por fuso. */
function somaSemanas(isoDate: string, weeks: number): string {
  const base = new Date(`${isoDate}T00:00:00Z`).getTime();
  return new Date(base + weeks * 7 * DIA_MS).toISOString().slice(0, 10);
}

export async function savePeriodization(
  studentId: string,
  specialistId: string,
  data: {
    name: string;
    goal: string;
    durationWeeks: number;
    startDate: string;
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
      // Sem data, a periodização não entra no calendário e a tela mostra um
      // traço. A `0024` passou a recusar nulo aqui.
      start_date: data.startDate,
      end_date: somaSemanas(data.startDate, data.durationWeeks),
      level: data.level,
      status: "active",
    })
    .select("id")
    .single();

  if (periodError || !period)
    throw new Error(`Failed to save periodization: ${periodError?.message}`);

  // As fases se encaixam em sequência: cada uma começa onde a anterior terminou.
  // Antes nenhuma recebia data, e a tela de detalhe mostrava traço em todas.
  let inicioDaFase = data.startDate;
  const phaseRows = data.phases.map((ph, index) => {
    const start = inicioDaFase;
    const end = somaSemanas(start, ph.weeks);
    inicioDaFase = end;
    return {
      periodization_id: period.id,
      name: ph.name,
      duration_weeks: ph.weeks,
      focus: ph.focus,
      start_date: start,
      end_date: end,
      order_index: index,
    };
  });

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

  // Espalha o que está guardado e só garante o padrão de `savedWorkouts`.
  // A versão anterior montava o objeto campo a campo, e isso **descartava em
  // silêncio** qualquer chave nova: as propostas de dieta eram gravadas e
  // sumiam na leitura seguinte, com a aprovação respondendo "nenhuma proposta
  // pendente". Lista branca em getter é armadilha — cresce sem avisar.
  const state = (data?.state ?? {}) as Partial<AiSessionState>;
  return { ...state, savedWorkouts: state.savedWorkouts ?? [] };
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
