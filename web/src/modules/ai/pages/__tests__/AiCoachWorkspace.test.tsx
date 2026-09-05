import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ChatSessionSummary } from "../../types";

/**
 * Qual conversa está aberta.
 *
 * O id e o módulo viviam em dois estados separados, e podiam discordar: o id
 * apontava para a conversa de treino e o módulo dizia `nutrition`, então a tela
 * renderizava o chat de nutrição carregando a conversa de treino. Acontecia sem
 * ninguém clicar, porque o efeito que escolhe a conversa inicial roda de novo a
 * cada renovação do token do Supabase.
 */

function conversa(over: Partial<ChatSessionSummary> = {}): ChatSessionSummary {
  return {
    id: "treino-1",
    title: "Treino do João",
    module: "workout",
    created_at: "2026-09-01T10:00:00Z",
    updated_at: "2026-09-01T10:00:00Z",
    ...over,
  };
}

/** A de nutrição está no topo: é a mais recente. */
const LISTA: ChatSessionSummary[] = [
  conversa({ id: "nutri-1", title: "Dieta do João", module: "nutrition" }),
  conversa(),
];

let token: string;

vi.mock("next/navigation", () => ({ useParams: () => ({ id: "aluno-1" }) }));
vi.mock("@/shared/hooks/useStudents", () => ({ useStudents: () => ({ data: [] }) }));
vi.mock("@/modules/auth", () => ({
  useAuthStore: (seletor: (estado: unknown) => unknown) =>
    seletor({ session: { access_token: token } }),
}));

// Os chats de verdade abrem stream e buscam histórico: aqui só interessa qual
// dos dois a tela escolheu montar, e com qual conversa.
vi.mock("../../components/AiCoachChat", () => ({
  AiCoachChat: ({ sessionId }: { sessionId: string | null }) => (
    <div data-testid="chat-treino">{sessionId}</div>
  ),
}));
vi.mock("../../components/NutritionCoachChat", () => ({
  NutritionCoachChat: ({ sessionId }: { sessionId: string | null }) => (
    <div data-testid="chat-nutricao">{sessionId}</div>
  ),
}));

const { AiCoachWorkspace } = await import("../AiCoachWorkspace");

async function montar() {
  let utils!: ReturnType<typeof render>;
  await act(async () => {
    utils = render(<AiCoachWorkspace />);
  });
  return utils;
}

/** A linha da conversa na lateral: o primeiro botão com o título é o de abrir. */
function abrir(titulo: RegExp) {
  return screen.getAllByRole("button", { name: titulo })[0];
}

beforeEach(() => {
  token = "token-1";
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ json: async () => ({ sessions: LISTA }) }) as Response),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("conversa aberta", () => {
  it("abre a mais recente, com o módulo dela", async () => {
    await montar();

    await waitFor(() => expect(screen.getByTestId("chat-nutricao")).toHaveTextContent("nutri-1"));
    expect(screen.queryByTestId("chat-treino")).not.toBeInTheDocument();
  });

  // O defeito relatado: token renovado, lista recarregada, e a tela pula para o
  // chat da conversa mais recente enquanto a pessoa estava em outra.
  it("não troca de conversa quando a lista é recarregada", async () => {
    const { rerender } = await montar();
    await waitFor(() => expect(screen.getByTestId("chat-nutricao")).toBeInTheDocument());

    await act(async () => {
      abrir(/Treino do João/).click();
    });
    expect(screen.getByTestId("chat-treino")).toHaveTextContent("treino-1");

    // O Supabase renova o token sozinho: o efeito de escolha roda de novo.
    token = "token-2";
    await act(async () => {
      rerender(<AiCoachWorkspace />);
    });

    expect(screen.getByTestId("chat-treino")).toHaveTextContent("treino-1");
    expect(screen.queryByTestId("chat-nutricao")).not.toBeInTheDocument();
  });

  it("id e módulo andam sempre juntos", async () => {
    await montar();
    await waitFor(() => expect(screen.getByTestId("chat-nutricao")).toBeInTheDocument());

    await act(async () => {
      abrir(/Treino do João/).click();
    });

    // O chat de nutrição não pode sobreviver mostrando a conversa de treino.
    expect(screen.queryByTestId("chat-nutricao")).not.toBeInTheDocument();
    expect(screen.getByTestId("chat-treino")).toHaveTextContent("treino-1");
  });
});
