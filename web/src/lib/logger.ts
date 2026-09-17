type LogLevel = "error" | "info" | "warn";
type LogAttributes = Record<string, unknown>;

const SENSITIVE_KEY =
  /authorization|cookie|token|secret|password|email|name|phone|body|content|prompt|message|health|anamnesis|assessment|diet|meal|workout|session/i;
const REDACTED = "[REDACTED]";
const CIRCULAR = "[CIRCULAR]";

function redactValue(value: unknown, key: string | undefined, seen: WeakSet<object>): unknown {
  if (key && SENSITIVE_KEY.test(key)) return REDACTED;
  if (value instanceof Error) return { name: value.name };
  if (value === null || typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") return value.slice(0, 256);
  if (typeof value === "bigint") return value.toString();
  if (typeof value !== "object") return String(value);
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
