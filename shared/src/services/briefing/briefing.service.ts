import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Briefing,
  BriefingSignal,
  BriefingSignalKind,
  BriefingStats,
} from "../../types/briefing.types";
import { currentWeekStart } from "../nutrition/weeklyCheckIn.service";
import { CHECK_IN_LOGGING_LABEL } from "./checkInActivity";

/**
 * Dias sem sessão concluída que caracterizam risco de abandono.
 *
 * Sete, não um número redondo qualquer: a prescrição é semanal — `workouts` tem
 * `day_of_week` — então quem treina em qualquer frequência deveria ter ao menos
 * uma sessão em sete dias. Com quatro ou cinco, o alerta dispararia para quem
 * treina 3x por semana e descansou o fim de semana.
 */
const INACTIVITY_DAYS = 7;

/** Dias de convite não aceito antes de virar sinal. */
const PENDING_INVITE_DAYS = 3;

/**
 * Janela de busca de sessões. Sem teto, a consulta cresce com o histórico de
 * cada aluno; com ele, quem não treina há mais tempo aparece como "mais de 60
 * dias" em vez de um número exato que ninguém usa.
 */
const SESSION_LOOKBACK_DAYS = 60;

/** Menor é mais urgente — define a ordem dos cartões na tela. */
const URGENCY: Record<BriefingSignalKind, number> = {
  inactive: 0,
  pending_invite: 1,
  anamnesis_ready: 2,
  exercise_swap: 3,
  weekly_check_in: 4,
};

/** Quantos dias para trás uma troca de exercício ainda vira sinal. */
const SWAP_SIGNAL_DAYS = 7;

const DAY_MS = 86_400_000;

function daysSince(iso: string | null): number {
  if (!iso) return Number.POSITIVE_INFINITY;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return Number.POSITIVE_INFINITY;
  return Math.floor((Date.now() - then) / DAY_MS);
}

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

const EMPTY_STATS: BriefingStats = {
  activeStudents: 0,
  workoutTemplates: 0,
  activeDietPlans: 0,
  aiSessions: 0,
};

interface LinkRow {
  student_id: string;
  created_at: string;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  account_status: string;
}

/**
 * Última sessão concluída de cada aluno, dentro da janela.
 *
 * Um Map em vez de procurar na lista por aluno: com 30 alunos e 60 dias de
 * histórico a busca linear roda milhares de vezes por render.
 */
function lastSessionByStudent(rows: { student_id: string; completed_at: string | null }[]) {
  const latest = new Map<string, number>();
  for (const row of rows) {
    if (!row.completed_at) continue;
    const at = new Date(row.completed_at).getTime();
    if (Number.isNaN(at)) continue;
    const known = latest.get(row.student_id);
    if (known === undefined || at > known) latest.set(row.student_id, at);
  }
  return latest;
}

function inactivityMessage(days: number): string {
  if (days > SESSION_LOOKBACK_DAYS) return "Sem treino registrado nos últimos dois meses.";
  return `Não treina há ${days} dias. Risco de abandono.`;
}

