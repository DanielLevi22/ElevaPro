/**
 * Onde a pessoa treina, como a anamnese grava em `gym_type`.
 *
 * O valor gravado é o texto da opção, e já existe assim em produção: mudar o
 * texto aqui quebraria o que foi respondido. Por isso a regra compara com estas
 * constantes, nunca com o texto escrito à mão em cada lugar — a troca de
 * exercício chegou a tratar "Academia básica" como casa por comparar só com
 * "Academia completa".
 */
export const TRAINING_PLACES = {
  fullGym: "Academia completa",
  /** Só da anamnese antiga; o onboarding não oferece mais. */
  basicGym: "Academia básica",
  home: "Home gym",
  outdoor: "Ao ar livre",
} as const;

export type TrainingPlace = (typeof TRAINING_PLACES)[keyof typeof TRAINING_PLACES];

const ALL_PLACES: readonly string[] = Object.values(TRAINING_PLACES);
const GYM_PLACES: readonly TrainingPlace[] = [TRAINING_PLACES.fullGym, TRAINING_PLACES.basicGym];

/**
 * A resposta gravada como lugar de treino, ou `null` quando não é um.
 *
 * @example readTrainingPlace("Home gym") // "Home gym"
 * @example readTrainingPlace(42) // null
 */
export function readTrainingPlace(answer: unknown): TrainingPlace | null {
  return typeof answer === "string" && ALL_PLACES.includes(answer)
    ? (answer as TrainingPlace)
    : null;
}

/**
 * Se o lugar é academia, completa ou básica: o resto é casa ou ar livre, e só
 * vale o que dá para fazer sem aparelho de academia.
 *
 * @example trainsAtGym("Academia básica") // true
 */
export function trainsAtGym(place: TrainingPlace): boolean {
  return GYM_PLACES.includes(place);
}
