import { randomBytes } from "node:crypto";

const TRACEPARENT = /^[0-9a-f]{2}-([0-9a-f]{32})-[0-9a-f]{16}-[0-9a-f]{2}(?:-[a-z0-9-]+)?$/i;

function newTraceId(): string {
  return randomBytes(16).toString("hex");
}

/**
 * Reaproveita somente o trace-id W3C válido; qualquer outro cabeçalho é ignorado.
 *
 * @example
 * const traceId = traceIdForRequest(request);
 * response.headers.set("X-Request-Id", traceId);
 */
export function traceIdForRequest(request: Request): string {
  const traceparent = request.headers.get("traceparent")?.trim();
  const match = traceparent?.match(TRACEPARENT);
  return match?.[1]?.toLowerCase() ?? newTraceId();
}

/** Faz o identificador chegar ao suporte sem retornar qualquer dado da requisição. */
export function attachTraceId(response: Response, traceId: string): Response {
  response.headers.set("X-Request-Id", traceId);
  return response;
}
