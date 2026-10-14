import type { NoticeKind } from "./types";

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
export function detailedCopy(kind: NoticeKind, name: string): NoticeCopy {
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
