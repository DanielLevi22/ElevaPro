import type { TrainingMethodGroup } from "@elevapro/shared";

// Classes literais: o Tailwind não enxerga classe montada em runtime.
export const METHOD_GROUP_TONE: Record<TrainingMethodGroup, string> = {
  structure: "bg-primary/10 text-primary-text border-primary/30",
  execution: "bg-sky-500/10 text-sky-400 border-sky-500/30",
  pairing: "bg-violet-500/10 text-violet-400 border-violet-500/30",
  scheme: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  timed: "bg-rose-500/10 text-rose-400 border-rose-500/30",
};

export const METHOD_GROUP_LABEL: Record<TrainingMethodGroup, string> = {
  structure: "Estrutura da série",
  execution: "Forma de executar",
  pairing: "Ligação com outro exercício",
  scheme: "Esquema",
  timed: "Por tempo",
};
