import { localDateOf, type MeasurementSource, shortMonthOf } from '@elevapro/shared';

/**
 * Os textos das telas de corpo que dependem da origem e da data.
 *
 * "Medida com fita" do kit vira quem mediu: o especialista nem sempre usa fita, e a
 * declarada não é medida de ninguém além do aluno (#312).
 */
export const SOURCE_LABEL: Record<MeasurementSource, string> = {
  specialist: 'Medida pelo especialista',
  self: 'Declarada por você',
};

/**
 * A data como o kit escreve nos chips: "12 ago 2026", e sem o ano nos subtítulos.
 *
 * @example chipDate("2026-08-12T10:00:00Z") // "12 ago 2026"
 * @example shortDate("2026-08-12T10:00:00Z") // "12 ago"
 */
export function chipDate(instant: string): string {
  return `${shortDate(instant)} ${instant.slice(0, 4)}`;
}

export function shortDate(instant: string): string {
  const date = instant.slice(0, 10);
  return `${Number(date.slice(8, 10))} ${shortMonthOf(date)}`;
}

/**
 * A data de um instante do banco, no dia local de quem lê.
 *
 * `chipDate` fatia a string, que é o certo para `assessed_at` (gravado ao meio-dia
 * UTC). Um `created_at` de verdade fatiado em UTC mostra o dia seguinte para quem
 * escreveu à noite em fuso negativo.
 *
 * @example localChipDate("2026-09-16T02:15:00Z") // "15 set 2026" no Brasil
 */
export function localChipDate(instant: string): string {
  return chipDate(localDateOf(new Date(instant)));
}
