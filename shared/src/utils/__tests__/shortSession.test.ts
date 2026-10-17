import { describe, expect, it } from "vitest";
import { shortSession } from "../shortSession";

describe("shortSession (F3)", () => {
  it("fica com os três primeiros na ordem do plano", () => {
    const items = [3, 0, 4, 1, 2].map((order_index) => ({ id: `e${order_index}`, order_index }));
    expect(shortSession(items).map((item) => item.id)).toEqual(["e0", "e1", "e2"]);
  });

  it("treino com menos de três fica inteiro", () => {
    expect(shortSession([{ order_index: 0 }, { order_index: 1 }])).toHaveLength(2);
  });
});
