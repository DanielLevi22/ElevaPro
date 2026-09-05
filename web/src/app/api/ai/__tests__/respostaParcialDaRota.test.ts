import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SseEvent } from "@/modules/ai/types";

/**
 * O que sobra na conversa quando o turno não chega ao fim.
 *
 * A resposta só ia para o banco depois de o turno inteiro terminar, e a
 * pergunta já estava salva desde o começo. Quem perdia a conexão reabria a
 * conversa e via o que perguntou com silêncio embaixo — e o turno seguinte lia
 * esse histórico e concluía que o assistente não tinha respondido.
 */

/** O que o gerador do turno emite antes de quebrar (ou não). */
let quebrarDepoisDe: number | null;
/** As mensagens que foram parar no banco, na ordem. */
let gravadas: Array<{ papel: string; conteudo: string; metadata: unknown }>;

vi.mock("@/lib/api-auth", () => ({
  authorizeLinkedSpecialist: async () => ({
    ok: true,
    caller: { id: "esp-1", accountType: "specialist" },
  }),
}));

vi.mock("@/modules/ai/services/chatService", () => ({
  getOrCreateSession: async () => "sessao-1",
  sessionOwnedBy: async () => "sessao-1",
  getSessionMessages: async () => [],
  savePeriodization: async () => "periodizacao-1",
  updateSessionState: async () => undefined,
  phaseOwnedBy: async () => ({ id: "fase-1" }),
  saveMessage: async (
    _sessao: string,
    papel: string,
    conteudo: string,
    metadata?: Record<string, unknown>,
  ) => {
    gravadas.push({ papel, conteudo, metadata: metadata ?? {} });
    return "msg-1";
  },
  updateMessage: async (_id: string, conteudo: string, metadata?: Record<string, unknown>) => {
    gravadas.push({ papel: "assistant", conteudo, metadata: metadata ?? {} });
  },
}));

vi.mock("@/modules/ai/services/contextLoader", () => ({
  loadStudentContext: async () => ({}),
  formatContextForPrompt: () => "contexto",
}));

vi.mock("@/modules/ai/services/bodyScanContext", () => ({
  formatBodyScanIndex: async () => "",
  queryBodyScan: async () => "{}",
}));

vi.mock("@/modules/ai/services/conversationTitle", () => ({
  definirTituloProvisorio: async () => undefined,
  nomearConversa: async () => undefined,
}));

vi.mock("@/modules/ai/services/exerciseCatalog", () => ({
  queryExercises: async () => ({ exercises: [], total: 0 }),
  unknownExerciseNames: async () => [],
}));

vi.mock("@/modules/ai/services/workoutOrchestrator", () => ({
  async *runWorkoutOrchestrator(): AsyncGenerator<SseEvent> {
    const pedacos = ["Vou montar ", "a periodização ", "em três fases."];

    for (const [i, pedaco] of pedacos.entries()) {
      if (quebrarDepoisDe === i) throw new Error("o turno caiu no meio");
      yield { type: "text", content: pedaco };
    }
    yield { type: "done" };
  },
}));

const { POST } = await import("../chat/[studentId]/route");

function pedido(): NextRequest {
  return new Request("https://x/api", {
    method: "POST",
    headers: { authorization: "Bearer t", "content-type": "application/json" },
    body: JSON.stringify({ message: "monta a periodização" }),
  }) as unknown as NextRequest;
}

const daAssistente = () => gravadas.filter((m) => m.papel === "assistant");

beforeEach(() => {
  quebrarDepoisDe = null;
  gravadas = [];
});

describe("a resposta que sobra na conversa", () => {
  it("turno inteiro grava a resposta completa, sem marca de incompleta", async () => {
    const resposta = await POST(pedido(), { params: Promise.resolve({ studentId: "aluno-1" }) });
    await resposta.text();

    expect(daAssistente()).toEqual([
      { papel: "assistant", conteudo: "Vou montar a periodização em três fases.", metadata: {} },
    ]);
  });

  // O caso que a issue existe para cobrir: sem isto, a pergunta ficava salva e
  // a resposta não.
  it("turno que quebra no meio deixa gravado o que já tinha sido dito", async () => {
    quebrarDepoisDe = 2;

    const resposta = await POST(pedido(), { params: Promise.resolve({ studentId: "aluno-1" }) });
    await resposta.text();

    expect(daAssistente()).toEqual([
      {
        papel: "assistant",
        conteudo: "Vou montar a periodização ",
        metadata: { incompleta: true },
      },
    ]);
  });

  // A marca é para a tela e para o turno seguinte: continuar em cima de meia
  // resposta como se fosse inteira é como o assistente se contradiz.
  it("o que quebrou fica marcado como incompleto, o que terminou não", async () => {
    quebrarDepoisDe = 1;
    await (await POST(pedido(), { params: Promise.resolve({ studentId: "aluno-1" }) })).text();

    expect(daAssistente().at(-1)?.metadata).toEqual({ incompleta: true });

    gravadas = [];
    quebrarDepoisDe = null;
    await (await POST(pedido(), { params: Promise.resolve({ studentId: "aluno-1" }) })).text();

    expect(daAssistente().at(-1)?.metadata).toEqual({});
  });

  // Quebrar antes da primeira palavra não é resposta nenhuma — e mensagem
  // vazia na conversa é pior que mensagem nenhuma.
  it("turno que quebra antes de dizer qualquer coisa não cria mensagem vazia", async () => {
    quebrarDepoisDe = 0;

    await (await POST(pedido(), { params: Promise.resolve({ studentId: "aluno-1" }) })).text();

    expect(daAssistente()).toEqual([]);
    // A pergunta continua salva: é o que o histórico precisa mostrar.
    expect(gravadas.filter((m) => m.papel === "user")).toHaveLength(1);
  });
});
