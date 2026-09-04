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
 * Quando a tela avisa que algo está acontecendo.
 *
 * O aviso ficava o turno inteiro e, depois, em toda ferramenta — inclusive
 * consulta. Na tela isso vira um segundo balão ao lado da resposta dizendo
 * "preparando" enquanto o modelo apenas redige, sem nada ter ido ao servidor.
 * Agora só gravação se anuncia, e o corte mora aqui: consulta não emite evento,
 * então a tela não precisa de uma lista de exceções.
 */

function providerQueAciona(ferramentas: string[]): AIProvider {
  let turnos = 0;
  return {
    async *stream(): AsyncGenerator<ProviderStreamEvent> {
      turnos++;
      // Segundo turno: o modelo já viu o resultado e responde em texto.
      if (turnos > 1) {
        yield { type: "text_delta", content: "Pronto." };
        yield {
          type: "turn_end",
          fullContent: [{ type: "text", text: "Pronto." }] as ContentBlock[],
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
    return [{ text: "prompt" }];
  }
  getTools(): ToolDefinition[] {
    return [];
  }
}

async function eventosDe(ferramentas: string[]): Promise<SseEvent[]> {
  const orquestrador = new OrquestradorDeTeste(providerQueAciona(ferramentas));
  const eventos: SseEvent[] = [];
  for await (const evento of orquestrador.run({
    userMessage: "vai",
    history: [],
    contextText: "",
    onToolCall: async () => "{}",
  })) {
    eventos.push(evento);
  }
  return eventos;
}

const avisos = (eventos: SseEvent[]) =>
  eventos.filter((e) => e.type === "tool_start" || e.type === "tool_end");

describe("aviso de progresso", () => {
  it.each([
    ["save_periodization", "Salvando a periodização"],
    ["propose_workouts", "Montando a proposta de treinos"],
    ["propose_diet_plan", "Calculando as metas do plano"],
    ["propose_meals", "Montando as refeições"],
  ])("anuncia %s, que grava", async (ferramenta, rotulo) => {
    const eventos = await eventosDe([ferramenta]);

    expect(eventos).toContainEqual({ type: "tool_start", tool: ferramenta, label: rotulo });
    expect(eventos).toContainEqual({ type: "tool_end", tool: ferramenta });
  });

  // Consulta volta antes de a pessoa terminar de ler a frase anterior. Anunciar
  // isso é o balão sobrando ao lado da bolha de texto.
  it.each([
    "query_exercises",
    "query_foods",
    "query_body_scan",
    "propose_periodization",
  ])("não anuncia %s, que não grava", async (ferramenta) => {
    expect(avisos(await eventosDe([ferramenta]))).toEqual([]);
  });

  it("no mesmo turno, anuncia só a que grava", async () => {
    const eventos = await eventosDe(["query_exercises", "propose_workouts"]);

    expect(avisos(eventos).map((e) => e.tool)).toEqual(["propose_workouts", "propose_workouts"]);
  });

  // O resultado da consulta continua indo ao modelo: o que sumiu é o aviso na
  // tela, não a chamada.
  it("a ferramenta silenciosa continua rodando e respondendo ao modelo", async () => {
    const eventos = await eventosDe(["query_exercises"]);

    expect(eventos.at(-1)).toEqual({ type: "done" });
    expect(eventos.some((e) => e.type === "text")).toBe(true);
  });
});
