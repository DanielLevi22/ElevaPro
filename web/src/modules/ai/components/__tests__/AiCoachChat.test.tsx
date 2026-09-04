import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BulkWorkoutProposal } from "../../types";

/**
 * O que a tela do coach garante sobre a proposta.
 *
 * Cada um destes testes existe por um relato de uso, e é a trava contra ele
 * voltar: a proposta sumia ao reabrir a conversa, sumia ao enviar a próxima
 * mensagem, e era empurrada pelo texto que chegava depois — sempre pelo mesmo
 * motivo, o cartão ser o último item da lista de mensagens.
 */

const PROPOSTA: BulkWorkoutProposal = {
  phase_id: "fase-1",
  phase_name: "Base Aeróbia e Resistência",
  workouts: [
    {
      title: "Treino A — Full Body Base",
      muscle_group: "full body",
      exercises: [{ exercise_name: "Agachamento livre", sets: 3, reps: "15", rest_seconds: 60 }],
    },
  ],
};

vi.mock("@/modules/auth", () => ({
  useAuthStore: (seletor: (estado: unknown) => unknown) =>
    seletor({ session: { access_token: "token" } }),
}));

const { AiCoachChat } = await import("../AiCoachChat");

/** O corpo que o `GET` devolve ao abrir a conversa. */
let aoAbrir: Record<string, unknown>;

const chat = (
  <AiCoachChat
    studentId="aluno-1"
    sessionId="sessao-1"
    onSessionResolved={vi.fn()}
    onConversationChanged={vi.fn()}
  />
);

/** O efeito de abertura busca a conversa: sem `act`, o React avisa que o
 * estado mudou fora dele e o aviso esconde falha de verdade no meio do ruído. */
async function montar() {
  let utils!: ReturnType<typeof render>;
  await act(async () => {
    utils = render(chat);
  });
  return utils;
}

beforeEach(() => {
  localStorage.clear();
  aoAbrir = { sessionId: "sessao-1", messages: [], availability: [], workoutProposal: null };

  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init?: RequestInit) => {
      if (!init || init.method !== "POST") {
        return { json: async () => aoAbrir } as Response;
      }
      // O turno do modelo não interessa aqui: o que importa é o que a tela faz
      // com a proposta enquanto a conversa anda.
      return { body: null, json: async () => ({ saved: [] }) } as Response;
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("proposta na tela do coach", () => {
  it("não mostra painel nenhum quando não há proposta", async () => {
    await montar();

    await waitFor(() => expect(screen.getByPlaceholderText(/Digite uma mensagem/)).toBeVisible());
    expect(screen.queryByRole("region", { name: /Proposta de treinos/ })).not.toBeInTheDocument();
  });

  // Recarregar a página apagava o cartão e o botão de aprovar junto, com a
  // proposta viva no banco.
  it("traz de volta a proposta pendente ao abrir a conversa", async () => {
    aoAbrir = { ...aoAbrir, workoutProposal: PROPOSTA, savedWorkoutTitles: [] };
    await montar();

    await waitFor(() =>
      expect(screen.getByRole("region", { name: "Proposta de treinos" })).toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: /Aprovar e Salvar Todos/ })).toBeInTheDocument();
  });

  // A conversa dizia "✅ treinos aprovados e salvos: A, B, C" e a tela não
  // tinha o cartão que a frase descreve.
  it("traz de volta a proposta já aprovada, marcada como salva", async () => {
    aoAbrir = {
      ...aoAbrir,
      workoutProposal: PROPOSTA,
      savedWorkoutTitles: ["Treino A — Full Body Base"],
    };
    await montar();

    await waitFor(() =>
      expect(screen.getByRole("region", { name: "Proposta de treinos" })).toBeInTheDocument(),
    );
    expect(screen.getByText("· salvo")).toBeInTheDocument();
    // Resolvida não oferece aprovar de novo — salvar duas vezes duplicaria.
    expect(screen.queryByRole("button", { name: /Aprovar e Salvar/ })).not.toBeInTheDocument();
  });

  it("proposta fechada por quem olha não volta na próxima abertura", async () => {
    localStorage.setItem("elevapro:propostas-dispensadas", JSON.stringify(["sessao-1"]));
    aoAbrir = {
      ...aoAbrir,
      workoutProposal: PROPOSTA,
      savedWorkoutTitles: ["Treino A — Full Body Base"],
    };
    await montar();

    await waitFor(() => expect(screen.getByPlaceholderText(/Digite uma mensagem/)).toBeVisible());
    expect(screen.queryByRole("region", { name: /Proposta de treinos/ })).not.toBeInTheDocument();
  });

  // Enquanto o cartão era o último item da lista, ele era limpo a cada envio.
  it("a proposta pendente continua na tela depois de outra mensagem", async () => {
    aoAbrir = { ...aoAbrir, workoutProposal: PROPOSTA, savedWorkoutTitles: [] };
    const { rerender } = await montar();

    await waitFor(() =>
      expect(screen.getByRole("region", { name: "Proposta de treinos" })).toBeInTheDocument(),
    );

    rerender(chat);

    expect(screen.getByRole("region", { name: "Proposta de treinos" })).toBeInTheDocument();
  });
});
