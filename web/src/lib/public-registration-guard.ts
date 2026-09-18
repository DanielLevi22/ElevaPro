import { NextResponse } from "next/server";
import { enforceRateLimit } from "./rate-limit";
import { enforceRequestBodyLimit, requestBodyLimits } from "./request-body-limit";
import { attachTraceId, traceIdForRequest } from "./trace";

export type PublicRegistrationGuard = {
  response: Response | null;
  traceId: string;
};

/**
 * Aplica as proteções compartilhadas das portas públicas de cadastro.
 *
 * @example
 * const guard = await guardPublicRegistration(request);
 * if (guard.response) return guard.response;
 */
export async function guardPublicRegistration(request: Request): Promise<PublicRegistrationGuard> {
  const traceId = traceIdForRequest(request);
  const limited = await enforceRateLimit(request, "registration", traceId);
  if (limited) return { response: attachTraceId(limited, traceId), traceId };

  const oversized = await enforceRequestBodyLimit(request, requestBodyLimits.publicRegistration);
  return { response: oversized ? attachTraceId(oversized, traceId) : null, traceId };
}

/**
 * Lê JSON público sem transformar corpo inválido em erro HTML do framework.
 *
 * @example
 * const parsed = await readPublicRegistrationJson(request, traceId);
 * if (parsed.response) return parsed.response;
 */
export async function readPublicRegistrationJson(
  request: Request,
  traceId: string,
): Promise<{ body: unknown; response: null } | { body: null; response: Response }> {
  try {
    return { body: await request.json(), response: null };
  } catch {
    return {
      body: null,
      response: attachTraceId(
        NextResponse.json({ error: "invalid_request_body" }, { status: 400 }),
        traceId,
      ),
    };
  }
}
