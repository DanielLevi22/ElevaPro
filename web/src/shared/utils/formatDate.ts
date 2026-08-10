import { format, isValid, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Faixa aceita para data digitada. O input nativo do navegador vai ate o ano
 * 275760 — foi assim que "12312-12-23" chegou ao banco e derrubou a listagem
 * de periodizacoes.
 */
export const MIN_DATE = "1900-01-01";
export const MAX_DATE = "2100-12-31";

/** Exibido no lugar de uma data ausente ou corrompida. */
export const EMPTY_DATE = "—";

export type DateStyle = "short" | "medium" | "long" | "monthYear" | "dateTime";

const PATTERN: Record<DateStyle, string> = {
  /** "1 ago" — colunas de tabela, onde o ano vem do contexto. */
  short: "d MMM",
  /** "01 ago 2026" — datas avulsas, onde o ano importa. */
  medium: "dd MMM yyyy",
  long: "d 'de' MMMM 'de' yyyy",
  monthYear: "MMM yyyy",
  dateTime: "dd MMM yyyy, HH:mm",
};

/**
 * Converte o valor vindo do banco em Date, ou null se nao der.
 *
 * parseISO e nao `new Date`: as colunas de data sao date-only ("2026-08-01") e
 * o construtor as interpreta como UTC — em fuso negativo o dia volta um.
 */
function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : parseISO(value);
  return isValid(parsed) ? parsed : null;
}

/**
 * Formata uma data para exibicao, sem nunca lancar.
 *
 * O `format` do date-fns lanca RangeError com data invalida, entao chama-lo
 * direto faz um unico registro ruim derrubar a tela inteira.
 *
 * @example
 * formatDate("2026-08-01")              // "1 ago"
 * formatDate("2026-08-01", "long")      // "1 de agosto de 2026"
 * formatDate("12312-12-23")             // "—"
 */
export function formatDate(
  value: string | Date | null | undefined,
  style: DateStyle = "short",
): string {
  const date = toDate(value);
  return date ? format(date, PATTERN[style], { locale: ptBR }) : EMPTY_DATE;
}

/**
 * Formata um intervalo. Devolve o travessao sozinho quando as duas pontas
 * faltam, em vez de "— → —".
 *
 * @example
 * formatDateRange("2026-08-01", "2026-09-01") // "1 ago → 1 set"
 */
export function formatDateRange(
  start: string | Date | null | undefined,
  end: string | Date | null | undefined,
  style: DateStyle = "short",
): string {
  if (!toDate(start) && !toDate(end)) return EMPTY_DATE;
  return `${formatDate(start, style)} → ${formatDate(end, style)}`;
}

/** True quando a data existe e cai dentro da faixa aceita. */
export function isDateInRange(value: string | null | undefined): boolean {
  const date = toDate(value);
  if (!date) return false;
  return date >= parseISO(MIN_DATE) && date <= parseISO(MAX_DATE);
}
