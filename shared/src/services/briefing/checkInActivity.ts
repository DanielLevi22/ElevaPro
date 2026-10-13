import type { SupabaseClient } from "@supabase/supabase-js";
import type { CheckInLogging } from "../../utils/weeklyRecalibration";

/** Um check-in da semana de um aluno, resumido ao que o especialista lê. */
export interface CheckInActivity {
  id: string;
  studentId: string;
  at: string;
  /** "registrou tudo", "seguiu sem registrar". */
  loggingLabel: string;
}

/** A resposta do aluno em minúsculas, para entrar no meio da frase do briefing. */
export const CHECK_IN_LOGGING_LABEL: Record<CheckInLogging, string> = {
  all: "registrou tudo",
  partial: "registrou parte",
  followed_unlogged: "seguiu sem registrar",
  not_followed: "não seguiu o plano",
};

/**
 * Os check-ins dos alunos, mais recentes primeiro, para o "Aconteceu" do
 * especialista (#376). Só a resposta do registro: o peso do Aluno nem existe
 * (ADR-0030), e o do Praticante não tem especialista para ler.
 *
 * Roda sob a sessão do especialista: a RLS da 0088 fecha a leitura quando o
 * aluno revoga o consentimento. Não entra na linha do tempo por aluno do web,
 * que lê pela rota com `service_role` e ignora a revogação (#344).
 *
 * @example const checkIns = await fetchCheckInActivity(supabase, [alunoId], 10);
 */
export async function fetchCheckInActivity(
  supabase: SupabaseClient,
  studentIds: readonly string[],
  limit: number,
): Promise<CheckInActivity[]> {
  const { data, error } = await supabase
    .from("weekly_check_ins")
    .select("id, student_id, created_at, logging")
    .in("student_id", [...studentIds])
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (
    (data ?? []) as {
      id: string;
      student_id: string;
      created_at: string;
      logging: CheckInLogging;
    }[]
  ).map((row) => ({
    id: row.id,
    studentId: row.student_id,
    at: row.created_at,
    loggingLabel: CHECK_IN_LOGGING_LABEL[row.logging],
  }));
}
