import { describe, expect, it } from "vitest";
import type {
  AIProvider,
  ContentBlock,
  ProviderStreamEvent,
  SystemBlock,
  ToolDefinition,
} from "../../providers/types";
import type { SseEvent } from "../../types";
import { BaseOrchestrator } from "../base.orchestrator";

/**
 * Quando a tela avisa que o coach está trabalhando.
 *
 * O corte não é entre ler e gravar — é entre trabalhar e escrever. E o momento
 * importa mais que a lista: gerar o JSON de uma proposta de três treinos leva
 * de 15 a 20 segundos, tudo dentro do bloco da ferramenta. Avisar só na
 * execução é avisar quando não há mais o que esperar.
 */

/** Marca deixada por `onToolCall` na linha do tempo, para provar a ordem. */
interface Execucao {
  type: "executou";
  tool: string;
}

type Linha = SseEvent | Execucao;

/**
 * Provider falso que imita o real: nomeia a ferramenta ao começar a montá-la
 * (`content_block_start`) e só depois entrega a chamada pronta.
 */
/** Os blocos de sistema do último turno, para conferir o que o modelo recebeu. */
let blocosRecebidos: SystemBlock[] = [];

function providerFalso(ferramentas: string[], textos: string[] = []): AIProvider {
  let turnos = 0;
  return {
    async *stream(options): AsyncGenerator<ProviderStreamEvent> {
      blocosRecebidos = options.systemBlocks;
      const turno = turnos++;

      for (const pedaco of textos[turno] ? [textos[turno]] : []) {
        yield { type: "text_delta", content: pedaco };
      }

      // Turno seguinte ao das ferramentas: fecha em texto.
      if (turno > 0 || ferramentas.length === 0) {
        yield {
          type: "turn_end",
          fullContent: [{ type: "text", text: textos[turno] ?? "" }] as ContentBlock[],
          stopReason: "end_turn",
        };
        return;
      }

      const blocos = ferramentas.map((name, i) => ({
        type: "tool_use" as const,
        id: `t${i}`,
        name,
        input: {},
      }));

      for (const bloco of blocos) yield { type: "tool_building", name: bloco.name };
      for (const bloco of blocos) {
        yield { type: "tool_use", id: bloco.id, name: bloco.name, input: bloco.input };
      }
      yield {
        type: "turn_end",
        fullContent: blocos as unknown as ContentBlock[],
        stopReason: "tool_use",
      };
    },
  };
}

class OrquestradorDeTeste extends BaseOrchestrator {
  buildSystemBlocks(): SystemBlock[] {
    // Cacheado como nos orquestradores de verdade: é o prefixo que a data não
    // pode invalidar.
    return [{ text: "prompt", cacheControl: true }];
  }
  getTools(): ToolDefinition[] {
    return [];
  }
}

async function linhaDoTempo(ferramentas: string[], textos: string[] = []): Promise<Linha[]> {
  const linha: Linha[] = [];
  const orquestrador = new OrquestradorDeTeste(providerFalso(ferramentas, textos));

  for await (const evento of orquestrador.run({
    userMessage: "vai",
    history: [],
    contextText: "",
    onToolCall: async (name) => {
      linha.push({ type: "executou", tool: name });
      return "{}";
    },
  })) {
    linha.push(evento);
  }
  return linha;
}

const avisos = (linha: Linha[]) => linha.filter((e) => e.type === "tool_start");

describe("aviso de progresso", () => {
  it.each([
    ["propose_workouts", "Montando a proposta de treinos"],
    ["save_periodization", "Salvando a periodização"],
    ["query_exercises", "Consultando o catálogo de exercícios"],
    ["propose_periodization", "Montando a proposta de periodização"],
  ])("anuncia %s com o rótulo da ferramenta", async (ferramenta, rotulo) => {
    const linha = await linhaDoTempo([ferramenta]);

    expect(linha).toContainEqual({ type: "tool_start", tool: ferramenta, label: rotulo });
    expect(linha).toContainEqual({ type: "tool_end", tool: ferramenta });
  });

  // O ponto do conserto: o aviso cobre a geração do JSON, que é a espera longa.
  // Anunciar na execução seria anunciar quando já não há o que esperar.
  it("avisa antes de executar, não depois", async () => {
    const linha = await linhaDoTempo(["propose_workouts"]);

    const anuncio = linha.findIndex((e) => e.type === "tool_start");
    const execucao = linha.findIndex((e) => e.type === "executou");

    expect(anuncio).toBeGreaterThanOrEqual(0);
    expect(anuncio).toBeLessThan(execucao);
  });

  it("ferramenta sem rótulo não anuncia nada", async () => {
    expect(avisos(await linhaDoTempo(["ferramenta_desconhecida"]))).toEqual([]);
  });

  it("anuncia cada ferramenta do turno, na ordem em que são montadas", async () => {
    const linha = await linhaDoTempo(["query_exercises", "propose_workouts"]);

    expect(avisos(linha).map((e) => (e as SseEvent & { tool: string }).tool)).toEqual([
      "query_exercises",
      "propose_workouts",
    ]);
  });
});

describe("texto entre turnos", () => {
  const texto = (linha: Linha[]) =>
    linha
      .filter((e): e is Extract<SseEvent, { type: "text" }> => e.type === "text")
      .map((e) => e.content)
      .join("");

  // "vou montar a proposta agora!Proposta pronta!" — duas frases de momentos
  // diferentes lidas como uma, porque o turno seguinte continua a mesma bolha.
  it("separa o texto do turno seguinte em parágrafo próprio", async () => {
    const linha = await linhaDoTempo(
      ["propose_workouts"],
      ["Vou montar a proposta agora!", "Proposta pronta! Revise no cartão."],
    );

    expect(texto(linha)).toBe("Vou montar a proposta agora!\n\nProposta pronta! Revise no cartão.");
  });

  it("não abre a conversa com uma quebra", async () => {
    const linha = await linhaDoTempo([], ["Olá!"]);

    expect(texto(linha)).toBe("Olá!");
  });
});

describe("o que o modelo recebe de contexto", () => {
  // Sem a data, "hoje" é palavra sem referente e o assistente pergunta de volta
  // que dia é hoje quando o especialista responde "hoje".
  it("a data de hoje vai junto, todo turno", async () => {
    await linhaDoTempo([], ["oi"]);

    expect(blocosRecebidos.at(-1)?.text).toContain("HOJE É");
  });

  // O prompt e o contexto do aluno são cacheados por prefixo. A data muda todo
  // dia: cacheá-la junto invalidaria o prefixo inteiro uma vez por dia.
  it("a data não é cacheada, e o que vem antes dela continua sendo", async () => {
    await linhaDoTempo([], ["oi"]);

    expect(blocosRecebidos.at(-1)?.cacheControl).toBeUndefined();
    expect(blocosRecebidos[0]?.cacheControl).toBe(true);
  });
});
