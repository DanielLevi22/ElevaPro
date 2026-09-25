import type { WorkoutSseEvent } from "./workoutProposal.types";

/**
 * Lê um corpo de resposta SSE em quadros `data: {...}\n\n` e emite cada evento.
 *
 * O corpo chega em pedaços de rede, não em eventos inteiros — um quadro pode
 * ficar cortado no meio do JSON entre uma leitura e a próxima, por isso o
 * texto decodificado é acumulado num buffer e só é repartido em `\n\n`.
 * Uma linha que não vira JSON válido é ignorada, sem interromper o stream.
 *
 * @example
 * const resposta = await fetch(url, { method: "POST", body });
 * if (resposta.body) await readSseStream(resposta.body, (evento) => { ... });
 */
export async function readSseStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: WorkoutSseEvent) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const linhas = buffer.split("\n\n");
    buffer = linhas.pop() ?? "";

    for (const linha of linhas) {
      if (!linha.startsWith("data: ")) continue;
      try {
        onEvent(JSON.parse(linha.slice(6)) as WorkoutSseEvent);
      } catch {
        // quadro mal formado — ignora e segue para o próximo
      }
    }
  }
}
