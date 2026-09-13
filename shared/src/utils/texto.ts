/**
 * Um número com o substantivo concordando: "1 treino", "3 treinos".
 *
 * Existe porque o plural à mão esquece o singular — "1 treinos" chegou à tela.
 *
 * @example contagem(fases.length, "fase", "fases") // "2 fases"
 */
export function contagem(quantidade: number, singular: string, plural: string): string {
  return `${quantidade} ${quantidade === 1 ? singular : plural}`;
}
