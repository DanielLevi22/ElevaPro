import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth } = vi.hoisted(() => ({
  auth: {
    getClaims: vi.fn(),
    registerPasskey: vi.fn(),
    signInWithPasskey: vi.fn(),
    mfa: { listFactors: vi.fn(), getAuthenticatorAssuranceLevel: vi.fn() },
    passkey: { list: vi.fn(), update: vi.fn(), delete: vi.fn() },
  },
}));
vi.mock("@elevapro/supabase", () => ({ supabase: { auth } }));

import {
  hasCurrentPrivilegedProof,
  hasLegacyTotpFactor,
  listPasskeys,
  registerPasskey,
  removePasskey,
  renamePasskey,
  signInWithPasskey,
} from "./passkey.service";

describe("passkey.service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    delete process.env.NEXT_PUBLIC_PASSKEY_ENABLED;
    auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: "aal2" },
      error: null,
    });
    auth.mfa.listFactors.mockResolvedValue({
      data: { all: [{ factor_type: "totp", status: "verified" }] },
      error: null,
    });
  });

  it("nega acesso de senha aal1 apesar de haver uma Passkey cadastrada", async () => {
    auth.getClaims.mockResolvedValue({
      data: { claims: { aal: "aal1", amr: [{ method: "password" }] } },
    });
    await expect(hasCurrentPrivilegedProof()).resolves.toBe(false);
  });

  it("aceita somente a prova Passkey da sessão atual", async () => {
    auth.getClaims.mockResolvedValue({
      data: { claims: { aal: "aal1", amr: [{ method: "passkey" }] } },
    });
    await expect(hasCurrentPrivilegedProof()).resolves.toBe(true);
  });

  it("na interface habilitada, não aceita continuar só com TOTP", async () => {
    process.env.NEXT_PUBLIC_PASSKEY_ENABLED = "true";
    auth.getClaims.mockResolvedValue({
      data: { claims: { aal: "aal2", amr: [{ method: "totp" }] } },
    });
    await expect(hasCurrentPrivilegedProof()).resolves.toBe(false);
  });

  it("nega Passkey sem fator TOTP verificado para o cadastro", async () => {
    auth.getClaims.mockResolvedValue({
      data: { claims: { aal: "aal1", amr: [{ method: "passkey" }] } },
    });
    auth.mfa.listFactors.mockResolvedValue({ data: { all: [] }, error: null });
    await expect(hasCurrentPrivilegedProof()).resolves.toBe(false);
  });

  it("não conclui cadastro nem login se o Auth rejeitar a cerimônia", async () => {
    auth.registerPasskey.mockResolvedValue({ error: new Error("cadastro recusado") });
    auth.signInWithPasskey.mockResolvedValue({ error: new Error("login recusado") });
    await expect(registerPasskey()).rejects.toThrow("cadastro recusado");
    await expect(signInWithPasskey()).rejects.toThrow("login recusado");
  });

  it("não cadastra Passkey com uma sessão apenas de senha", async () => {
    auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: "aal1" },
      error: null,
    });
    await expect(registerPasskey()).rejects.toThrow("Confirme o código");
    expect(auth.registerPasskey).not.toHaveBeenCalled();
  });

  it("exibe código legado apenas com fator TOTP verificado", async () => {
    auth.mfa.listFactors.mockResolvedValue({
      data: { all: [{ factor_type: "totp", status: "unverified" }] },
    });
    await expect(hasLegacyTotpFactor()).resolves.toBe(false);
  });

  it("lista e renomeia apenas credenciais da conta", async () => {
    auth.passkey.list.mockResolvedValue({ data: [{ id: "aparelho-1", created_at: "2026-09-28" }] });
    auth.passkey.update.mockResolvedValue({ error: null });
    await expect(listPasskeys()).resolves.toHaveLength(1);
    await renamePasskey("aparelho-1", " Meu telefone ");
    expect(auth.passkey.update).toHaveBeenCalledWith({
      passkeyId: "aparelho-1",
      friendlyName: "Meu telefone",
    });
  });

  it("não remove a última Passkey nem uma credencial desconhecida", async () => {
    auth.passkey.list.mockResolvedValue({ data: [{ id: "aparelho-1" }] });
    await expect(removePasskey("aparelho-1")).rejects.toThrow("Cadastre outro aparelho");
    auth.passkey.list.mockResolvedValue({ data: [{ id: "aparelho-1" }, { id: "aparelho-2" }] });
    await expect(removePasskey("outro")).rejects.toThrow("não pertence");
    expect(auth.passkey.delete).not.toHaveBeenCalled();
  });

  it("remove a credencial selecionada quando há outro aparelho", async () => {
    auth.passkey.list.mockResolvedValue({ data: [{ id: "aparelho-1" }, { id: "aparelho-2" }] });
    auth.passkey.delete.mockResolvedValue({ error: null });
    await removePasskey("aparelho-1");
    expect(auth.passkey.delete).toHaveBeenCalledWith({ passkeyId: "aparelho-1" });
  });
});
