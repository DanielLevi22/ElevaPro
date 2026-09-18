type LogLevel = "error" | "info" | "warn";
type LogAttributes = Record<string, unknown>;

// Medidas e métricas entram pelo nome: o valor de saúde é um número qualquer,
// e nada no número em si o distingue de uma contagem técnica.
const SENSITIVE_KEY =
  /authorization|cookie|token|secret|password|email|name|phone|body|content|prompt|message|details|hint|health|anamnesis|assessment|diet|meal|workout|session|weight|height|bmi|waist|circumference|measure|heart|pulse|sleep|readiness|value/i;
const EMAIL = /[^\s@()<>"',;]+@[^\s@()<>"',;]+\.[^\s@()<>"',;]+/g;
const REDACTED = "[REDACTED]";
const CIRCULAR = "[CIRCULAR]";

type ErrorLike = { name?: unknown; code?: unknown };

// O PostgrestError não herda de Error, mas carrega message/code/details.
function isErrorLike(value: object): value is ErrorLike {
  return value instanceof Error || ("message" in value && "code" in value);
}

// Do erro fica só o que classifica a falha: message, details e hint citam a
// linha que falhou, com e-mail e valores dentro.
function summarizeError(error: ErrorLike): Record<string, string> {
  const summary: Record<string, string> = {};
  if (typeof error.name === "string") summary.name = error.name;
  if (typeof error.code === "string") summary.code = error.code;
  return summary;
}

function redactScalar(value: unknown): unknown {
  if (value === null || typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") return value.slice(0, 256).replace(EMAIL, REDACTED);
  if (typeof value === "bigint") return value.toString();
  return String(value);
}

function redactValue(value: unknown, key: string | undefined, seen: WeakSet<object>): unknown {
  if (key && SENSITIVE_KEY.test(key)) return REDACTED;
  if (typeof value !== "object" || value === null) return redactScalar(value);
  if (isErrorLike(value)) return summarizeError(value);
  if (seen.has(value)) return CIRCULAR;

  seen.add(value);
  if (Array.isArray(value)) return value.map((item) => redactValue(item, undefined, seen));

  const safeAttributes: Record<string, unknown> = {};
  for (const [attributeName, attributeValue] of Object.entries(value)) {
    safeAttributes[attributeName] = redactValue(attributeValue, attributeName, seen);
  }
  return safeAttributes;
}

/**
 * Remove valores que não pertencem a logs técnicos antes de qualquer saída.
 *
 * @example
 * redactForLog({ authorization: "Bearer ...", trace_id: "abc" });
 * // { authorization: "[REDACTED]", trace_id: "abc" }
 */
export function redactForLog(attributes: LogAttributes): LogAttributes {
  return redactValue(attributes, undefined, new WeakSet<object>()) as LogAttributes;
}

function write(level: LogLevel, event: string, attributes: LogAttributes = {}): void {
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...redactForLog(attributes),
  });

  if (level === "error") console.error(entry);
  else if (level === "warn") console.warn(entry);
  else console.info(entry);
}

/** Logger estruturado para novos e caminhos migrados do BFF. */
export const logger = {
  error(event: string, attributes?: LogAttributes): void {
    write("error", event, attributes);
  },
  info(event: string, attributes?: LogAttributes): void {
    write("info", event, attributes);
  },
  warn(event: string, attributes?: LogAttributes): void {
    write("warn", event, attributes);
  },
};
