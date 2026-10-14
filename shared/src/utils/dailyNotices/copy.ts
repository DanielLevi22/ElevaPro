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
export function detailedCopy(kind: "meal" | "workout", name: string): NoticeCopy {
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

/**
 * O reengajamento (F4, F5): sem dado de saúde, o mesmo texto com ou sem
 * detalhes.
 *
 * @example reengagementCopy("busyWeek").title // "Semana corrida?"
 */
export function reengagementCopy(kind: "comeback" | "busyWeek"): NoticeCopy {
  if (kind === "comeback") {
    return {
      title: "Sua semana ainda dá para salvar",
      body: "Ainda dá tempo esta semana, mesmo que seja curto.",
    };
  }
  return {
    title: "Semana corrida?",
    body: "Pausar o plano, voltar mais leve ou seguir: toque para escolher.",
  };
}

export interface VictoryInput {
  /** A primeira evolução da sessão: "Supino" e "45 kg → 47,5 kg". */
  record: { name: string; text: string } | null;
  weekDone: number;
  /** Os treinos da semana no plano; nulo sem plano. */
  weekTarget: number | null;
}

/**
 * O aviso de vitória (F1), para cada aviso de pendência: a semana completa
 * primeiro, depois o recorde. Nulo sem vitória. Sem detalhes, nem o exercício
 * nem o número de treinos.
 *
 * @example victoryCopy({ record: null, weekDone: 4, weekTarget: 4 }, false)?.title // "Semana completa: 4 de 4"
 */
export function victoryCopy(input: VictoryInput, hide: boolean): NoticeCopy | null {
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

/**
 * O aviso sem detalhe (F6): só quantas pendências há. Nada de refeição,
 * caloria, peso, treino ou exercício: a tela bloqueada é vista por qualquer um.
 *
 * @example hiddenCopy(2) // { title: "Você tem 2 pendências de hoje", … }
 */
export function hiddenCopy(pending: number): NoticeCopy {
  return {
    title:
      pending === 1 ? "Você tem 1 pendência de hoje" : `Você tem ${pending} pendências de hoje`,
    body: "Toque para ver no app.",
  };
}
