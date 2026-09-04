export interface ToolDefinition {
  name: string;
  description?: string;
  input_schema: Record<string, unknown>;
  cache_control?: unknown;
}

export type ContentBlock =
  | { type: "text"; text: string }
  /**
   * Imagem em base64.
   *
   * Faltava, e é o que impedia as rotas de visão — body scan e scan-food — de
   * usar esta interface: elas mandam foto, e o contrato só conhecia texto e
   * ferramenta. Sem isto, "todo mundo passa pelo provider" não era alcançável,
   * só recomendável.
   */
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | { type: "tool_result"; tool_use_id: string; content: string; is_error?: boolean };

export interface LLMMessage {
  role: "user" | "assistant";
  content: string | ContentBlock[];
}

export interface SystemBlock {
  text: string;
  cacheControl?: boolean;
}

export interface ProviderTurnOptions {
  systemBlocks: SystemBlock[];
  messages: LLMMessage[];
  tools: readonly ToolDefinition[];
  maxTokens?: number;
  /**
   * Ausente deixa o padrão do provedor, que na Anthropic é 1.0.
   *
   * O body scan fixa em 0: a mesma foto enviada duas vezes devolvia cintura
   * diferente, e o `ADR-0010` apoia a confiabilidade do delta em erro
   * sistemático que se cancela — amostragem aleatória não cancela.
   */
  temperature?: number;
}

export type ProviderStreamEvent =
  | { type: "text_delta"; content: string }
  /**
   * O modelo COMEÇOU a montar uma chamada de ferramenta.
   *
   * Chega antes do JSON, que para uma proposta de três treinos leva de 15 a 20
   * segundos gerando `input_json_delta` — tokens que não são texto e por isso
   * não viram evento nenhum. Sem este sinal, a tela fica muda exatamente no
   * trecho mais longo do turno, e o aviso só apareceria quando não há mais
   * nada para avisar.
   */
  | { type: "tool_building"; name: string }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | { type: "turn_end"; fullContent: ContentBlock[]; stopReason: string };

export interface AIProvider {
  stream(options: ProviderTurnOptions): AsyncGenerator<ProviderStreamEvent>;
}
