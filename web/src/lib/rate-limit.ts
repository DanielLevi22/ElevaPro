import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

type RateLimitPolicy = {
  limit: number;
  windowSeconds: number;
  retentionSeconds: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retry_after_seconds: number;
};

const POLICIES = {
  ai: { limit: 20, windowSeconds: 60, retentionSeconds: 3600 },
  registration: { limit: 5, windowSeconds: 3600, retentionSeconds: 86400 },
} as const satisfies Record<string, RateLimitPolicy>;

function rateLimitKey(env: NodeJS.ProcessEnv = process.env): string {
  const key = env.RATE_LIMIT_HMAC_KEY?.trim();
  if (!key || key.length < 32 || key.includes("PREENCHER")) {
    throw new Error("RATE_LIMIT_HMAC_KEY must contain at least 32 characters");
  }
  return key;
}

/** Cria um identificador estável sem reter a origem em texto claro. */
export function pseudonymizeRateLimitSubject(subject: string, key = rateLimitKey()): string {
  return createHmac("sha256", key).update(subject).digest("hex");
}

function requestSubject(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const origin = forwarded || realIp;
  return origin ? `ip:${origin}` : null;
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
): Promise<NextResponse | null> {
  const subject = requestSubject(request);
  if (!subject) {
    return NextResponse.json({ error: "rate_limit_identity_unavailable" }, { status: 503 });
  }

  try {
    const policy = POLICIES[policyName];
    const subjectHash = pseudonymizeRateLimitSubject(subject);
    const { data: result, error } = await supabaseAdmin.rpc(
      "consume_rate_limit" as never,
      {
        p_bucket: policyName,
        p_subject_hash: subjectHash,
        p_limit: policy.limit,
        p_window_seconds: policy.windowSeconds,
        p_retention_seconds: policy.retentionSeconds,
      } as never,
    );

    const responseData: unknown = result;
    if (error || !Array.isArray(responseData) || responseData.length !== 1) {
      console.error("[rate-limit] unavailable", { policyName, code: error?.code });
      return NextResponse.json({ error: "rate_limit_unavailable" }, { status: 503 });
    }

    const decision = responseData[0] as RateLimitResult;
    if (decision.allowed) return null;

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
    console.error("[rate-limit] unavailable", {
      policyName,
      error: error instanceof Error ? error.name : "unknown",
    });
    return NextResponse.json({ error: "rate_limit_unavailable" }, { status: 503 });
  }
}
