import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * "Aluno não encontrado" era dito no instante em que ainda não dava para saber.
 *
 * A consulta só é habilitada depois que `getUser` responde, e consulta
 * desabilitada não está carregando: o React Query reporta `isLoading: false`
 * com `data` vazio. A tela de detalhe procura o aluno nessa lista vazia,
 * conclui ausência e mostra o botão de voltar — para um aluno que existe.
 */

let usuario: { id: string } | null;
let alunos: { id: string; full_name: string }[];
/** Resolve o `getUser` só quando o teste mandar, para observar o intervalo. */
let liberarUsuario: () => void;

vi.mock("@elevapro/supabase", () => ({
  supabase: {
    auth: {
      getUser: () =>
        new Promise((resolve) => {
          liberarUsuario = () => resolve({ data: { user: usuario } });
        }),
    },
  },
}));

vi.mock("@elevapro/shared", () => ({
  createStudentsService: () => ({
    fetchStudents: async () => ({ students: alunos, total: alunos.length }),
  }),
}));

const { useStudents } = await import("../useStudents");

function montar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderHook(() => useStudents(), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
}

beforeEach(() => {
  usuario = { id: "esp-1" };
  alunos = [{ id: "aluno-1", full_name: "João" }];
});

describe("useStudents", () => {
  // O defeito: aqui `isLoading` era `false` e `data` era `[]`, e a tela de
  // detalhe concluía que o aluno não existe.
  it("continua carregando enquanto não se sabe quem é o especialista", () => {
    const { result } = montar();

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data ?? []).toEqual([]);
  });

  it("entrega os alunos depois que a autenticação responde", async () => {
    const { result } = montar();

    liberarUsuario();

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(alunos);
  });

  // Lista vazia de verdade continua sendo lista vazia: a espera não pode virar
  // eterna para quem ainda não tem aluno nenhum.
  it("para de carregar mesmo quando o especialista não tem aluno", async () => {
    alunos = [];
    const { result } = montar();

    liberarUsuario();

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual([]);
  });
});
