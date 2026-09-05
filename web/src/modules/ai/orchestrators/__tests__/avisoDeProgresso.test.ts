import { afterEach, describe, expect, it } from "vitest";
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

/** Quando o turno deve terminar cortado pelo teto de tokens. */
let cortaPorLimite = false;
/** O teto que o orquestrador pediu, para conferir que não ficou no default. */
let tetoPedido: number | undefined;

function providerFalso(ferramentas: string[], textos: string[] = []): AIProvider {
  let turnos = 0;
  return {
    async *stream(options): AsyncGenerator<ProviderStreamEvent> {
      blocosRecebidos = options.systemBlocks;
      tetoPedido = options.maxTokens;
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

      for (const bloco of blocos) {
        yield { type: "tool_building", name: bloco.name };
        // Os 15 a 20 segundos de JSON, encolhidos a um pedaço.
        yield { type: "tool_input_delta", name: bloco.name, partial: `{"de":"${bloco.name}"` };
      }
      for (const bloco of blocos) {
        yield { type: "tool_use", id: bloco.id, name: bloco.name, input: bloco.input };
      }
      yield {
        type: "turn_end",
        fullContent: blocos as unknown as ContentBlock[],
        // Cortado no meio do JSON da ferramenta: é o caso que produzia proposta
        // com exercício faltando.
        stopReason: cortaPorLimite ? "max_tokens" : "tool_use",
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

/**
 * A prévia é para a espera longa, e só para ela.
 *
 * Consulta volta antes de a pessoa terminar de ler a frase anterior, e salvar
 * recebe um id — prever o que já foi decidido não diz nada a ninguém.
 */
describe("prévia da proposta", () => {
  const previas = (linha: Linha[]) =>
    linha.filter(
      (e): e is Extract<SseEvent, { type: "proposal_building" }> => e.type === "proposal_building",
    );

  it.each([
    "propose_periodization",
    "propose_workouts",
    "propose_diet_plan",
    "propose_meals",
  ])("repassa os pedaços de %s enquanto são escritos", async (ferramenta) => {
    const linha = await linhaDoTempo([ferramenta]);

    expect(previas(linha)).toEqual([
      { type: "proposal_building", tool: ferramenta, partial: `{"de":"${ferramenta}"` },
    ]);
  });

  it.each([
    "query_exercises",
    "query_foods",
    "save_periodization",
  ])("%s não manda prévia, mesmo tendo rótulo", async (ferramenta) => {
    expect(previas(await linhaDoTempo([ferramenta]))).toEqual([]);
  });

  // O pedaço chega antes de a ferramenta executar — é justamente a espera que
  // ele preenche.
  it("a prévia chega antes da execução", async () => {
    const linha = await linhaDoTempo(["propose_workouts"]);

    const pedaco = linha.findIndex((e) => e.type === "proposal_building");
    const execucao = linha.findIndex((e) => e.type === "executou");

    expect(pedaco).toBeGreaterThanOrEqual(0);
    expect(pedaco).toBeLessThan(execucao);
  });
});

describe("turno cortado pelo teto de tokens", () => {
  afterEach(() => {
    cortaPorLimite = false;
  });

  it("pede um teto folgado, não o default do provider", async () => {
    await linhaDoTempo([], ["oi"]);

    expect(tetoPedido).toBeGreaterThanOrEqual(8192);
  });

  // Executar com JSON pela metade é gravar prescrição truncada, que é pior que
  // não gravar.
  it("não executa a ferramenta quando o JSON dela veio cortado", async () => {
    cortaPorLimite = true;

    const linha = await linhaDoTempo(["propose_workouts"]);

    expect(linha.some((e) => e.type === "executou")).toBe(false);
  });

  // O silêncio é o que tornava isso confuso: a proposta não aparecia e ninguém
  // dizia por quê.
  it("diz que foi cortado, em vez de terminar em silêncio", async () => {
    cortaPorLimite = true;

    const linha = await linhaDoTempo(["propose_workouts"]);
    const erro = linha.find((e) => e.type === "error");

    expect(erro).toBeDefined();
    expect((erro as { message: string }).message).toContain("cortada");
  });

  it("turno normal continua executando e terminando", async () => {
    const linha = await linhaDoTempo(["propose_workouts"]);

    expect(linha.some((e) => e.type === "executou")).toBe(true);
    expect(linha.at(-1)).toEqual({ type: "done" });
  });
});
