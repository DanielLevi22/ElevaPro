import type { BriefingSignal } from "../../types/briefing.types";
import { addDays, daysBetween } from "../../utils/dateOnly";

/**
 * Dias sem treino, ou sem marcar refeição, que viram sinal de atenção (#376,
 * F8). Cinco, como o desenho do painel: decidido no #376. Antes eram sete,
 * pela prescrição semanal; com cinco, quem treina 3x e descansou o fim de
 * semana ainda não aparece, e quem sumiu aparece dois dias antes.
 */
export const INACTIVITY_DAYS = 5;

/** O que se sabe do engajamento de um aluno, já reduzido a datas. */
export interface EngagementFacts {
  studentId: string;
  studentName: string;
  /** Dias desde o último treino; infinito sem nenhum na janela. */
  sessionDays: number;
  /** Desde quando a dieta ativa vale; nulo sem dieta. */
  dietSince: string | null;
  /** O último dia com refeição marcada na janela; nulo sem nenhum. */
  lastMealLog: string | null;
  /** Se o check-in da semana passada existe. */
  lastWeekCheckIn: boolean;
  /** Em Modo Descanso: a pausa não é abandono. */
  resting: boolean;
  /**
   * Se o especialista vê as refeições e o check-in: com o consentimento de
   * saúde revogado, a RLS não devolve nada, e "nada" não é "não marcou".
   */
  healthVisible: boolean;
}

/**
 * Os sinais de quem precisa de atenção (F8): dias sem treinar, refeições sem
 * marcar e check-in pulado. Sem treino é o mais grave e vem sozinho; em Modo
 * Descanso, nada.
 *
 * @example engagementSignals(fatos, "2026-10-14", "2026-10-06")[0]?.message // "Não treina há 6 dias…"
 */
export function engagementSignals(
  facts: EngagementFacts,
  today: string,
  lastWeekStart: string,
): BriefingSignal[] {
  if (facts.resting) return [];
  const base = { studentId: facts.studentId, studentName: facts.studentName };
  if (facts.sessionDays >= INACTIVITY_DAYS) {
    return [
      {
        ...base,
        kind: "inactive",
        tone: "danger",
        message: inactivityMessage(facts.sessionDays),
        days: facts.sessionDays,
      },
    ];
  }
  if (!facts.healthVisible) return [];
  return [mealSignal(facts, today), checkInSignal(facts, lastWeekStart)].flatMap((signal) =>
    signal ? [{ ...base, ...signal }] : [],
  );
}

/** O teto da janela de sessões: além dele, "dois meses" diz o bastante. */
const LOOKBACK_LABEL_DAYS = 60;

function inactivityMessage(days: number): string {
  if (days > LOOKBACK_LABEL_DAYS) return "Sem treino registrado nos últimos dois meses.";
  return `Não treina há ${days} dias. Risco de abandono.`;
}

type SignalBody = Omit<BriefingSignal, "studentId" | "studentName">;

/** Dieta que já dura mais que a janela, e nenhuma refeição marcada nela. */
function mealSignal(facts: EngagementFacts, today: string): SignalBody | null {
  if (!facts.dietSince || facts.dietSince > addDays(today, -INACTIVITY_DAYS)) return null;
  const days = facts.lastMealLog ? daysBetween(facts.lastMealLog, today) : null;
  if (days !== null && days < INACTIVITY_DAYS) return null;
  return {
    kind: "meals_unlogged",
    tone: "warning",
    message:
      days === null
        ? `Sem marcar refeição há mais de ${INACTIVITY_DAYS} dias.`
        : `Sem marcar refeição há ${days} dias.`,
    days: days ?? INACTIVITY_DAYS,
  };
}

/** O check-in da semana que fechou não veio, e a dieta já valia nela. */
function checkInSignal(facts: EngagementFacts, lastWeekStart: string): SignalBody | null {
  if (!facts.dietSince || facts.dietSince > lastWeekStart || facts.lastWeekCheckIn) return null;
  return {
    kind: "check_in_skipped",
    tone: "warning",
    message: "Pulou o check-in da semana passada.",
    days: 0,
  };
}
