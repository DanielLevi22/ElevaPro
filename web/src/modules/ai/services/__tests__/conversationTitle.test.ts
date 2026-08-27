import { beforeEach, describe, expect, it, vi } from "vitest";

const updateSessionTitle = vi.fn();
const stream = vi.fn();

vi.mock("../chatService", () => ({
  updateSessionTitle: (...args: unknown[]) => updateSessionTitle(...args),
}));

vi.mock("../../ai.config", () => ({
  aiProviders: {
    fast: { stream: (...args: unknown[]) => stream(...args) },
  },
}));

const { definirTituloProvisorio, nomearConversa, tituloProvisorio } = await import(
  "../conversationTitle"
);

/** Um stream de provider que devolve o texto pedido, em pedaços. */
function respondendo(texto: string) {
  return async function* () {
    for (const pedaco of texto.split(" ")) {
      yield { type: "text_delta", content: `${pedaco} ` };
    }
    yield { type: "turn_end", fullContent: [], stopReason: "end_turn" };
  };
}

describe("tituloProvisorio", () => {
  it("mantém a mensagem curta inteira", () => {
    expect(tituloProvisorio("Bloco de força")).toBe("Bloco de força");
  });

  it("corta na palavra, não no meio dela", () => {
    const original = "Preciso montar um bloco de hipertrofia para ele começando semana que vem";
    const titulo = tituloProvisorio(original);
    const semReticencias = titulo.slice(0, -1);

    expect(titulo.endsWith("…")).toBe(true);
    // A palavra onde corta precisa estar inteira: o que vem depois dela no
    // original é o espaço que a fechou. Cortar no caractere produziria
    // "…hipertrof…", pior de ler que a data que este título veio substituir.
    expect(original.startsWith(semReticencias)).toBe(true);
    expect(original[semReticencias.length]).toBe(" ");
  });

  it("achata quebras de linha", () => {
    expect(tituloProvisorio("Bloco\n\n  de   força")).toBe("Bloco de força");
  });
});

describe("definirTituloProvisorio", () => {
  beforeEach(() => vi.clearAllMocks());

  it("grava antes de qualquer chamada ao modelo", async () => {
    await definirTituloProvisorio("sess-1", "Vamos montar um cutting");

    // O definitivo só existe depois da resposta, e é enquanto o modelo responde
    // que a lista é olhada. Sem este, a conversa nova aparece sem nome.
    expect(updateSessionTitle).toHaveBeenCalledWith("sess-1", "Vamos montar um cutting");
    expect(stream).not.toHaveBeenCalled();
  });
});

describe("nomearConversa", () => {
  beforeEach(() => vi.clearAllMocks());

  it("substitui o provisório pelo que o modelo devolveu", async () => {
    stream.mockImplementation(respondendo("Bloco de força de 8 semanas"));

    await nomearConversa("sess-1", "pergunta", "resposta");

    expect(updateSessionTitle).toHaveBeenCalledWith("sess-1", "Bloco de força de 8 semanas");
  });

  it("usa o modelo rápido, não o de raciocínio", async () => {
    stream.mockImplementation(respondendo("Cutting"));

    await nomearConversa("sess-1", "pergunta", "resposta");

    // `aiProviders.fast` é o Haiku que o SYSTEM_MAPPING fixa para tarefa
    // estruturada — "10x mais barato, nunca usar Sonnet aqui". O mock só expõe
    // `fast`, então chamar o outro quebraria aqui.
    expect(stream).toHaveBeenCalledTimes(1);
  });

  it("pede ao modelo que não nomeie a condição de saúde", async () => {
    stream.mockImplementation(respondendo("Bloco de força"));

    await nomearConversa("sess-1", "pergunta", "resposta");

    // O título fica visível o tempo todo na lateral, inclusive para quem passa
    // atrás do especialista. Sem esta instrução, "Hérnia de disco L5" vira
    // cartaz.
    const [{ systemBlocks }] = stream.mock.calls[0] as [{ systemBlocks: { text: string }[] }];
    expect(systemBlocks[0].text).toMatch(/condição de saúde/i);
  });

  it("não derruba a conversa quando a geração falha", async () => {
    stream.mockImplementation(() => {
      throw new Error("modelo fora do ar");
    });

    // A resposta já foi entregue; título é conveniência. Lançar aqui faria a
    // rota devolver erro depois de ter respondido certo.
    await expect(nomearConversa("sess-1", "pergunta", "resposta")).resolves.toBeUndefined();
    expect(updateSessionTitle).not.toHaveBeenCalled();
  });

  it("ignora resposta vazia em vez de apagar o provisório", async () => {
    stream.mockImplementation(respondendo("   "));

    await nomearConversa("sess-1", "pergunta", "resposta");

    expect(updateSessionTitle).not.toHaveBeenCalled();
  });
});
