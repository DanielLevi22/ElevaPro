/**
 * O catálogo fixo de técnicas de treino (TrainingMethod) que o especialista marca
 * nas séries. Vem de `docs/research/tecnicas-de-treino.md`; a BFR fica de fora
 * porque a pressão do manguito é dado de saúde.
 *
 * É código e não tabela: a lista não muda por usuário, e o texto que acompanha
 * cada técnica precisa de revisão no PR.
 */

export type TrainingMethodGroup = "structure" | "execution" | "pairing" | "scheme" | "timed";

export interface TrainingMethod {
  id: string;
  label: string;
  group: TrainingMethodGroup;
  /** Aquecimento e preparação ficam fora do volume de trabalho. */
  countsTowardVolume: boolean;
}

const method = (
  id: string,
  label: string,
  group: TrainingMethodGroup,
  countsTowardVolume = true,
): TrainingMethod => ({ id, label, group, countsTowardVolume });

export const TRAINING_METHODS: readonly TrainingMethod[] = [
  method("warmup", "Aquecimento", "structure", false),
  method("feeder", "Preparação", "structure", false),
  method("working", "Normal", "structure"),
  method("failure", "Até a falha", "structure"),
  method("rest_pause", "Rest-pause", "structure"),
  method("myo_reps", "Myo-reps", "structure"),
  method("cluster", "Cluster", "structure"),
  method("drop_set", "Drop-set", "structure"),
  method("sst", "SST", "structure"),
  method("forced_reps", "Repetições forçadas", "structure"),
  method("partial", "Parcial", "execution"),
  method("twenty_ones", "21s", "execution"),
  method("negative", "Negativa", "execution"),
  method("isometric", "Isometria", "execution"),
  method("tempo", "Cadência controlada", "execution"),
  method("cheat", "Roubada", "execution"),
  method("bi_set", "Bi-set", "pairing"),
  method("tri_set", "Tri-set", "pairing"),
  method("giant_set", "Série gigante", "pairing"),
  method("circuit", "Circuito", "pairing"),
  method("pre_exhaustion", "Pré-exaustão", "pairing"),
  method("post_exhaustion", "Pós-exaustão", "pairing"),
  method("ascending_pyramid", "Pirâmide crescente", "scheme"),
  method("descending_pyramid", "Pirâmide decrescente", "scheme"),
  method("fst7", "FST-7", "scheme"),
  method("gvt", "GVT (10x10)", "scheme"),
  method("five_by_five", "5x5", "scheme"),
  method("top_set", "Top set", "scheme"),
  method("back_off", "Back-off", "scheme"),
  method("heavy_duty", "Heavy duty", "scheme"),
  method("emom", "EMOM", "timed"),
  method("amrap", "AMRAP", "timed"),
];

export const TRAINING_METHOD_IDS = TRAINING_METHODS.map((m) => m.id);
