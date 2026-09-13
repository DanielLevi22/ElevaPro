import { describe, expect, it } from "vitest";
import {
  dataPorExtenso,
  evolucoesDaSessao,
  formatarCarga,
  formatarDuracao,
  formatarVolume,
  gastoDoTreino,
  numeroDaPrescricao,
  resumoDaSessao,
  seloDeCarga,
  seriesDaSessaoAnterior,
  volumeDasSeries,
} from "../sessaoDeTreino";

describe("resumo da sessão", () => {
  it("soma o volume como carga × repetições das séries feitas", () => {
    expect(
      volumeDasSeries([
        { reps: 10, carga: 40 },
        { reps: 8, carga: 45 },
      ]),
    ).toBe(760);
  });

  // Peso do corpo não é zero quilo: somar a série como zero a faria existir
  // sem volume nenhum.
  it("não soma série sem carga ou sem repetição", () => {
    expect(
      volumeDasSeries([
        { reps: 12, carga: null },
        { reps: null, carga: 30 },
      ]),
    ).toBe(0);
  });

  it("monta duração, volume, séries e gasto a partir dos instantes", () => {
    const feitas = {
      a: [
        { reps: 10, carga: 60 },
        { reps: 10, carga: 60 },
      ],
      b: [{ reps: 12, carga: 20 }],
    };
    const inicio = Date.UTC(2026, 8, 13, 10, 0, 0);
    const fim = inicio + 52 * 60_000 + 14_000;

    expect(resumoDaSessao(feitas, inicio, fim, 80)).toEqual({
      duracaoSegundos: 3134,
      volumeKg: 1440,
      series: 3,
      kcal: gastoDoTreino(3134, 80),
    });
  });

  it("estima o gasto como MET × peso × horas", () => {
    expect(gastoDoTreino(3600, 80)).toBe(280);
  });

  it("não devolve duração negativa quando o relógio do aparelho volta", () => {
    expect(resumoDaSessao({}, 1000, 0, 70).duracaoSegundos).toBe(0);
  });
});

describe("formatos do kit", () => {
  it.each([
    [4210, "4,2 t"],
    [1000, "1 t"],
    [850, "850 kg"],
  ])("volume %i vira %s", (kg, texto) => {
    expect(formatarVolume(kg)).toBe(texto);
  });

  it.each([
    [47.5, "47,5 kg"],
    [45, "45 kg"],
  ])("carga %d vira %s", (kg, texto) => {
    expect(formatarCarga(kg)).toBe(texto);
  });

  it.each([
    [3134, "52:14"],
    [59, "00:59"],
    [3734, "1:02:14"],
  ])("duração %i vira %s", (segundos, texto) => {
    expect(formatarDuracao(segundos)).toBe(texto);
  });

  it("escreve o instante por extenso, no fuso do aparelho", () => {
    expect(dataPorExtenso(new Date(2026, 7, 12, 19, 42))).toBe("Quarta, 12 de agosto · 19:42");
  });
});

describe("evolução frente à última execução", () => {
  const anterior = {
    id: "s0",
    completed_at: "2026-08-12T22:00:00Z",
    exercises: [
      {
        workout_exercise_id: "remada",
        sets: [
          { set_index: 1, reps_actual: 10, weight_actual: 45, completed: true },
          { set_index: 0, reps_actual: 10, weight_actual: 45, completed: true },
        ],
      },
      {
        workout_exercise_id: "puxada",
        sets: [
          { set_index: 0, reps_actual: 8, weight_actual: 60, completed: true },
          { set_index: 1, reps_actual: 12, weight_actual: 60, completed: false },
        ],
      },
    ],
  };

  it("lê só as séries concluídas, na ordem", () => {
    expect(seriesDaSessaoAnterior(anterior).puxada).toEqual([{ reps: 8, carga: 60 }]);
  });

  it("aponta carga maior e, com a mesma carga, mais repetições", () => {
    const itens = [
      { id: "remada", nome: "Remada Curvada" },
      { id: "puxada", nome: "Puxada Alta" },
      { id: "rosca", nome: "Rosca Direta" },
    ];
    const feitas = {
      remada: [{ reps: 10, carga: 47.5 }],
      puxada: Array.from({ length: 4 }, () => ({ reps: 10, carga: 60 })),
      rosca: [{ reps: 12, carga: 25 }],
    };

    expect(evolucoesDaSessao(itens, feitas, seriesDaSessaoAnterior(anterior))).toEqual([
      { itemId: "remada", nome: "Remada Curvada", texto: "45 kg → 47,5 kg" },
      { itemId: "puxada", nome: "Puxada Alta", texto: "4 × 10 (antes 1 × 8)" },
    ]);
  });

  // Verde para uma queda diria o contrário do que aconteceu.
  it("põe selo só quando a carga de hoje passa a maior da última vez", () => {
    const antes = [{ reps: 10, carga: 45 }];
    expect(seloDeCarga(47.5, antes)).toBe("+2,5 kg");
    expect(seloDeCarga(45, antes)).toBeNull();
    expect(seloDeCarga(40, antes)).toBeNull();
    expect(seloDeCarga(47.5, undefined)).toBeNull();
  });
});

describe("número da prescrição", () => {
  it.each([
    ["8-10", 8],
    ["47,5", 47.5],
    ["40", 40],
  ])("lê %s como %d", (texto, numero) => {
    expect(numeroDaPrescricao(texto)).toBe(numero);
  });

  // `NaN` atravessaria até `weight_prescribed` no banco.
  it.each([["até a falha"], [""], [null]])("devolve nulo para %p", (texto) => {
    expect(numeroDaPrescricao(texto)).toBeNull();
  });
});
