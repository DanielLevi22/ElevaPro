import type { ActionableNoticeKind, FixedNoticeKind } from "./types";

/**
 * O texto dos avisos. Tom leve, nunca cobrança (decidido no #376): "ainda dá
 * tempo", nunca "você não treinou".
 */

export interface NoticeCopy {
  title: string;
  body: string;
}

/** "Treino A - Peito e Tríceps" vira "Treino A": o resto não cabe no aviso. */
const shortWorkout = (title: string) => title.split(" - ")[0].trim() || "Seu treino";

/**
 * O aviso com detalhe: o nome da refeição ou do treino.
 *
 * @example detailedCopy("meal", "Almoço") // { title: "Almoço ainda não marcado", … }
 */
export function detailedCopy(kind: ActionableNoticeKind, name: string): NoticeCopy {
  if (kind === "meal") {
    return {
      title: `${name} ainda não marcado`,
      body: "Marque o que você comeu. Se pulou, tudo bem também.",
    };
  }
  return {
    title: `${shortWorkout(name)} ainda dá tempo hoje`,
    body: "Se não der, mudamos para amanhã.",
  };
}

/** Os avisos de texto fixo: sem dado de saúde, o mesmo com ou sem detalhes. */
const FIXED_COPY: Record<FixedNoticeKind, NoticeCopy> = {
  comeback: {
    title: "Sua semana ainda dá para salvar",
    body: "Ainda dá tempo esta semana, mesmo que seja curto.",
  },
  busyWeek: {
    title: "Semana corrida?",
    body: "Pausar o plano, voltar mais leve ou seguir: toque para escolher.",
  },
  dailyLog: {
    title: "Hora de registrar o dia",
    body: "Marque o que você comeu hoje. Leva um minuto.",
  },
  weeklyReport: {
    title: "Seu relatório da semana chegou",
    body: "Veja como foi a semana e o que mudou no seu plano.",
  },
  checkIn: {
    title: "Seu check-in da semana está esperando",
    body: "Duas perguntas, um minuto.",
  },
};

/**
 * O texto de um aviso fixo.
 *
 * @example fixedCopy("busyWeek").title // "Semana corrida?"
 */
export function fixedCopy(kind: FixedNoticeKind): NoticeCopy {
  return FIXED_COPY[kind];
}

/**
 * Quantas pendências há, sem dizer quais: o aviso sem detalhe e o widget.
 *
 * @example pendingTitle(2) // "Você tem 2 pendências de hoje"
 */
export function pendingTitle(pending: number): string {
  return pending === 1 ? "Você tem 1 pendência de hoje" : `Você tem ${pending} pendências de hoje`;
}

/**
 * O aviso sem detalhe (F6): só quantas pendências há. Nada de refeição,
 * caloria, peso, treino ou exercício: a tela bloqueada é vista por qualquer um.
 *
 * @example hiddenCopy(2) // { title: "Você tem 2 pendências de hoje", … }
 */
export function hiddenCopy(pending: number): NoticeCopy {
  return { title: pendingTitle(pending), body: "Toque para ver no app." };
}

/** Os treinos que viram marco (F1): o 10º, o 25º, o 50º… */
export const WORKOUT_MILESTONES = [10, 25, 50, 100, 150, 200, 300, 365, 500] as const;

export interface VictoryInput {
  /** A primeira evolução da sessão: "Supino" e "45 kg → 47,5 kg". */
  record: { name: string; text: string } | null;
  weekDone: number;
  /** Os treinos da semana no plano; nulo sem plano. */
  weekTarget: number | null;
  /** Os treinos feitos desde sempre, contando o de hoje. */
  totalWorkouts: number;
}

/**
 * O aviso de vitória (F1), para cada aviso de pendência: o marco primeiro,
 * depois a semana completa, depois o recorde. Nulo sem vitória. Sem detalhes,
 * nem o exercício, nem a carga, nem o número de treinos.
 *
 * @example victoryCopy({ record: null, weekDone: 4, weekTarget: 4, totalWorkouts: 7 }, false)?.title // "Semana completa: 4 de 4"
 */
export function victoryCopy(input: VictoryInput, hide: boolean): NoticeCopy | null {
  const milestone = (WORKOUT_MILESTONES as readonly number[]).includes(input.totalWorkouts);
  if (milestone) {
    return hide
      ? { title: "Um marco novo hoje", body: "Abra o app para ver." }
      : { title: `Treino número ${input.totalWorkouts}!`, body: "Cada um deles contou." };
  }
  // Só no treino que fecha a semana: o quinto de 4 não comemora de novo.
  if (input.weekTarget !== null && input.weekDone === input.weekTarget) {
    return hide
      ? { title: "Semana completa!", body: "Abra o app para ver." }
      : {
          title: `Semana completa: ${input.weekDone} de ${input.weekTarget}`,
          body: "Sua sequência segue.",
        };
  }
  if (!input.record) return null;
  return hide
    ? { title: "Recorde novo hoje", body: "Abra o app para ver." }
    : { title: `Recorde: ${input.record.name}`, body: input.record.text };
}
