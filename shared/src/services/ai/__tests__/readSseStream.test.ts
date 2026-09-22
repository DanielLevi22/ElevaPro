import { describe, expect, it } from "vitest";
import { readSseStream } from "../readSseStream";
import type { WorkoutSseEvent } from "../workoutProposal.types";

function streamDe(...pedacos: string[]): ReadableStream<Uint8Array> {
  const codificador = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const pedaco of pedacos) controller.enqueue(codificador.encode(pedaco));
      controller.close();
    },
  });
}

describe("readSseStream", () => {
  it("parseia eventos separados por linha em branco", async () => {
    const eventos: WorkoutSseEvent[] = [];
    await readSseStream(
      streamDe('data: {"type":"text","content":"oi"}\n\ndata: {"type":"done"}\n\n'),
      (e) => eventos.push(e),
    );

    expect(eventos).toEqual([{ type: "text", content: "oi" }, { type: "done" }]);
  });

  // O corpo chega em pedaços de rede, não em eventos inteiros — um evento pode
  // ficar cortado no meio do JSON entre um `read()` e o próximo.
  it("remonta um evento partido entre dois pedaços do stream", async () => {
    const eventos: WorkoutSseEvent[] = [];
    await readSseStream(
      streamDe('data: {"type":"proposal","data":{"nam', 'e":"Hipertrofia"}}\n\n'),
      (e) => eventos.push(e),
    );

    expect(eventos).toEqual([{ type: "proposal", data: { name: "Hipertrofia" } }]);
  });

  it("ignora uma linha mal formada sem descartar os eventos seguintes", async () => {
    const eventos: WorkoutSseEvent[] = [];
    await readSseStream(streamDe('data: {quebrado\n\ndata: {"type":"done"}\n\n'), (e) =>
      eventos.push(e),
    );

    expect(eventos).toEqual([{ type: "done" }]);
  });

  it("ignora linhas que não começam com 'data: '", async () => {
    const eventos: WorkoutSseEvent[] = [];
    await readSseStream(streamDe(': comentário\n\ndata: {"type":"done"}\n\n'), (e) =>
      eventos.push(e),
    );

    expect(eventos).toEqual([{ type: "done" }]);
  });
});
