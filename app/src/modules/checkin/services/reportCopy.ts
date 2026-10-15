import {
  contagem,
  formatarCarga,
  formatarDecimal,
  type LoadRecord,
  shortDateRange,
  type WeekAdjustment,
  type WeeklyReport,
} from '@elevapro/shared';
import { formatKcal } from './formatCalories';

export interface ReportHeadline {
  /** "5 a 11 out", "28 set a 4 out". */
  eyebrow: string;
  title: string;
  sub: string;
  /** O título curto do cartão da tela inicial: "Semana completa". */
  short: string;
}

export interface ReportNumber {
  value: string;
  sub: string;
}

export interface ReportLine {
  title: string;
  sub: string;
}

/**
 * O título do relatório pelo tom da semana. A semana difícil não leva bronca
 * (R1a): diz que acontece, e só.
 *
 * @example reportHeadline(report, 'Marina').title // "Semana completa, Marina"
 */
export function reportHeadline(report: WeeklyReport, name: string): ReportHeadline {
  const eyebrow = shortDateRange(report.weekStart, report.weekEnd);
  const records = report.records.length;
  switch (report.tone) {
    case 'complete':
      return {
        eyebrow,
        short: 'Semana completa',
        title: `Semana completa, ${name}`,
        sub:
          records > 0
            ? `Você treinou tudo e ficou mais forte em ${contagem(records, 'exercício', 'exercícios')}.`
            : 'Você fez todos os treinos da semana.',
      };
    case 'steady':
      return { eyebrow, short: 'Sua semana', title: `Sua semana, ${name}`, sub: steadySub(report) };
    case 'hard':
      return {
        eyebrow,
        short: 'Semana difícil',
        title: `Semana difícil, ${name}`,
        sub: 'Acontece. Uma semana não desfaz o que você construiu.',
      };
    case 'empty':
      return {
        eyebrow,
        short: 'Semana sem registro',
        title: 'Semana sem registro',
        sub: 'Nenhum treino, refeição ou pesagem nesta semana. Quando houver, o relatório conta aqui.',
      };
  }
}

function steadySub({ workouts }: WeeklyReport): string {
  if (workouts.planned === null) {
    return `Você treinou ${contagem(workouts.done, 'vez', 'vezes')} nesta semana.`;
  }
  return `Você fez ${workouts.done} de ${workouts.planned} treinos. Cada um conta.`;
}

/**
 * Os três números do topo (treinos, dieta, peso). Na semana difícil, a dieta
 * conta os dias registrados, e não os dias na meta: é o que dá para mostrar
 * sem apontar falta.
 *
 * @example reportNumbers(report).workouts // { value: "4/4", sub: "todos feitos" }
 */
export function reportNumbers(
  report: WeeklyReport
): Record<'workouts' | 'diet' | 'weight', ReportNumber> {
  return {
    workouts: workoutsNumber(report),
    diet: dietNumber(report),
    weight: weightNumber(report),
  };
}

function workoutsNumber({ workouts }: WeeklyReport): ReportNumber {
  if (workouts.planned === null) {
    return { value: String(workouts.done), sub: workouts.done === 1 ? 'treino' : 'treinos' };
  }
  return { value: `${workouts.done}/${workouts.planned}`, sub: 'treinos feitos' };
}

function dietNumber({ diet, tone }: WeeklyReport): ReportNumber {
  if (!diet) return { value: '—', sub: 'sem dieta' };
  if (tone === 'hard') return { value: `${diet.daysLogged}/7`, sub: 'dias registrados' };
  return { value: `${diet.daysOnTarget}/${diet.daysPlanned}`, sub: 'dias na meta' };
}

function weightNumber({ weightChange }: WeeklyReport): ReportNumber {
  if (weightChange === null) return { value: '—', sub: 'sem pesagem' };
  return { value: signed(weightChange), sub: 'kg na semana' };
}

/** "−0,4", "+0,3", "0". O menos é o tipográfico, como no resto do app. */
function signed(value: number): string {
  if (value === 0) return '0';
  return `${value > 0 ? '+' : '−'}${formatarDecimal(Math.abs(value))}`;
}

/**
 * A linha do recorde: o antes e o depois. O ganho vai na pílula ao lado.
 *
 * @example recordLine({ name: 'Supino', weight: 12.5, previousWeight: 10, … })
 * // { title: 'Supino', sub: '10 kg → 12,5 kg' }
 */
export function recordLine(record: LoadRecord): ReportLine {
  return {
    title: record.name,
    sub: `${formatarCarga(record.previousWeight)} → ${formatarCarga(record.weight)}`,
  };
}

const CALORIE_REASON: Record<Extract<WeekAdjustment, { kind: 'calories' }>['reason'], string> = {
  weight_above_pace: 'Aprovada no check-in: o peso ficou acima do ritmo.',
  weight_below_pace: 'Aprovada no check-in: o peso ficou abaixo do ritmo.',
  undo: 'Você desfez o ajuste do check-in.',
};

/**
 * A linha de "O que ajustamos para você", com o motivo de cada mudança.
 *
 * @example adjustmentLine({ kind: 'calories', before: 2150, after: 2000, reason: 'weight_above_pace', at })
 * // { title: 'Meta 2.150 → 2.000 kcal', sub: 'Aprovada no check-in: …' }
 */
export function adjustmentLine(adjustment: WeekAdjustment): ReportLine {
  if (adjustment.kind === 'swap') {
    return { title: adjustment.summary, sub: 'Troca de exercício no plano.' };
  }
  if (adjustment.kind === 'simplified') {
    return {
      title: `Plano mais simples: ${adjustment.before} → ${adjustment.after} refeições`,
      sub: 'Aprovado no check-in: mesma meta, mais fácil de seguir.',
    };
  }
  return {
    title: `Meta ${Math.round(adjustment.before).toLocaleString('pt-BR')} → ${formatKcal(adjustment.after)}`,
    sub: CALORIE_REASON[adjustment.reason],
  };
}

/**
 * A sequência em semanas, sem a palavra "dias": uma semana com um treino já conta.
 *
 * @example streakTitle(3) // "3 semanas seguidas treinando"
 */
export function streakTitle(weeks: number): string {
  return weeks === 1 ? '1 semana treinando' : `${weeks} semanas seguidas treinando`;
}
