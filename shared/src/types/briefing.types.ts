/** Por que este aluno aparece no briefing. Ordena a lista: menor = mais urgente. */
export type BriefingSignalKind = "inactive" | "pending_invite" | "anamnesis_ready";

export type BriefingTone = "danger" | "warning" | "success";

/**
 * Um aluno que precisa de ação, já reduzido ao que a tela mostra.
 *
 * O que **não** existe aqui é a parte importante: nem conteúdo de anamnese, nem
 * peso, medida ou carga. O sinal é "não treina há 5 dias", nunca o treino. Ver o
 * parecer LGPD em `docs/PRDs/briefing.md`.
 */
export interface BriefingSignal {
  studentId: string;
  studentName: string;
  kind: BriefingSignalKind;
  tone: BriefingTone;
  /** Frase pronta para a tela, já em português. */
  message: string;
  /** Dias desde o evento que gerou o sinal — para ordenar dentro do mesmo tipo. */
  days: number;
}

export interface BriefingStats {
  activeStudents: number;
  workoutTemplates: number;
  activeDietPlans: number;
  aiSessions: number;
}

export interface Briefing {
  signals: BriefingSignal[];
  stats: BriefingStats;
}
