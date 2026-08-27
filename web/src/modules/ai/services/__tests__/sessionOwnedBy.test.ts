import { beforeEach, describe, expect, it, vi } from "vitest";

const maybeSingle = vi.fn();
const eq = vi.fn(() => ({ eq, maybeSingle }));
const select = vi.fn(() => ({ eq }));
const from = vi.fn(() => ({ select }));

vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => from(...(args as [])),
  },
}));

const { sessionOwnedBy } = await import("../chatService");

/**
 * A conversa vem do cliente e a rota usa `service_role`, que não consulta RLS.
 * Sem esta guarda, trocar o `sessionId` na requisição lê a conversa de outro
 * especialista sobre qualquer aluno — a mesma classe do IDOR da dívida 27.
 */
describe("sessionOwnedBy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("devolve o id quando a conversa é do aluno e do especialista", async () => {
    maybeSingle.mockResolvedValue({ data: { id: "sess-1" }, error: null });

    await expect(sessionOwnedBy("sess-1", "aluno-1", "espec-1")).resolves.toBe("sess-1");
  });

  it("filtra por aluno E especialista, não só pelo id", async () => {
    maybeSingle.mockResolvedValue({ data: { id: "sess-1" }, error: null });

    await sessionOwnedBy("sess-1", "aluno-1", "espec-1");

    // Filtrar só por `id` devolveria a conversa de qualquer um — é exatamente
    // o que a guarda existe para impedir.
    expect(eq).toHaveBeenCalledWith("id", "sess-1");
    expect(eq).toHaveBeenCalledWith("student_id", "aluno-1");
    expect(eq).toHaveBeenCalledWith("specialist_id", "espec-1");
  });

  it("devolve null quando a conversa é de outro especialista", async () => {
    // O filtro não casa, então o PostgREST devolve vazio — não erro.
    maybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(sessionOwnedBy("sess-de-outro", "aluno-1", "espec-1")).resolves.toBeNull();
  });

  it("lança quando a consulta falha, em vez de virar negativa de acesso", async () => {
    // Engolir aqui faria falha de banco parecer "não é dono", e o chamador
    // abriria uma conversa nova sem motivo — perdendo a que existia de vista.
    maybeSingle.mockResolvedValue({ data: null, error: { message: "boom" } });

    await expect(sessionOwnedBy("sess-1", "aluno-1", "espec-1")).rejects.toBeTruthy();
  });
});