export const createBriefingService = (supabase: SupabaseClient) => ({
  /**
   * O que precisa da atenção do especialista hoje, e os números do rodapé.
   *
   * Devolve o sinal já derivado — nunca a linha da tabela. É o que mantém dado
   * de saúde fora da fronteira servidor→cliente e fora do HTML.
   *
   * @example
   * const { signals, stats } = await briefingService.fetchBriefing(specialistId);
   */
  fetchBriefing: async (specialistId: string): Promise<Briefing> => {
    const { data: links, error: linksError } = await supabase
      .from("student_specialists")
      .select("student_id, created_at")
      .eq("specialist_id", specialistId)
      .eq("status", "active");

    if (linksError) throw linksError;

    const linkRows = (links ?? []) as LinkRow[];
    const studentIds = [...new Set(linkRows.map((l) => l.student_id))];

    if (studentIds.length === 0) {
      return { signals: [], stats: EMPTY_STATS };
    }

    // As sete buscas são independentes. Em série, a tela espera sete idas ao
    // banco antes de pintar o primeiro número.
    const [
      profiles,
      anamneses,
      periodizations,
      sessions,
      templates,
      diets,
      aiSessions,
      swaps,
      checkIns,
    ] = await Promise.all([
      supabase.from("profiles").select("id, full_name, account_status").in("id", studentIds),

      // Só `completed_at`. `responses` é o conteúdo da anamnese e não entra
      // aqui em hipótese nenhuma.
      supabase
        .from("student_anamnesis")
        .select("student_id, completed_at")
        .in("student_id", studentIds)
        .not("completed_at", "is", null),

      supabase
        .from("training_periodizations")
        .select("student_id")
        .in("student_id", studentIds)
        .eq("status", "active"),

      supabase
        .from("workout_sessions")
        .select("student_id, completed_at")
        .in("student_id", studentIds)
        .not("completed_at", "is", null)
        .gte("completed_at", isoDaysAgo(SESSION_LOOKBACK_DAYS)),

      supabase
        .from("workouts")
        .select("id", { count: "exact", head: true })
        .eq("specialist_id", specialistId),

      supabase
        .from("diet_plans")
        .select("id", { count: "exact", head: true })
        .eq("specialist_id", specialistId)
        .eq("status", "active"),

      supabase
        .from("ai_chat_sessions")
        .select("id", { count: "exact", head: true })
        .eq("specialist_id", specialistId),

      supabase
        .from("exercise_swaps")
        .select("student_id")
        .in("student_id", studentIds)
        .gte("swapped_at", isoDaysAgo(SWAP_SIGNAL_DAYS)),

      // Só a resposta do registro, e só o check-in desta semana ainda sem
      // decisão: é o que o especialista tem de revisar (#376).
      supabase
        .from("weekly_check_ins")
        .select("student_id, logging")
        .in("student_id", studentIds)
        .eq("week_start", currentWeekStart())
        .eq("status", "pending"),
    ]);

    const profileRows = (profiles.data ?? []) as ProfileRow[];
    const nameById = new Map(profileRows.map((p) => [p.id, p.full_name?.trim() || "Aluno"]));

    const withAnamnesis = new Set(
      ((anamneses.data ?? []) as { student_id: string }[]).map((a) => a.student_id),
    );
    const withActivePlan = new Set(
      ((periodizations.data ?? []) as { student_id: string }[]).map((p) => p.student_id),
    );
    const lastSession = lastSessionByStudent(
      (sessions.data ?? []) as { student_id: string; completed_at: string | null }[],
    );
    const invitedIds = new Set(
      profileRows.filter((p) => p.account_status === "invited").map((p) => p.id),
    );
    const linkedAt = new Map(linkRows.map((l) => [l.student_id, l.created_at]));
    const swapCount = new Map<string, number>();
    for (const swap of (swaps.data ?? []) as { student_id: string }[]) {
      swapCount.set(swap.student_id, (swapCount.get(swap.student_id) ?? 0) + 1);
    }

    const checkInOf = new Map(
      (
        (checkIns.data ?? []) as {
          student_id: string;
          logging: keyof typeof CHECK_IN_LOGGING_LABEL;
        }[]
      ).map((row) => [row.student_id, CHECK_IN_LOGGING_LABEL[row.logging]]),
    );

    const signals: BriefingSignal[] = [];

    for (const studentId of studentIds) {
      const studentName = nameById.get(studentId) ?? "Aluno";

      // Convite pendente vem primeiro porque um aluno que nunca entrou não tem
      // como estar treinando: sinalizar inatividade nele seria ruído.
      if (invitedIds.has(studentId)) {
        const days = daysSince(linkedAt.get(studentId) ?? null);
        if (days >= PENDING_INVITE_DAYS) {
          signals.push({
            studentId,
            studentName,
            kind: "pending_invite",
            tone: "warning",
            message: `Convite pendente há ${days} dias.`,
            days,
          });
        }
        continue;
      }

      const last = lastSession.get(studentId);
      const days =
        last === undefined ? SESSION_LOOKBACK_DAYS + 1 : daysSince(new Date(last).toISOString());

      if (days >= INACTIVITY_DAYS) {
        signals.push({
          studentId,
          studentName,
          kind: "inactive",
          tone: "danger",
          message: inactivityMessage(days),
          days,
        });
        continue;
      }

      const swapped = swapCount.get(studentId) ?? 0;
      if (swapped > 0) {
        signals.push({
          studentId,
          studentName,
          kind: "exercise_swap",
          tone: "warning",
          message:
            swapped === 1
              ? `Trocou 1 exercício nos últimos ${SWAP_SIGNAL_DAYS} dias.`
              : `Trocou ${swapped} exercícios nos últimos ${SWAP_SIGNAL_DAYS} dias.`,
          days: 0,
        });
      }

      const checkIn = checkInOf.get(studentId);
      if (checkIn) {
        signals.push({
          studentId,
          studentName,
          kind: "weekly_check_in",
          tone: "warning",
          message: `Fez o check-in da semana: ${checkIn}.`,
          days: 0,
        });
      }

      if (withAnamnesis.has(studentId) && !withActivePlan.has(studentId)) {
        signals.push({
          studentId,
          studentName,
          kind: "anamnesis_ready",
          tone: "success",
          message: "Anamnese concluída — pronto para receber o plano.",
          days: 0,
        });
      }
    }

    // Mais urgente primeiro; dentro do mesmo tipo, quem está esperando há mais
    // tempo.
    signals.sort((a, b) => URGENCY[a.kind] - URGENCY[b.kind] || b.days - a.days);

    return {
      signals,
      stats: {
        activeStudents: studentIds.length,
        workoutTemplates: templates.count ?? 0,
        activeDietPlans: diets.count ?? 0,
        aiSessions: aiSessions.count ?? 0,
      },
    };
  },
});

export type BriefingService = ReturnType<typeof createBriefingService>;
export { INACTIVITY_DAYS, PENDING_INVITE_DAYS, SESSION_LOOKBACK_DAYS };
