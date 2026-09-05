import Anthropic from "@anthropic-ai/sdk";
import type { AIProvider, ContentBlock, ProviderStreamEvent, ProviderTurnOptions } from "./types";

export class AnthropicProvider implements AIProvider {
  private client: Anthropic;

  constructor(
    private model: string,
    apiKey = process.env.ANTHROPIC_API_KEY,
  ) {
    this.client = new Anthropic({ apiKey });
  }

  async *stream(options: ProviderTurnOptions): AsyncGenerator<ProviderStreamEvent> {
    const system = options.systemBlocks.map((b) => ({
      type: "text" as const,
      text: b.text,
      ...(b.cacheControl ? { cache_control: { type: "ephemeral" as const } } : {}),
    }));

    const apiStream = this.client.messages.stream({
      model: this.model,
      max_tokens: options.maxTokens ?? 2048,
      // Omitido quando vazio: as rotas de tiro único mandam o prompt como
      // mensagem do usuário e não têm bloco de sistema, e `system: []` é um
      // campo presente afirmando que não há nada — melhor não afirmar.
      ...(system.length > 0 ? { system } : {}),
      messages: options.messages as Anthropic.MessageParam[],
      tools: options.tools as Anthropic.Tool[],
      ...(options.temperature === undefined ? {} : { temperature: options.temperature }),
    });

    // Os `input_json_delta` não dizem de que ferramenta são — só o índice do
    // bloco. O nome só aparece no `content_block_start`, então é aqui que ele
    // fica guardado até o bloco fechar.
    const ferramentaDoBloco = new Map<number, string>();

    for await (const event of apiStream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield { type: "text_delta", content: event.delta.text };
      } else if (event.type === "content_block_delta" && event.delta.type === "input_json_delta") {
        const name = ferramentaDoBloco.get(event.index);
        if (name) yield { type: "tool_input_delta", name, partial: event.delta.partial_json };
      } else if (event.type === "content_block_start" && event.content_block.type === "tool_use") {
        // A API nomeia a ferramenta aqui, antes de um único caractere do JSON.
        // É o único instante em que dá para avisar a tela do que vem, porque
        // depois só há `input_json_delta` até o bloco fechar.
        ferramentaDoBloco.set(event.index, event.content_block.name);
        yield { type: "tool_building", name: event.content_block.name };
      }
    }

    const final = await apiStream.finalMessage();
    const fullContent = final.content as ContentBlock[];

    for (const block of fullContent) {
      if (block.type === "tool_use") {
        yield { type: "tool_use", id: block.id, name: block.name, input: block.input };
      }
    }

    yield { type: "turn_end", fullContent, stopReason: final.stop_reason ?? "end_turn" };
  }
}
