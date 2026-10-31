import { describe, expect, it } from "vitest";
import { readAllPages } from "../readAllPages";

const page = (size: number, start = 0) =>
  Array.from({ length: size }, (_, index) => ({ id: start + index }));

describe("readAllPages", () => {
  it("lê até a página vir incompleta, pedindo cada faixa de mil", async () => {
    const ranges: [number, number][] = [];
    const rows = await readAllPages((from, to) => {
      ranges.push([from, to]);
      return Promise.resolve({ data: from === 0 ? page(1000) : page(3, 1000), error: null });
    });

    expect(rows).toHaveLength(1003);
    expect(ranges).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
  });

  it("sem linha nenhuma, devolve vazio numa ida só", async () => {
    let calls = 0;
    const rows = await readAllPages(() => {
      calls += 1;
      return Promise.resolve({ data: null, error: null });
    });
    expect(rows).toEqual([]);
    expect(calls).toBe(1);
  });

  it("erro numa página interrompe a leitura, sem devolver metade", async () => {
    const failure = { message: "42501" };
    await expect(
      readAllPages((from) =>
        Promise.resolve(
          from === 0 ? { data: page(1000), error: null } : { data: null, error: failure },
        ),
      ),
    ).rejects.toBe(failure);
  });
});
