import type { PlanEndReason } from "../types/workouts.types";
import type { DailyActivity } from "./dailyActivity";
import { addDays, daysBetween, weekdayFromMonday } from "./dateOnly";
import type { LoadRecord } from "./periodReport";
import { pausedDays, type RestPeriod, restEnd } from "./restMode";
import type { WeekAdjustment } from "./weeklyReport";
import { streakWeeks } from "./weeklyReport";

/**
 * Sua jornada (#376, D1): tudo o que aconteceu desde que o plano nasceu, numa
 * linha do tempo — blocos, recordes, ajustes de meta, trocas e pausas — com os
 * números do caminho todo.
 */

export interface JourneyBlock {
  name: string;
  start_date: string;
  end_date: string;
  status: string;
  end_reason: PlanEndReason | null;
}

export type JourneyEventKind = "start" | "block" | "record" | "target" | "swap" | "rest";

export interface JourneyEvent {
  kind: JourneyEventKind;
  date: string;
  title: string;
  sub: string | null;
}

export interface Journey {
  /** O dia em que o plano nasceu; nulo sem plano. */
  since: string | null;
  weeks: number;
  /** A última pesagem menos a primeira, na mesma origem; nula sem duas. */
  weightChange: number | null;
  records: number;
  streakWeeks: number;
  /** Quantas vezes o plano mudou: recordes, metas e trocas. */
  changes: number;
  /** Da mais recente para a mais antiga. */
  events: JourneyEvent[];
}

export interface JourneyInput {
  today: string;
  /** Os planos da pessoa, ativos ou não. */
  blocks: readonly JourneyBlock[];
  records: readonly LoadRecord[];
  adjustments: readonly WeekAdjustment[];
  rests: readonly RestPeriod[];
  /** As pesagens, já na mesma origem, da mais antiga para a mais nova. */
  weights: readonly number[];
  days: readonly DailyActivity[];
}

const WEEK_DAYS = 7;
const kg = (value: number) => `${String(Math.round(value * 10) / 10).replace(".", ",")} kg`;
const kcal = (value: number) => Math.round(value).toLocaleString("pt-BR");
const shortName = (name: string) => name.split(" · ")[0];

/**
 * @example
 * const jornada = summarizeJourney({ today, blocks, records, adjustments, rests, weights, days });
 * jornada.events[0].title // "Bloco 2 concluído"
 */
export function summarizeJourney(input: JourneyInput): Journey {
  const ordered = input.blocks
    .filter((block) => !wasReplaced(block, input.today))
    .sort((a, b) => a.start_date.localeCompare(b.start_date));
  const since = ordered[0]?.start_date ?? null;
  const events = [
    ...blockEvents(ordered, input.today),
    ...input.records.map(recordEvent),
    ...input.adjustments.map(adjustmentEvent),
    ...input.rests.map((rest) => restEvent(rest, input.today)),
  ]
    // O bloco novo que começa amanhã (C2) ainda não aconteceu.
    .filter((event) => event.date <= input.today)
    .sort((a, b) => b.date.localeCompare(a.date));
  const first = input.weights[0];
  const last = input.weights.at(-1);
  return {
    since,
    weeks: since ? Math.max(1, Math.round(daysBetween(since, input.today) / WEEK_DAYS)) : 0,
    weightChange:
      input.weights.length > 1 && first !== undefined && last !== undefined
        ? Math.round((last - first) * 10) / 10
        : null,
    records: input.records.length,
    streakWeeks: streakWeeks(
      input.days,
      addDays(input.today, -weekdayFromMonday(input.today)),
      pausedDays(input.rests, input.today),
    ),
    changes: input.records.length + input.adjustments.length,
    events,
  };
}

/**
 * O plano trocado por outro não foi um bloco: foi o onboarding refeito. Antes
 * da 0090 não havia motivo, e o sinal é ter acabado antes da data sem ele.
 */
function wasReplaced(block: JourneyBlock, today: string): boolean {
  if (block.end_reason === "replaced") return true;
  return block.status === "completed" && block.end_reason === null && block.end_date > today;
}

function blockEvents(blocks: readonly JourneyBlock[], today: string): JourneyEvent[] {
  return blocks.flatMap((block, index) => {
    const start: JourneyEvent =
      index === 0
        ? {
            kind: "start",
            date: block.start_date,
            title: "Seu plano nasceu",
            sub: shortName(block.name),
          }
        : {
            kind: "block",
            date: block.start_date,
            title: `${shortName(block.name)} começou`,
            sub: null,
          };
    if (block.status !== "completed" || block.end_date > today) return [start];
    return [start, endEvent(block)];
  });
}

function endEvent(block: JourneyBlock): JourneyEvent {
  const name = shortName(block.name);
  const title =
    block.end_reason === "changed_early"
      ? `${name} encerrado antes`
      : block.end_reason === "replaced"
        ? `${name} trocado`
        : `${name} concluído`;
  return { kind: "block", date: block.end_date, title, sub: null };
}

function recordEvent(record: LoadRecord): JourneyEvent {
  return {
    kind: "record",
    date: record.date,
    title: `Recorde em ${record.name}`,
    sub: `${kg(record.previousWeight)} → ${kg(record.weight)}`,
  };
}

function adjustmentEvent(adjustment: WeekAdjustment): JourneyEvent {
  const date = adjustment.at.slice(0, 10);
  if (adjustment.kind === "swap") {
    return { kind: "swap", date, title: "Troca de exercício", sub: adjustment.summary };
  }
  return {
    kind: "target",
    date,
    title: `Meta ${kcal(adjustment.before)} → ${kcal(adjustment.after)} kcal`,
    sub: adjustment.reason === "undo" ? "Você desfez o ajuste" : "Aprovada no check-in",
  };
}

function restEvent(rest: RestPeriod, today: string): JourneyEvent {
  const end = restEnd(rest, today);
  const days = daysBetween(rest.starts_on, end ?? addDays(today, 1));
  return {
    kind: "rest",
    date: rest.starts_on,
    title: "Modo Descanso",
    sub: end ? `${days} ${days === 1 ? "dia" : "dias"} de pausa` : "Em pausa agora",
  };
}
