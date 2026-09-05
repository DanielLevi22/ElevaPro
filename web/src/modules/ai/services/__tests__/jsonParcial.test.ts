import { describe, expect, it } from "vitest";
import { lerJsonParcial } from "../jsonParcial";

/**
 * A proposta chega em pedaços, e metade de um JSON não parseia. O que este
 * módulo garante é o meio-termo: mostrar o que já dá para saber, sem nunca
 * mostrar o que ainda não chegou como se tivesse chegado.
 *
 * A segunda metade é a que importa: `"sets": 1` a caminho de `12` não pode
 * virar uma série de uma repetição na tela.
 */

describe("json parcial", () => {
  it("json completo é lido como o JSON.parse leria", () => {
    const completo = '{"phase_name":"Base","workouts":[{"title":"Treino A"}]}';

    expect(lerJsonParcial(completo)).toEqual(JSON.parse(completo));
  });

  it("cortado dentro de uma string devolve o que já fechou", () => {
    expect(lerJsonParcial('{"phase_name":"Base","phase_id":"fa')).toEqual({
      phase_name: "Base",
    });
  });

  it("cortado no meio de uma lista devolve os itens inteiros", () => {
    const parcial = '{"workouts":[{"title":"Treino A"},{"title":"Treino B"';

    expect(lerJsonParcial(parcial)).toEqual({
      workouts: [{ title: "Treino A" }, { title: "Treino B" }],
    });
  });

  it("cortado logo depois de uma vírgula não inventa item vazio", () => {
    expect(lerJsonParcial('{"workouts":[{"title":"Treino A"},')).toEqual({
      workouts: [{ title: "Treino A" }],
    });
  });

  // O caso que decide se dá para confiar: um número pela metade não pode
  // aparecer como número.
  it("número pela metade não vira número na tela", () => {
    const parcial = '{"exercises":[{"exercise_name":"Supino","sets":3,"reps":"8-12","rest":1';

    expect(lerJsonParcial(parcial)).toEqual({
      exercises: [{ exercise_name: "Supino", sets: 3, reps: "8-12" }],
    });
  });

  it("nome de campo pela metade some até completar", () => {
    expect(lerJsonParcial('{"phase_name":"Base","dur')).toEqual({ phase_name: "Base" });
  });

  it("aninhamento fundo fecha na ordem certa", () => {
    const parcial = '{"workouts":[{"title":"A","exercises":[{"exercise_name":"Agachamento"';

    expect(lerJsonParcial(parcial)).toEqual({
      workouts: [{ title: "A", exercises: [{ exercise_name: "Agachamento" }] }],
    });
  });

  it("aspa escapada dentro da string não confunde a contagem", () => {
    expect(lerJsonParcial('{"notes":"faz 3\\" de pausa","x')).toEqual({
      notes: 'faz 3" de pausa',
    });
  });

  it("ainda não dá para saber nada devolve nada", () => {
    expect(lerJsonParcial("")).toBeNull();
    expect(lerJsonParcial("   ")).toBeNull();
    expect(lerJsonParcial("{")).toBeNull();
  });

  it("texto que não é json não derruba a tela", () => {
    expect(lerJsonParcial("isto não é json")).toBeNull();
    expect(lerJsonParcial("<html>")).toBeNull();
  });

  // Como chega de verdade: um caractere por vez, e a cada passo o que se lê
  // precisa ser verdade — nunca um estado que não existiu.
  it("lido a cada caractere, nunca mostra o que não chegou", () => {
    const completo =
      '{"phase_name":"Base","workouts":[{"title":"Treino A","day_of_week":"monday"}]}';

    for (let i = 1; i <= completo.length; i++) {
      const parcial = lerJsonParcial(completo.slice(0, i)) as Record<string, unknown> | null;
      if (!parcial) continue;

      // Tudo que apareceu é prefixo verdadeiro do resultado final.
      if ("phase_name" in parcial) expect(parcial.phase_name).toBe("Base");
      const workouts = (parcial.workouts ?? []) as { title?: string; day_of_week?: string }[];
      for (const w of workouts) {
        if (w.title !== undefined) expect(w.title).toBe("Treino A");
        if (w.day_of_week !== undefined) expect(w.day_of_week).toBe("monday");
      }
    }
  });
});
