import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
      // com a proposta enquanto a conversa anda. `ok` precisa vir: sem ele o
      // salvar cai no ramo de erro, e a aprovação nunca chega ao sucesso.
      return {
        ok: true,
        body: null,
        json: async () => ({ saved: [{ id: "t1", title: "Treino A — Full Body Base" }] }),
      } as Response;
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Stream SSE que o teste alimenta pedaço a pedaço, como a rede faria. */
function streamManual() {
  const encoder = new TextEncoder();
  let controlador!: ReadableStreamDefaultController<Uint8Array>;
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      controlador = c;
    },
  });
  return {
    body,
    enviar: (evento: unknown) =>
      controlador.enqueue(
        encoder.encode(`data: ${JSON.stringify(evento)}

`),
      ),
    fechar: () => controlador.close(),
  };
}

async function enviarMensagem(stream: { body: ReadableStream<Uint8Array> }) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init?: RequestInit) =>
      init?.method === "POST"
        ? ({ body: stream.body } as Response)
        : ({ json: async () => aoAbrir } as Response),
    ),
  );

  await act(async () => {
    fireEvent.change(screen.getByPlaceholderText(/Digite uma mensagem/), {
      target: { value: "monta os treinos" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar mensagem" }));
  });
}

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
      expect(screen.getByRole("region", { name: /Proposta de treinos/ })).toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: /Aprovar e Salvar Todos/ })).toBeInTheDocument();
  });

  // Sem a fase no cabeçalho, a proposta da fase 1 e a da fase 4 são a mesma
  // frase — e um cartão que não trocou fica indistinguível de um que trocou.
  it("diz no cabeçalho de qual fase é a proposta", async () => {
    aoAbrir = { ...aoAbrir, workoutProposal: PROPOSTA, savedWorkoutTitles: [] };
    await montar();

    await waitFor(() =>
      expect(
        screen.getByRole("region", { name: /Proposta de treinos · Base Aeróbia e Resistência/ }),
      ).toBeInTheDocument(),
    );
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
      expect(screen.getByRole("region", { name: /Proposta de treinos/ })).toBeInTheDocument(),
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

  // Aprovar recolhe o painel, e o painel não desmonta entre uma proposta e a
  // seguinte: a proposta da fase 2 chegava para um painel já fechado, e a
  // leitura era "ficou o cartão da fase 1".
  it("reabre o painel quando chega a proposta da fase seguinte", async () => {
    aoAbrir = {
      ...aoAbrir,
      workoutProposal: PROPOSTA,
      savedWorkoutTitles: ["Treino A — Full Body Base"],
    };
    await montar();
    await waitFor(() => expect(screen.getByText("· salvo")).toBeInTheDocument());
    // Resolvida abre recolhida: o cartão não está na tela.
    expect(
      screen.queryByRole("button", { name: /Aprovar e Salvar Todos/ }),
    ).not.toBeInTheDocument();

    const stream = streamManual();
    await enviarMensagem(stream);
    await act(async () => {
      stream.enviar({
        type: "workout_proposal",
        data: { ...PROPOSTA, phase_id: "fase-2", phase_name: "Hipertrofia Base" },
      });
      stream.fechar();
    });

    await waitFor(() =>
      expect(
        screen.getByRole("region", { name: /Proposta de treinos · Hipertrofia Base/ }),
      ).toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: /Aprovar e Salvar Todos/ })).toBeInTheDocument();
  });

  // A conversa parava na fase aprovada. Faltando três das quatro, ninguém
  // avisava — o especialista é que descobria e digitava.
  it("segue a conversa sozinha depois de aprovar os treinos da fase", async () => {
    aoAbrir = { ...aoAbrir, workoutProposal: PROPOSTA, savedWorkoutTitles: [] };
    await montar();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Aprovar e Salvar Todos/ })).toBeInTheDocument(),
    );

    const chamadas = () => (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
    const antes = chamadas().length;

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Aprovar e Salvar Todos/ }));
    });

    await waitFor(() => {
      const turno = chamadas()
        .slice(antes)
        .find(([url, init]) => url === "/api/ai/chat/aluno-1" && init?.method === "POST");
      expect(turno).toBeDefined();
      expect(JSON.parse((turno?.[1] as RequestInit).body as string).message).toContain(
        PROPOSTA.phase_name,
      );
    });
  });

  // Enquanto o cartão era o último item da lista, ele era limpo a cada envio.
  it("a proposta pendente continua na tela depois de outra mensagem", async () => {
    aoAbrir = { ...aoAbrir, workoutProposal: PROPOSTA, savedWorkoutTitles: [] };
    const { rerender } = await montar();

    await waitFor(() =>
      expect(screen.getByRole("region", { name: /Proposta de treinos/ })).toBeInTheDocument(),
    );

    rerender(chat);

    expect(screen.getByRole("region", { name: /Proposta de treinos/ })).toBeInTheDocument();
  });
});

/**
 * A espera deixando de ser opaca.
 *
 * Montar a proposta leva de 15 a 20 segundos dentro do bloco da ferramenta.
 * Antes, a tela mostrava um rótulo girando o tempo todo; agora ela monta junto
 * com o modelo — e some assim que o cartão de verdade chega.
 */
describe("proposta sendo escrita", () => {
  it("mostra o que já chegou da proposta, e troca pelo cartão quando ele chega", async () => {
    await montar();
    await waitFor(() => expect(screen.getByPlaceholderText(/Digite uma mensagem/)).toBeVisible());

    const stream = streamManual();
    await enviarMensagem(stream);

    await act(async () => {
      stream.enviar({
        type: "proposal_building",
        tool: "propose_workouts",
        partial: '{"phase_name":"Base","workouts":[{"title":"Treino A"',
      });
    });

    await waitFor(() =>
      expect(screen.getByRole("region", { name: /sendo montada/ })).toBeInTheDocument(),
    );
    expect(screen.getByText("Treino A")).toBeInTheDocument();
    // Não há como aprovar o que ainda está sendo escrito.
    expect(screen.queryByRole("button", { name: /Aprovar e Salvar/ })).not.toBeInTheDocument();

    await act(async () => {
      stream.enviar({ type: "workout_proposal", data: PROPOSTA });
      stream.enviar({ type: "done" });
      stream.fechar();
    });

    await waitFor(() =>
      expect(screen.getByRole("region", { name: /Proposta de treinos/ })).toBeInTheDocument(),
    );
    expect(screen.queryByRole("region", { name: /sendo montada/ })).not.toBeInTheDocument();
  });

  // Meio exercício não vira exercício com série indefinida na tela.
  it("não mostra o exercício cujo nome ainda está pela metade", async () => {
    await montar();
    await waitFor(() => expect(screen.getByPlaceholderText(/Digite uma mensagem/)).toBeVisible());

    const stream = streamManual();
    await enviarMensagem(stream);

    await act(async () => {
      stream.enviar({
        type: "proposal_building",
        tool: "propose_workouts",
        partial:
          '{"workouts":[{"title":"Treino A","exercises":[{"exercise_name":"Supino","sets":3,"reps":"8-12"},{"exercise_name":"Agach',
      });
    });

    await waitFor(() => expect(screen.getByText("Supino")).toBeInTheDocument());
    expect(screen.queryByText(/Agach/)).not.toBeInTheDocument();

    await act(async () => {
      stream.enviar({ type: "done" });
      stream.fechar();
    });
  });
});
