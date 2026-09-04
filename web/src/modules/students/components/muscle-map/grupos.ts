/**
 * Os grupos musculares que o mapa conhece.
 *
 * **Estes nomes são os nomes das malhas dentro do GLB.** Não há tradução entre
 * um e outro: `scripts/modelo/reagrupar.js` emite uma malha chamada `Peitoral`,
 * a tela procura por `Peitoral`, e é só. Foi a ausência dessa camada de
 * tradução que consertou o mapa — antes existia um `MUSCLE_MESH_MAP` ligando
 * cada grupo a nomes como `object_27`, escolhidos por centroide, e ele nunca
 * acertava o lugar da cor.
 *
 * Como o acordo é por nome, ele pode quebrar em silêncio: renomear aqui sem
 * regerar o modelo, ou o contrário, deixa o grupo sem malha e a tela pinta
 * nada sem reclamar. `__tests__/grupos.test.ts` lê o próprio GLB e falha
 * quando as duas listas divergem.
 *
 * A grafia também é a que `exercises.muscle_group` usa no banco, porque é dela
 * que o volume chega — ver `useWorkoutMetrics`.
 */
export const GRUPOS_MUSCULARES = [
  "Abdômen",
  "Antebraço",
  "Bíceps",
  "Costas",
  "Glúteos",
  "Isquiotibiais",
  "Ombros",
  "Panturrilha",
  "Peitoral",
  "Quadríceps",
  "Tríceps",
] as const;

export type GrupoMuscular = (typeof GRUPOS_MUSCULARES)[number];

/**
 * A malha do corpo que não é grupo treinável: cabeça, pescoço, mãos, pés e o
 * esqueleto. Ela existe no modelo para o boneco ler como corpo.
 */
export const MALHA_NEUTRA = "Corpo";
