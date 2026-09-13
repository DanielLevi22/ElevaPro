import type { Workout } from "../types/workouts.types";

const GRUPOS_NA_LINHA = 3;

/**
 * Os grupos musculares de um treino, para os chips do detalhe.
 *
 * Primeiro o grupo que o especialista deu ao treino, depois os dos exercícios,
 * sem repetir — "Bíceps" e "bíceps" são o mesmo grupo escrito por duas mãos.
 *
 * @example gruposDoTreino(treino) // ["Costas", "Bíceps"]
 */
export function gruposDoTreino(treino: Workout): string[] {
  const candidatos = [
    treino.muscle_group,
    ...(treino.exercises ?? []).map((item) => item.exercise?.muscle_group),
  ];
  const vistos = new Set<string>();
  const grupos: string[] = [];
  for (const grupo of candidatos) {
    const nome = grupo?.trim();
    if (!nome || vistos.has(nome.toLowerCase())) continue;
    vistos.add(nome.toLowerCase());
    grupos.push(nome);
  }
  return grupos.slice(0, GRUPOS_NA_LINHA);
}

/**
 * Quantos exercícios o treino tem, venha a contagem pronta ou a lista.
 *
 * Sem nenhum dos dois devolve `undefined`: zero afirmaria um treino vazio, e o
 * que se sabe é só que a consulta não trouxe o dado.
 *
 * @example contarExercicios(treino) // 6
 */
export function contarExercicios(treino: Workout): number | undefined {
  return treino.exercises_count ?? treino.exercises?.length;
}
