import { beforeEach, describe, expect, it, vi } from "vitest";

const { mfa } = vi.hoisted(() => ({
  mfa: {
    enroll: vi.fn(),
    getAuthenticatorAssuranceLevel: vi.fn(),
    listFactors: vi.fn(),
    unenroll: vi.fn(),
    challenge: vi.fn(),
    verify: vi.fn(),
  },
}));

vi.mock("@elevapro/supabase", () => ({ supabase: { auth: { mfa } } }));

import { beginTotpChallenge, hasCurrentMfaAssurance, verifyTotp } from "./mfa.service";

describe("mfa.service", () => {
  beforeEach(() => vi.resetAllMocks());

  it("reutiliza fator confirmado sem expor QR ou criar outro segredo", async () => {
    mfa.listFactors.mockResolvedValue({
      data: { all: [{ id: "factor-1", factor_type: "totp", status: "verified" }] },
    });

    await expect(beginTotpChallenge()).resolves.toEqual({ factorId: "factor-1" });
    expect(mfa.enroll).not.toHaveBeenCalled();
  });

  it("inscreve um fator novo quando não há autenticador confirmado", async () => {
    mfa.listFactors.mockResolvedValue({ data: { all: [] } });
    mfa.enroll.mockResolvedValue({
      data: { id: "factor-new", totp: { qr_code: "data:image/svg+xml,qr", secret: "SECRET-123" } },
      error: null,
    });

    await expect(beginTotpChallenge()).resolves.toEqual({
      factorId: "factor-new",
      qrCode: "data:image/svg+xml,qr",
      secret: "SECRET-123",
    });
  });

  it("recupera uma inscrição interrompida gerando um novo QR Code", async () => {
    mfa.listFactors.mockResolvedValue({
      data: { all: [{ id: "pending-1", factor_type: "totp", status: "unverified" }] },
    });
    mfa.unenroll.mockResolvedValue({ error: null });
    mfa.enroll.mockResolvedValue({
      data: { id: "factor-new", totp: { qr_code: "data:image/svg+xml,qr" } },
      error: null,
    });

    await expect(beginTotpChallenge()).resolves.toMatchObject({ factorId: "factor-new" });
  });

  it("explica quando o provedor TOTP está desabilitado", async () => {
    mfa.listFactors.mockResolvedValue({ data: { all: [] } });
    mfa.enroll.mockResolvedValue({
      data: null,
      error: { code: "mfa_totp_enroll_not_enabled", message: "TOTP enrollment is disabled" },
    });

    await expect(beginTotpChallenge()).rejects.toThrow(
      "A autenticação em duas etapas está indisponível no momento.",
    );
  });

  it("só considera AAL2 como sessão reforçada", async () => {
    mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({ data: { currentLevel: "aal1" } });
    await expect(hasCurrentMfaAssurance()).resolves.toBe(false);
  });

  it("propaga falha ao iniciar a confirmação", async () => {
    mfa.challenge.mockResolvedValue({ error: new Error("desafio recusado") });

    await expect(verifyTotp("factor-1", "123456")).rejects.toThrow("desafio recusado");
  });

  it("recusa código inválido, expirado ou reutilizado sem revelar o motivo", async () => {
    mfa.challenge.mockResolvedValue({ data: { id: "challenge-1" }, error: null });
    mfa.verify.mockResolvedValue({ error: new Error("verification rejected") });

    await expect(verifyTotp("factor-1", "123456")).rejects.toThrow("verification rejected");
  });

  it("confirma um código válido", async () => {
    mfa.challenge.mockResolvedValue({ data: { id: "challenge-1" }, error: null });
    mfa.verify.mockResolvedValue({ error: null });

    await expect(verifyTotp("factor-1", "123456")).resolves.toBeUndefined();
  });
});
