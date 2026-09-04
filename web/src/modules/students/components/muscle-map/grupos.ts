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
 * Os sub-músculos de cada grupo — e estes são os nomes das malhas.
 *
 * O grupo é conceito da tela; a malha é o que existe no modelo. Clicar em
 * "Quadríceps" acende as três cabeças porque o grupo é o conjunto delas.
 *
 * **Nem todo grupo divide, e o motivo é material, não preguiça.** O deltoide é
 * uma malha só por lado no écorché: anterior, lateral e posterior não existem
 * como peças separadas, e separá-los exigiria cortar a geometria por ângulo em
 * torno do ombro — outra técnica, não este pipeline. Quadríceps chega com 16
 * ilhas e isquiotibiais com 14, então ali dividir é só ler a posição.
 *
 * Grupo que não divide lista o próprio nome, e a tela não mostra sub-item.
 *
 * **O volume ainda é do grupo.** O banco tem `pernas` como valor único, então
 * vasto lateral, medial e reto femoral recebem a mesma cor. A divisão é
 * anatômica, não informativa — e só passa a informar quando
 * `exercises.muscle_group` ganhar valores finos.
 */
export const SUBMUSCULOS: Record<GrupoMuscular, readonly string[]> = {
  Abdômen: ["Reto abdominal", "Oblíquos"],
  Antebraço: ["Flexores do antebraço", "Extensores do antebraço"],
  Bíceps: ["Cabeça longa do bíceps", "Cabeça curta do bíceps"],
  Costas: ["Trapézio", "Dorsal", "Lombar"],
  Glúteos: ["Glúteo máximo", "Glúteo médio"],
  Isquiotibiais: ["Bíceps femoral", "Semitendinoso", "Semimembranoso"],
  // Uma malha só por lado no modelo — ver a nota acima.
  Ombros: ["Ombros"],
  Panturrilha: ["Gastrocnêmio", "Sóleo"],
  Peitoral: ["Peitoral maior", "Serrátil"],
  Quadríceps: ["Vasto lateral", "Reto femoral", "Vasto medial"],
  // Duas cabeças, não três: o écorché traz duas ilhas por lado, e a medial —
  // que fica embaixo das outras duas — não existe como peça separada.
  Tríceps: ["Cabeça longa do tríceps", "Cabeça lateral do tríceps"],
};

/** Todas as malhas de músculo do modelo, achatadas. */
export const MALHAS_DE_MUSCULO = Object.values(SUBMUSCULOS).flat();

/** O grupo a que uma malha pertence. */
export function grupoDaMalha(malha: string): GrupoMuscular | null {
  for (const [grupo, malhas] of Object.entries(SUBMUSCULOS)) {
    if (malhas.includes(malha)) return grupo as GrupoMuscular;
  }
  return null;
}

/**
 * A malha do corpo que não é grupo treinável: cabeça, pescoço, mãos, pés e o
 * esqueleto. Ela existe no modelo para o boneco ler como corpo.
 */
export const MALHA_NEUTRA = "Corpo";

/**
 * Os nove valores que existem em `exercises.muscle_group`, no banco.
 *
 * Minúsculos e sem acento, e **mais grossos que as malhas do modelo**: `pernas`
 * é um valor só para quadríceps, isquiotibiais e panturrilha.
 *
 * A lista canônica mora em `modules/ai/services/exerciseCatalog.ts`, e está
 * repetida aqui porque módulo não importa de módulo. Se um valor novo entrar no
 * banco sem entrar neste de-para, o volume dele some da tela sem erro — é o que
 * `__tests__/grupos.test.ts` cobre.
 */
export const GRUPOS_DO_BANCO = [
  "peito",
  "costas",
  "ombro",
  "biceps",
  "triceps",
  "pernas",
  "gluteos",
  "abdomen",
  "cardio",
] as const;

/**
 * De valor do banco para as malhas que ele pinta.
 *
 * Até 2026-09-03 esta tradução não existia: o `useWorkoutMetrics` entregava a
 * string crua do banco e a tela procurava por `"Peitoral"`. `"peito"` nunca
 * casou com `"Peitoral"`, então **o mapa nunca pintou dado real** — ficava
 * cinza com o aluno treinando, e isso passou despercebido porque o defeito das
 * malhas produzia o mesmo sintoma.
 *
 * `cardio` fica de fora de propósito: é modalidade, não músculo, e pintá-la em
 * algum lugar seria inventar anatomia.
 *
 * `Antebraço` fica sem origem: nenhum exercício do banco é marcado assim, então
 * ele aparece sempre em cinza. É a verdade — não há dado — e some quando o
 * catálogo de exercícios ganhar o valor.
 */
export const MALHAS_DO_GRUPO: Partial<Record<(typeof GRUPOS_DO_BANCO)[number], GrupoMuscular[]>> = {
  peito: ["Peitoral"],
  costas: ["Costas"],
  ombro: ["Ombros"],
  biceps: ["Bíceps"],
  triceps: ["Tríceps"],
  gluteos: ["Glúteos"],
  abdomen: ["Abdômen"],
  // Três malhas para um valor: o banco não distingue coxa de panturrilha, então
  // as três recebem o mesmo volume. Repetir o número é honesto; reparti-lo
  // entre elas seria inventar uma divisão que o dado não tem.
  pernas: ["Quadríceps", "Isquiotibiais", "Panturrilha"],
};

/**
 * Traduz o volume que veio do banco para volume por malha.
 *
 * @example
 * volumePorMalha([{ muscle: "pernas", volume: 9000 }]);
 * // [{ muscle: "Quadríceps", volume: 9000 }, { muscle: "Isquiotibiais", ... }, ...]
 */
export function volumePorMalha(
  volumeDoBanco: { muscle: string; volume: number }[],
): { muscle: string; volume: number }[] {
  const porMalha = new Map<string, number>();

  for (const { muscle, volume } of volumeDoBanco) {
    const grupos = MALHAS_DO_GRUPO[muscle as (typeof GRUPOS_DO_BANCO)[number]];
    if (!grupos) continue;
    // O valor do banco nomeia um grupo; quem recebe cor é cada sub-músculo
    // dele. Todos ficam com o mesmo número, porque é o que o dado tem.
    for (const grupo of grupos) {
      for (const malha of SUBMUSCULOS[grupo]) {
        porMalha.set(malha, (porMalha.get(malha) ?? 0) + volume);
      }
    }
  }

  return [...porMalha.entries()].map(([muscle, volume]) => ({ muscle, volume }));
}
