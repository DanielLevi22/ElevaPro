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
 * O que dizer enquanto o coach está com uma ferramenta na mão.
 *
 * O aviso começa quando o modelo **começa a montar** a chamada, não quando ela
 * executa: gerar o JSON de uma proposta de três treinos leva de 15 a 20
 * segundos, e é aí que a tela ficava muda. Executar, depois disso, é rápido.
 *
 * O corte não é entre ler e gravar — é entre **trabalhar e escrever**. O balão
 * incomodava quando aparecia ao lado de prosa, dizendo "preparando" sem nada
 * ter ido ao servidor. Enquanto o modelo monta ou executa uma ferramenta,
 * inclusive consulta, a tela tem o que dizer.
 */
/** Parágrafo entre o texto de um turno e o do seguinte. */
const QUEBRA = `

`;

const TOOL_LABELS: Record<string, string> = {
  query_exercises: "Consultando o catálogo de exercícios",
  query_foods: "Consultando o catálogo de alimentos",
  query_body_scan: "Consultando a análise corporal",
  propose_periodization: "Montando a proposta de periodização",
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

    // Turno posterior a uma ferramenta continua a mesma bolha. Sem a quebra, o
    // texto novo cola no anterior: "vou montar a proposta agora!Proposta
    // pronta!" — duas frases de momentos diferentes lidas como uma.
    let jaEscreveu = false;

    while (true) {
      let fullContent: ContentBlock[] = [];
      let primeiroTextoDoTurno = true;
      const toolUses: Array<{ id: string; name: string; input: unknown }> = [];

      for await (const event of this.provider.stream({ systemBlocks, messages, tools })) {
        if (event.type === "text_delta") {
          if (primeiroTextoDoTurno && jaEscreveu) yield { type: "text", content: QUEBRA };
          primeiroTextoDoTurno = false;
          jaEscreveu = true;
          yield { type: "text", content: event.content };
        } else if (event.type === "tool_building") {
          // Só aqui a tela consegue dizer o que está sendo montado — depois
          // deste evento vêm de 15 a 20 segundos de JSON, sem nada.
          const label = TOOL_LABELS[event.name];
          if (label) yield { type: "tool_start", tool: event.name, label };
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
        // O `tool_start` já saiu lá em cima, quando o modelo começou a montar
        // esta chamada. Aqui só resta executar e dizer que acabou.
        const { sseEvents, result } = await this.handleTool(
          toolUse.name,
          toolUse.input,
          input.onToolCall,
        );

        if (TOOL_LABELS[toolUse.name]) yield { type: "tool_end", tool: toolUse.name };
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
