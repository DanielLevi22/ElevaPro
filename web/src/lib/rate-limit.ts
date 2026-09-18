import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { recordSecurityAuditEvent } from "@/lib/security-audit";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { traceIdForRequest } from "@/lib/trace";

type RateLimitPolicy = {
  limit: number;
  windowSeconds: number;
  retentionSeconds: number;
};

const POLICIES = {
  ai: { limit: 20, windowSeconds: 60, retentionSeconds: 3600 },
  registration: { limit: 5, windowSeconds: 3600, retentionSeconds: 86400 },
} as const satisfies Record<string, RateLimitPolicy>;

// O código chega ao log: sem ele, a rota responde 503 e o log só diz "Error".
class RateLimitKeyError extends Error {
  readonly code = "rate_limit_key_invalid";
}

function rateLimitKey(env: NodeJS.ProcessEnv = process.env): string {
  const key = env.RATE_LIMIT_HMAC_KEY?.trim();
  if (!key || key.length < 32 || key.includes("PREENCHER")) {
    throw new RateLimitKeyError(
      `RATE_LIMIT_HMAC_KEY must be a secret of at least 32 characters; received ${key?.length ?? 0} characters`,
    );
  }
  return key;
}

/** Cria um identificador estável sem reter a origem em texto claro. */
export function pseudonymizeRateLimitSubject(subject: string, key = rateLimitKey()): string {
  return createHmac("sha256", key).update(subject).digest("hex");
}

function requestSubject(request: Request, env: NodeJS.ProcessEnv = process.env): string | null {
  // A Vercel sobrescreve estes cabeçalhos no edge. Exigir os dois impede que
  // uma requisição direta escolha um IP arbitrário como chave do limitador.
  const vercelRequestId = request.headers.get("x-vercel-id")?.trim();
  const origin = request.headers.get("x-vercel-forwarded-for")?.trim();
  if (vercelRequestId && origin) return `ip:${origin}`;

  // O servidor de desenvolvimento não recebe a cadeia de headers que a Vercel
  // sobrescreve. A origem fixa só existe fora de preview/produção; lá, aceitar
  // header escolhido pelo cliente tornaria o limitador contornável.
  return env.NODE_ENV === "development" ? "local-development" : null;
}

/**
 * Consome uma cota de origem e devolve 429 quando ela acabou.
 *
 * @example
 * const blocked = await enforceRateLimit(request, "ai");
 * if (blocked) return blocked;
 */
export async function enforceRateLimit(
  request: Request,
  policyName: keyof typeof POLICIES,
  traceId = traceIdForRequest(request),
  authenticatedUserId?: string | null,
): Promise<NextResponse | null> {
  const subject = authenticatedUserId ? `account:${authenticatedUserId}` : requestSubject(request);
  if (!subject) {
    return NextResponse.json({ error: "rate_limit_identity_unavailable" }, { status: 503 });
  }

  try {
    const policy = POLICIES[policyName];
    const subjectHash = pseudonymizeRateLimitSubject(subject);
    const { data: result, error } = await supabaseAdmin.rpc("consume_rate_limit", {
      p_bucket: policyName,
      p_subject_hash: subjectHash,
      p_limit: policy.limit,
      p_window_seconds: policy.windowSeconds,
      p_retention_seconds: policy.retentionSeconds,
    });

    if (error || result?.length !== 1) {
      logger.error("rate_limit.unavailable", {
        policy: policyName,
        code: error?.code,
        trace_id: traceId,
      });
      return NextResponse.json({ error: "rate_limit_unavailable" }, { status: 503 });
    }

    const [decision] = result;
    if (decision.allowed) {
      logger.info("rate_limit.decision", {
        policy: policyName,
        outcome: "allowed",
        remaining: decision.remaining,
        trace_id: traceId,
      });
      return null;
    }

    logger.warn("rate_limit.decision", {
      policy: policyName,
      outcome: "denied",
      remaining: decision.remaining,
      retry_after_seconds: decision.retry_after_seconds,
      trace_id: traceId,
    });

    await recordSecurityAuditEvent({
      eventType: "security.rate_limit.denied",
      outcome: "denied",
      resourceType: "rate_limit_policy",
      resourceId: policyName,
      traceId,
    });

    return NextResponse.json(
      { error: "rate_limit_exceeded" },
      {
        status: 429,
        headers: {
          "Retry-After": String(decision.retry_after_seconds),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  } catch (error) {
    logger.error("rate_limit.unavailable", {
      policy: policyName,
      error,
      trace_id: traceId,
    });
    return NextResponse.json({ error: "rate_limit_unavailable" }, { status: 503 });
  }
}
