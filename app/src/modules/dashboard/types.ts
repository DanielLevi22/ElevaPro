import type { DailyGoal, ProfileSummary, StudentStreak } from '@elevapro/shared';

/**
 * O que a tela inicial recebe, e só isso.
 *
 * O módulo declara o próprio contrato em vez de importar as stores de onde os
 * dados nascem: gamificação, treinos, avaliação e saúde são outros módulos, e o
 * `CLAUDE.md` proíbe módulo importando módulo. Quem junta as fontes é a camada
 * de composição (`@/hooks/useDadosDaHome`), e aqui chega o resultado.
 */

/** De onde vieram passos, calorias e sono — e se o número é real. */
export type FonteDaSaude = 'device' | 'mock' | 'unavailable';

export interface SaudeDoDia {
  steps: number;
  calories: number;
  /** `null` é sem leitura, nunca zero. */
  sleepMinutes: number | null;
  source: FonteDaSaude;
}

export interface TreinoSugerido {
  id: string;
  title: string;
  muscle_group?: string | null;
  duration_minutes?: number;
  exercicios?: number;
}

/** A anamnese tem três estados, e é a informação principal da linha dela. */
export interface EstadoDaAnamnese {
  enviada: boolean;
  respostas: number;
}

export interface DadosDaHomeDoAluno {
  perfil: ProfileSummary | null;
  treinoSugerido: TreinoSugerido | null;
  saude: SaudeDoDia;
  metaDoDia: DailyGoal | null;
  /** Só o congelamento: a contagem é a `streakDays`. */
  ofensiva: StudentStreak | null;
  /**
   * Dias seguidos com treino ou refeição registrada, calculados das sessões e dos
   * registros (#312). `student_streaks` não tem quem grave nela.
   */
  streakDays: number;
  mostrarConfete: boolean;
  anamnese: EstadoDaAnamnese;
  carregando: boolean;
  recarregar: () => void;
}

export interface DadosDoPainelDoEspecialista {
  perfil: ProfileSummary | null;
  alunos: unknown[];
  treinos: unknown[];
  carregando: boolean;
  recarregar: () => void;
}

/** A meta do dia é percentual: o anel fecha em cem. */
export const PERCENTUAL_COMPLETO = 100;
