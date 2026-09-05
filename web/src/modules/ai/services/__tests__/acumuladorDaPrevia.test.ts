import { describe, expect, it } from "vitest";
import { criarAcumuladorDaPrevia } from "../acumuladorDaPrevia";
import type { Previa } from "../previaDaProposta";

/**
 * Os pedaços chegam dezenas de vezes por segundo; a tela relê uma vez por
 * quadro. Nada é descartado, e a ordem é a de chegada.
 */

/** Agendador manual: o "quadro" acontece quando o teste manda. */
function quadroManual() {
  const pendentes: Array<() => void> = [];
  return {
    agendar: (aplicar: () => void) => {
      pendentes.push(aplicar);
    },
    passar: () => {
      const fila = pendentes.splice(0);
      for (const aplicar of fila) aplicar();
    },
  };
}

function espiao() {
  const vistas: Array<Previa | null> = [];
  return { vistas, aplicar: (p: Previa | null) => vistas.push(p) };
}

describe("acumulador da prévia", () => {
  it("junta os pedaços e lê o JSON inteiro, não cada fragmento", () => {
    const quadro = quadroManual();
    const { vistas, aplicar } = espiao();
    const previa = criarAcumuladorDaPrevia(aplicar, quadro.agendar);

    previa.empurrar("propose_workouts", '{"phase_name":"Ba');
    previa.empurrar("propose_workouts", 'se","workouts":[{"title":"Treino A"');
    quadro.passar();

    expect(vistas).toEqual([
      { titulo: "Treinos · Base", linhas: [{ nivel: 0, texto: "Treino A" }] },
    ]);
  });

  it("aplica uma vez por quadro, não uma vez por pedaço", () => {
    const quadro = quadroManual();
    const { vistas, aplicar } = espiao();
    const previa = criarAcumuladorDaPrevia(aplicar, quadro.agendar);

    for (const pedaco of ['{"phase_name":', '"Base"', ',"workouts":[]']) {
      previa.empurrar("propose_workouts", pedaco);
    }
    quadro.passar();

    expect(vistas).toHaveLength(1);
  });

  // O modelo propõe o plano e, no turno seguinte, as refeições. São dois JSONs
  // diferentes: concatenados, não parseiam.
  it("trocar de ferramenta descarta o que veio antes", () => {
    const quadro = quadroManual();
    const { vistas, aplicar } = espiao();
    const previa = criarAcumuladorDaPrevia(aplicar, quadro.agendar);

    previa.empurrar("propose_diet_plan", '{"name":"Cutting 8"}');
    quadro.passar();
    previa.empurrar("propose_meals", '{"meals":[{"name":"Almoço"');
    quadro.passar();

    expect(vistas.at(-1)).toEqual({
      titulo: "Refeições",
      linhas: [{ nivel: 0, texto: "Almoço", detalhe: undefined }],
    });
  });

  it("limpar apaga a prévia da tela e esquece o acumulado", () => {
    const quadro = quadroManual();
    const { vistas, aplicar } = espiao();
    const previa = criarAcumuladorDaPrevia(aplicar, quadro.agendar);

    previa.empurrar("propose_workouts", '{"phase_name":"Base"');
    quadro.passar();
    previa.limpar();
    // O quadro já agendado não pode ressuscitar o que foi limpo.
    quadro.passar();

    expect(vistas.at(-1)).toBeNull();
  });
});
