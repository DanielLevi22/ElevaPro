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

/**
 * O texto sem acento, sem caixa e sem espaço nas pontas, para comparar o que a
 * pessoa digitou com o que está gravado.
 *
 * @example foldForSearch("  Agachámento LIVRE ") // "agachamento livre"
 */
export function foldForSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

/**
 * O número inteiro com o milhar separado por ponto. À mão, e não `toLocaleString`:
 * o motor de Intl muda entre plataformas, e o kit tem um formato só.
 *
 * @example withThousands(2180) // "2.180"
 */
export function withThousands(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
