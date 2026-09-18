import { beforeEach, describe, expect, it, vi } from "vitest";

const { mfa } = vi.hoisted(() => ({
  mfa: {
    enroll: vi.fn(),
    getAuthenticatorAssuranceLevel: vi.fn(),
    listFactors: vi.fn(),
    challenge: vi.fn(),
    verify: vi.fn(),
  },
}));

vi.mock("@elevapro/supabase", () => ({ supabase: { auth: { mfa } } }));

import { beginTotpChallenge, hasCurrentMfaAssurance, verifyTotp } from "./mfa.service";

describe("mfa.service", () => {
  beforeEach(() => vi.resetAllMocks());

  it("reutiliza fator confirmado sem expor QR ou criar outro segredo", async () => {
    mfa.listFactors.mockResolvedValue({ data: { totp: [{ id: "factor-1", status: "verified" }] } });

    await expect(beginTotpChallenge()).resolves.toEqual({ factorId: "factor-1" });
    expect(mfa.enroll).not.toHaveBeenCalled();
  });

  it("inscreve um fator novo quando não há autenticador confirmado", async () => {
    mfa.listFactors.mockResolvedValue({ data: { totp: [] } });
    mfa.enroll.mockResolvedValue({
      data: { id: "factor-new", totp: { qr_code: "data:image/svg+xml,qr" } },
      error: null,
    });

    await expect(beginTotpChallenge()).resolves.toEqual({
      factorId: "factor-new",
      qrCode: "data:image/svg+xml,qr",
    });
  });

  it("só considera AAL2 como sessão reforçada", async () => {
    mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({ data: { currentLevel: "aal1" } });
    await expect(hasCurrentMfaAssurance()).resolves.toBe(false);
  });

  it("não confirma código quando o desafio do Supabase falha", async () => {
    mfa.challenge.mockResolvedValue({ error: new Error("desafio recusado") });

    await expect(verifyTotp("factor-1", "123456")).rejects.toThrow("desafio recusado");
    expect(mfa.verify).not.toHaveBeenCalled();
  });

  it("confirma o código somente no desafio criado para o fator", async () => {
    mfa.challenge.mockResolvedValue({ data: { id: "challenge-1" }, error: null });
    mfa.verify.mockResolvedValue({ error: null });

    await expect(verifyTotp("factor-1", "123456")).resolves.toBeUndefined();
    expect(mfa.verify).toHaveBeenCalledWith({
      factorId: "factor-1",
      challengeId: "challenge-1",
      code: "123456",
    });
  });
});
