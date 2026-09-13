/**
 * Os nomes do calendário em português e o zero à esquerda, num lugar só.
 *
 * À mão, e não `toLocaleDateString`: o pt-BR do motor de Intl devolve "06 de
 * mai." e muda entre plataformas e versões, e o kit tem um formato só. Os meses
 * e os dias estavam copiados nas contas da periodização e nas da sessão.
 */

export const MESES_CURTOS = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
] as const;

export const MESES_POR_EXTENSO = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
] as const;

export const DIAS_DA_SEMANA = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
] as const;

export const MS_POR_SEGUNDO = 1000;

/**
 * Um número com dois dígitos, como relógio e data escrevem.
 *
 * @example doisDigitos(6) // "06"
 */
export function doisDigitos(numero: number): string {
  return String(numero).padStart(2, "0");
}
