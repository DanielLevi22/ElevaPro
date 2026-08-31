import type { AIProvider, ProviderTurnOptions } from "./types";

/**
 * Uma pergunta, uma resposta — sem conversa e sem ferramenta.
 *
 * Metade das rotas de IA do produto é assim: manda prompt e imagem, recebe um
 * JSON, acabou. Elas chamavam `messages.create` do SDK direto, e é por isso que
 * a promessa do `ADR-0011` — *"para trocar de Anthropic para OpenAI: alterar
 * apenas `ai.config.ts`"* — tinha deixado de valer.
 *
 * Existe como função, e não como método novo em `AIProvider`, de propósito. A
 * interface tem **um** método, e quem escrever o próximo provider precisa
 * implementar um só. Agregar o fluxo num texto é trabalho que não varia entre
 * provedores: fazer disso um método obrigaria cada implementação a repetir a
 * mesma agregação, e um adapter que só repassa chamada é a dívida que o
 * `CLAUDE.md` chama de módulo raso.
 *
 * @example
 * const { texto, stopReason } = await responderEmUmTurno(aiProviders.fast, {
 *   systemBlocks: [{ text: prompt }],
 *   messages: [{ role: "user", content: "Analise isto." }],
 *   tools: [],
 * });
 */
export interface RespostaDeUmTurno {
  /** O texto inteiro da resposta, já concatenado. */
  texto: string;
  /** `max_tokens` aqui significa resposta cortada, não modelo errado. */
  stopReason: string;
}

export async function responderEmUmTurno(
  provider: AIProvider,
  options: ProviderTurnOptions,
): Promise<RespostaDeUmTurno> {
  const partes: string[] = [];
  let stopReason = "end_turn";

  for await (const evento of provider.stream(options)) {
    // Só o `turn_end` conta. Os `text_delta` que vieram antes são os mesmos
    // pedaços do `fullContent` — somar os dois duplicaria a resposta inteira.
    if (evento.type !== "turn_end") continue;

    stopReason = evento.stopReason;
    for (const bloco of evento.fullContent) {
      if (bloco.type === "text") partes.push(bloco.text);
    }
  }

  return { texto: partes.join(""), stopReason };
}
