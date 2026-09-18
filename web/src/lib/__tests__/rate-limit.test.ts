import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock("../supabase-admin", () => ({ supabaseAdmin: { rpc } }));

import { enforceRateLimit, pseudonymizeRateLimitSubject } from "../rate-limit";

const HMAC_KEY = "test-rate-limit-key-with-at-least-thirty-two-characters";
let original: NodeJS.ProcessEnv;

beforeEach(() => {
  original = { ...process.env };
  process.env.RATE_LIMIT_HMAC_KEY = HMAC_KEY;
  rpc.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  process.env = original;
  vi.restoreAllMocks();
});

describe("rate limit", () => {
  it("pseudonimiza a origem de forma estável sem devolvê-la", () => {
    const subject = "ip:203.0.113.7";
    const digest = pseudonymizeRateLimitSubject(subject);

    expect(digest).toMatch(/^[0-9a-f]{64}$/);
    expect(digest).not.toContain(subject);
    expect(digest).toBe(pseudonymizeRateLimitSubject(subject));
  });

  it("consome a cota de IA com o hash da origem, nunca o IP", async () => {
    rpc.mockResolvedValue({
      data: [{ allowed: true, remaining: 19, retry_after_seconds: 42 }],
      error: null,
    });
    const request = new Request("https://elevapro.test/api/ai/coach", {
      headers: {
        "x-vercel-id": "gru1::test",
        "x-vercel-forwarded-for": "203.0.113.7",
      },
    });

    const response = await enforceRateLimit(request, "ai");

    expect(response).toBeNull();
    expect(rpc).toHaveBeenCalledWith("consume_rate_limit", {
      p_bucket: "ai",
      p_subject_hash: pseudonymizeRateLimitSubject("ip:203.0.113.7"),
      p_limit: 20,
      p_window_seconds: 60,
      p_retention_seconds: 3600,
    });
  });

  it("devolve 429 e Retry-After quando a cota acabou", async () => {
    rpc.mockResolvedValue({
      data: [{ allowed: false, remaining: 0, retry_after_seconds: 17 }],
      error: null,
    });
    const request = new Request("https://elevapro.test/api/auth/register", {
      headers: {
        "x-vercel-id": "gru1::test",
        "x-vercel-forwarded-for": "203.0.113.7",
      },
    });

    const response = await enforceRateLimit(request, "registration");

    expect(response?.status).toBe(429);
    expect(response?.headers.get("Retry-After")).toBe("17");
    await expect(response?.json()).resolves.toEqual({ error: "rate_limit_exceeded" });
  });

  it("falha fechada se não há origem confiável", async () => {
    const response = await enforceRateLimit(
      new Request("https://elevapro.test/api/ai/coach"),
      "ai",
    );

    expect(response?.status).toBe(503);
    expect(rpc).not.toHaveBeenCalled();
  });
});
