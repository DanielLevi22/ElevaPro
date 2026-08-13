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
 * O que dizer ao especialista enquanto a ferramenta roda.
 *
 * A ida ao banco mais o segundo turno do modelo levam de 8 a 10 segundos, e até
 * aqui o stream ficava mudo o tempo todo — o chat parecia travado. Dez segundos
 * com "consultando o catálogo" são trabalho; dez segundos em silêncio são
 * defeito.
 */
const TOOL_LABELS: Record<string, string> = {
  query_exercises: "Consultando o catálogo de exercícios",
  query_body_scan: "Consultando a análise corporal",
  propose_periodization: "Montando a proposta de periodização",
  save_periodization: "Salvando a periodização",
  propose_workouts: "Montando a proposta de treinos",
  query_foods: "Consultando o catálogo de alimentos",
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
        yield {
          type: "tool_start",
          tool: toolUse.name,
          label: TOOL_LABELS[toolUse.name] ?? "Trabalhando nisso",
        };

        const { sseEvents, result } = await this.handleTool(
          toolUse.name,
          toolUse.input,
          input.onToolCall,
        );

        yield { type: "tool_end", tool: toolUse.name };
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
