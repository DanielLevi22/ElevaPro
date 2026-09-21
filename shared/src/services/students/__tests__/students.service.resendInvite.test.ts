import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStudentsService } from "../students.service";

function supabaseWithSession(accessToken: string | null): SupabaseClient {
  return {
    auth: {
      getSession: async () => ({
        data: { session: accessToken ? { access_token: accessToken } : null },
      }),
    },
  } as unknown as SupabaseClient;
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("studentsService.resendInvite", () => {
  it("reenvia o convite pelo BFF com o token da sessão", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });

    const service = createStudentsService(supabaseWithSession("token-abc"));
    const result = await service.resendInvite("aluno-9");

    expect(result).toEqual({ success: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/students/aluno-9/resend-invite");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer token-abc");
  });

  it("prefixa a URL com a base do BFF quando informada", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });

    const service = createStudentsService(supabaseWithSession("token-abc"), "https://app.exemplo");
    await service.resendInvite("aluno-9");

    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://app.exemplo/api/students/aluno-9/resend-invite",
    );
  });

  it("devolve a mensagem de erro da rota", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Este aluno já aceitou o convite." }),
    });

    const service = createStudentsService(supabaseWithSession("token-abc"));
    expect(await service.resendInvite("aluno-9")).toEqual({
      success: false,
      error: "Este aluno já aceitou o convite.",
    });
  });

  it("recusa sem sessão, sem chamar a rota", async () => {
    const service = createStudentsService(supabaseWithSession(null));

    expect(await service.resendInvite("aluno-9")).toEqual({
      success: false,
      error: "Usuário não autenticado",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
