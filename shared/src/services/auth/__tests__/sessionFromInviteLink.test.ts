import { describe, expect, it, vi } from "vitest";
import { criarSupabaseFake } from "../../__tests__/supabaseFake";
import { createAuthService } from "../auth.service";

/**
 * A sessão que o link do convite traz (#359).
 *
 * O convite é gerado no servidor e chega no fluxo implícito — tokens depois do
 * `#`. O cliente do web é PKCE e recusa essa URL sozinho; sem este passo a tela
 * de senha abria sem sessão e o Auth respondia "Auth session missing!".
 */

const BASE = "http://localhost:3000/auth/reset-password";

function servico(auth: Record<string, unknown>) {
  const { supabase } = criarSupabaseFake({}, { auth });
  return createAuthService(supabase);
}

describe("authService.sessionFromInviteLink", () => {
  it("cria a sessão com os tokens do fragmento do link", async () => {
    const setSession = vi.fn(async () => ({ data: { session: {} }, error: null }));

    const resultado = await servico({ setSession }).sessionFromInviteLink(
      `${BASE}#access_token=acesso-1&refresh_token=renova-1&type=invite`,
    );

    expect(resultado).toEqual({ success: true });
    expect(setSession).toHaveBeenCalledWith({
      access_token: "acesso-1",
      refresh_token: "renova-1",
    });
  });

  it("troca o código quando o link vem no fluxo PKCE", async () => {
    const exchangeCodeForSession = vi.fn(async () => ({ data: { session: {} }, error: null }));

    const resultado = await servico({ exchangeCodeForSession }).sessionFromInviteLink(
      `${BASE}?code=codigo-1`,
    );

    expect(resultado).toEqual({ success: true });
    expect(exchangeCodeForSession).toHaveBeenCalledWith("codigo-1");
  });

  it("devolve o motivo quando o link chega com erro, como o expirado", async () => {
    const setSession = vi.fn();

    const resultado = await servico({ setSession }).sessionFromInviteLink(
      `${BASE}#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired`,
    );

    expect(resultado).toEqual({
      success: false,
      error: "Email link is invalid or has expired",
    });
    expect(setSession).not.toHaveBeenCalled();
  });

  it("falha sem chamar o Auth quando o link não traz sessão", async () => {
    const setSession = vi.fn();
    const exchangeCodeForSession = vi.fn();

    const resultado = await servico({ setSession, exchangeCodeForSession }).sessionFromInviteLink(
      BASE,
    );

    expect(resultado.success).toBe(false);
    expect(setSession).not.toHaveBeenCalled();
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("repassa a recusa do Auth a um token adulterado", async () => {
    const setSession = vi.fn(async () => ({
      data: { session: null },
      error: { message: "Invalid JWT" },
    }));

    const resultado = await servico({ setSession }).sessionFromInviteLink(
      `${BASE}#access_token=forjado&refresh_token=forjado`,
    );

    expect(resultado).toEqual({ success: false, error: "Invalid JWT" });
  });
});
