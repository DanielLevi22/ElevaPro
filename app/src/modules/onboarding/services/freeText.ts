const MAX_LENGTH = 30;

/**
 * O "Outro" de esporte e de equipamento: um nome curto, e não um texto aberto.
 * Só letras, números, espaço e hífen, até 30 caracteres. Vai ao prompt do
 * plano, e um campo livre ali seria porta para qualquer coisa.
 *
 * @example cleanFreeText('  natação   em  mar ') // 'natação em mar'
 */
export function cleanFreeText(text: string): string {
  return text
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_LENGTH)
    .trim();
}
