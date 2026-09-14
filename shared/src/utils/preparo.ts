import type { DificuldadeDoPreparo } from "../types/nutrition.types";

const DIFICULDADE: Record<DificuldadeDoPreparo, string> = {
  facil: "Fácil",
  media: "Média",
  dificil: "Difícil",
};

/**
 * A dificuldade do preparo como a tela escreve — a mesma no app do aluno e no
 * editor do especialista.
 *
 * @example textoDaDificuldade("media") // "Média"
 */
export function textoDaDificuldade(dificuldade: DificuldadeDoPreparo): string {
  return DIFICULDADE[dificuldade];
}

/** Os três níveis na ordem do kit, para o seletor do editor. */
export const DIFICULDADES_DO_PREPARO = Object.keys(DIFICULDADE) as DificuldadeDoPreparo[];

/**
 * As porções que a receita rende, no singular ou no plural.
 *
 * @example textoDasPorcoes(1) // "1 porção"
 */
export function textoDasPorcoes(porcoes: number): string {
  return `${porcoes} ${porcoes === 1 ? "porção" : "porções"}`;
}
