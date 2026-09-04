import type {
  AIProvider,
  ContentBlock,
  LLMMessage,
  SystemBlock,
  ToolDefinition,
} from "../providers/types";
import type { SseEvent } from "../types";

export type ToolCallHandler = (name: string, input: unknown) => Promise<string>;

export interface OrchestratorRunInput {
  userMessage: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  contextText: string;
  onToolCall?: ToolCallHandler;
}

/**
 * O que dizer enquanto a ferramenta roda — e quais ferramentas merecem dizer.
 *
 * Só as que **gravam** estão aqui. Consultar o catálogo é uma ida ao banco que
 * volta antes de a pessoa terminar de ler a frase anterior; anunciar isso põe um
 * segundo balão ao lado da bolha de texto, dizendo "preparando" enquanto o
 * modelo apenas redige. Gravar é diferente: a periodização entra no banco, a
 * proposta fica guardada esperando aprovação, e aí a demora precisa de nome.
 *
 * A ausência aqui é o corte: ferramenta sem rótulo não emite `tool_start` nem
 * `tool_end`, e a tela não precisa carregar uma lista de exceções para saber o
 * que ignorar.
 */
const TOOL_LABELS: Record<string, string> = {
  save_periodization: "Salvando a periodização",
  propose_workouts: "Montando a proposta de treinos",
  propose_diet_plan: "Calculando as metas do plano",
  propose_meals: "Montando as refeições",
};

export abstract class BaseOrchestrator {
  constructor(protected provider: AIProvider) {}

  abstract buildSystemBlocks(contextText: string): SystemBlock[];
  abstract getTools(): ToolDefinition[];

  // Subclasses override to handle tool calls that produce SSE events.
  // Default: delegate to the external onToolCall handler (DB operations etc.).
  protected async handleTool(
    name: string,
    input: unknown,
    onToolCall: ToolCallHandler | undefined,
  ): Promise<{ sseEvents: SseEvent[]; result: string }> {
    const result = onToolCall
      ? await onToolCall(name, input)
      : JSON.stringify({ error: "unknown tool" });
    return { sseEvents: [], result };
  }

  async *run(input: OrchestratorRunInput): AsyncGenerator<SseEvent> {
    const messages: LLMMessage[] = [...input.history, { role: "user", content: input.userMessage }];

    const systemBlocks = this.buildSystemBlocks(input.contextText);
    const tools = this.getTools();

    while (true) {
      let fullContent: ContentBlock[] = [];
      const toolUses: Array<{ id: string; name: string; input: unknown }> = [];

      for await (const event of this.provider.stream({ systemBlocks, messages, tools })) {
        if (event.type === "text_delta") {
          yield { type: "text", content: event.content };
        } else if (event.type === "tool_use") {
          toolUses.push({ id: event.id, name: event.name, input: event.input });
        } else if (event.type === "turn_end") {
          fullContent = event.fullContent;
        }
      }

      messages.push({ role: "assistant", content: fullContent });

      if (toolUses.length === 0) break;

      const toolResultBlocks: ContentBlock[] = [];

      for (const toolUse of toolUses) {
        // Sem rótulo é consulta, e consulta não se anuncia: o genérico
        // "Trabalhando nisso" que ficava aqui aparecia na tela como um segundo
        // balão ao lado da resposta, dizendo que algo era preparado enquanto o
        // modelo só redigia.
        const label = TOOL_LABELS[toolUse.name];
        if (label) yield { type: "tool_start", tool: toolUse.name, label };

        const { sseEvents, result } = await this.handleTool(
          toolUse.name,
          toolUse.input,
          input.onToolCall,
        );

        if (label) yield { type: "tool_end", tool: toolUse.name };
        for (const e of sseEvents) yield e;
        toolResultBlocks.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: result,
        });
      }

      messages.push({ role: "user", content: toolResultBlocks });
    }

    yield { type: "done" };
  }
}
