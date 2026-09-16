/** Se o usuário está no placar global: ainda consultando, dentro ou fora. */
export type RankingParticipation = 'checking' | 'in' | 'out';

/** Quem pode entrar no placar global, com o estado e as duas ações. */
export interface ParticipantViewer {
  kind: 'participant';
  participation: RankingParticipation;
  busy: boolean;
  join: () => Promise<void>;
  leave: () => Promise<void>;
}

/**
 * Quem olha a aba. O especialista não participa do global (ADR-0032) e vê só o
 * placar dos próprios alunos, então não tem estado de participação nem ações.
 */
export type RankingViewer = { kind: 'specialist' } | ParticipantViewer;
