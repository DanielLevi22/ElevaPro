import { describe, expect, it } from "vitest";
import type { ChatMessage } from "../../types";
import { historicoDoTurno } from "../historicoDoTurno";

/**
 * O que a conversa custa a cada turno.
 *
 * O histórico era reenviado inteiro, a preço cheio, e nada nas mensagens leva
 * `cache_control` — era a única peça do prompt que crescia sem teto. Cortar é
 * fácil; cortar sem perder o que não pode ser esquecido é o que este módulo
 * garante.
 */

const msg = (i: number, content: string, role: "user" | "assistant" = "user"): ChatMessage => ({
  id: `m${i}`,
  role,
  content,
  createdAt: `2026-09-05T10:${String(i).padStart(2, "0")}:00Z`,
});

const conversa = (n: number) => Array.from({ length: n }, (_, i) => msg(i, `mensagem ${i}`));

describe("histórico do turno", () => {
  it("conversa curta vai inteira", () => {
    const mensagens = conversa(8);

    expect(historicoDoTurno(mensagens)).toHaveLength(8);
  });

  it("conversa longa é cortada na janela", () => {
    expect(historicoDoTurno(conversa(120), 30)).toHaveLength(30);
  });

  it("o que fica é o fim da conversa, não o começo", () => {
    const recortado = historicoDoTurno(conversa(50), 30);

    expect(recortado[0].content).toBe("mensagem 20");
    expect(recortado.at(-1)?.content).toBe("mensagem 49");
  });

  it("preserva papel e conteúdo", () => {
    const mensagens = [msg(0, "oi", "user"), msg(1, "olá", "assistant")];

    expect(historicoDoTurno(mensagens)).toEqual([
      { role: "user", content: "oi" },
      { role: "assistant", content: "olá" },
    ]);
  });
});

/**
 * A parte que decide se dá para cortar sem quebrar nada.
 *
 * As linhas de razão são o que impede o assistente de pedir aprovação do que já
 * foi aprovado. Perder uma delas na janela custa uma prescrição gravada duas
 * vezes — o defeito que a periodização carregou por meses.
 */
describe("o que nunca é esquecido", () => {
  it("a linha de razão volta mesmo tendo saído da janela", () => {
    const mensagens = [
      msg(0, "✅ Periodização aprovada e salva: Hipertrofia 12 Semanas.", "assistant"),
      ...conversa(60).map((m, i) => ({ ...m, id: `x${i}` })),
    ];

    const recortado = historicoDoTurno(mensagens, 30);

    expect(recortado[0].content).toContain("Periodização aprovada e salva");
  });

  it("vem antes do trecho recente, porque aconteceu antes", () => {
    const mensagens = [
      msg(0, "✅ Treinos aprovados e salvos na fase Adaptação: A, B.", "assistant"),
      ...conversa(40).map((m, i) => ({ ...m, id: `y${i}` })),
    ];

    const recortado = historicoDoTurno(mensagens, 10);

    expect(recortado[0].content).toContain("Treinos aprovados");
    expect(recortado[1].content).toBe("mensagem 30");
  });

  it("várias razões antigas voltam, na ordem em que aconteceram", () => {
    const mensagens = [
      msg(0, "✅ Periodização aprovada e salva: X.", "assistant"),
      msg(1, "✅ Treinos aprovados e salvos na fase 1: A.", "assistant"),
      ...conversa(50).map((m, i) => ({ ...m, id: `z${i}` })),
    ];

    const razoes = historicoDoTurno(mensagens, 10)
      .filter((m) => m.content.startsWith("✅"))
      .map((m) => m.content);

    expect(razoes).toEqual([
      "✅ Periodização aprovada e salva: X.",
      "✅ Treinos aprovados e salvos na fase 1: A.",
    ]);
  });

  it("razão que ainda está na janela não é duplicada", () => {
    const mensagens = [...conversa(5), msg(9, "✅ Periodização salva.", "assistant")];

    const razoes = historicoDoTurno(mensagens, 30).filter((m) => m.content.startsWith("✅"));

    expect(razoes).toHaveLength(1);
  });
});
