import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { criarSupabaseFake } from "../../__tests__/supabaseFake";
import { createAuthService } from "../auth.service";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("authService.completeAccountInvite", () => {
  // ADR-0035: a senha nunca atravessa outra pessoa — mas isso não dispensa a
  // mesma política que vale pro autocadastro. Um link de convite não é motivo
  // pra aceitar senha fraca.
  it("recusa senha fraca sem chamar o Supabase", async () => {
    const updateUser = vi.fn();
    const { supabase } = criarSupabaseFake({}, { auth: { updateUser } });

    const resultado = await createAuthService(supabase).completeAccountInvite("123");

    expect(resultado.success).toBe(false);
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("define a senha definitiva via updateUser", async () => {
    const updateUser = vi.fn(async () => ({ data: { user: { id: "aluno-9" } }, error: null }));
    const { supabase } = criarSupabaseFake(
      {},
      {
        auth: {
          updateUser,
          getSession: async () => ({
            data: { session: { access_token: "token-abc" } },
            error: null,
          }),
        },
      },
    );

    const resultado = await createAuthService(supabase).completeAccountInvite("Senha-Forte-123!");

    expect(resultado).toEqual({ success: true });
    expect(updateUser).toHaveBeenCalledWith({ password: "Senha-Forte-123!" });
  });

  it("devolve o erro do Supabase quando a sessão de convite expirou", async () => {
    const { supabase } = criarSupabaseFake(
      {},
      {
        auth: {
          updateUser: async () => ({ data: null, error: { message: "Auth session missing" } }),
        },
      },
    );

    expect(await createAuthService(supabase).completeAccountInvite("Senha-Forte-123!")).toEqual({
      success: false,
      error: "Auth session missing",
    });
  });

  // A trilha de auditoria é evidência, não requisito de negócio: uma falha de
  // rede ao registrar o evento não pode impedir o aluno de entrar na própria
  // conta com a senha que acabou de criar.
  it("não falha a troca de senha quando o registro de auditoria falha", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    const { supabase } = criarSupabaseFake(
      {},
      {
        auth: {
          updateUser: async () => ({ data: { user: { id: "aluno-9" } }, error: null }),
          getSession: async () => ({
            data: { session: { access_token: "token-abc" } },
            error: null,
          }),
        },
      },
    );

    expect(await createAuthService(supabase).completeAccountInvite("Senha-Forte-123!")).toEqual({
      success: true,
    });
  });

  it("registra o convite aceito com o token da sessão, na URL do BFF", async () => {
    const { supabase } = criarSupabaseFake(
      {},
      {
        auth: {
          updateUser: async () => ({ data: { user: { id: "aluno-9" } }, error: null }),
          getSession: async () => ({
            data: { session: { access_token: "token-abc" } },
            error: null,
          }),
        },
      },
    );

    await createAuthService(supabase, "https://app.exemplo").completeAccountInvite(
      "Senha-Forte-123!",
    );

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://app.exemplo/api/auth/accept-invite");
    expect(init.headers.Authorization).toBe("Bearer token-abc");
  });
});
