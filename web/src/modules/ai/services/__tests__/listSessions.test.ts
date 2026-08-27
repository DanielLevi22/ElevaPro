import { beforeEach, describe, expect, it, vi } from "vitest";

const order = vi.fn();
const chain = {
  eq: vi.fn((_coluna: string, _valor: unknown) => chain),
  is: vi.fn((_coluna: string, _valor: unknown) => chain),
  order,
};
const select = vi.fn(() => chain);
const from = vi.fn(() => ({ select }));

vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => from(...(args as [])),
  },
}));

const { listSessions } = await import("../chatService");

/** Os filtros por coluna que a consulta aplicou, sem os de dono. */
function filtrosDeModulo(): unknown[] {
  return chain.eq.mock.calls.filter(([coluna]) => coluna === "module").map(([, valor]) => valor);
}

describe("listSessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    order.mockResolvedValue({ data: [], error: null });
  });

  it("pede a coluna module", async () => {
    await listSessions("aluno-1", "espec-1", "all");

    // A lateral mistura treino e nutrição: sem esta coluna a linha não sabe
    // qual ícone mostrar nem qual coach abrir, e o clique abre o errado.
    expect(select).toHaveBeenCalledWith(expect.stringContaining("module"));
  });

  it("com 'all', não filtra por módulo", async () => {
    await listSessions("aluno-1", "espec-1", "all");

    expect(filtrosDeModulo()).toEqual([]);
  });

  it("com um módulo, filtra por ele", async () => {
    await listSessions("aluno-1", "espec-1", "nutrition");

    expect(filtrosDeModulo()).toEqual(["nutrition"]);
  });

  it("continua restrito ao aluno e ao especialista, mesmo com 'all'", async () => {
    await listSessions("aluno-1", "espec-1", "all");

    // Listar os dois módulos alarga o que volta; alargar o dono seria expor a
    // conversa de outro especialista sobre o mesmo aluno.
    expect(chain.eq).toHaveBeenCalledWith("student_id", "aluno-1");
    expect(chain.eq).toHaveBeenCalledWith("specialist_id", "espec-1");
  });

  it("não devolve conversa arquivada", async () => {
    await listSessions("aluno-1", "espec-1", "all");

    expect(chain.is).toHaveBeenCalledWith("archived_at", null);
  });

  it("lança quando a consulta falha, em vez de devolver lista vazia", async () => {
    // Lista vazia por falha é indistinguível de "não há conversas" — o padrão
    // que já escondeu defeito neste projeto mais de uma vez.
    order.mockResolvedValue({ data: null, error: { message: "boom" } });

    await expect(listSessions("aluno-1", "espec-1", "all")).rejects.toBeTruthy();
  });
});
