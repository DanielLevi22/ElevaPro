/**
 * A nota que o especialista escreve sobre o progresso do Aluno (0057).
 *
 * Não é `workout_sessions.notes`, que é o que o aluno escreve sobre a sessão
 * dele. Esta é o registro do profissional, e o aluno só lê.
 */
export interface SpecialistNote {
  id: string;
  student_id: string;
  /** Nulo quando a conta do autor foi apagada: a nota é do histórico do aluno. */
  specialist_id: string | null;
  body: string;
  created_at: string;
  updated_at: string;
}

/** O autor, para a nota aparecer assinada. Vem do embed de `profiles`. */
export interface SpecialistNoteWithAuthor extends SpecialistNote {
  author_name: string | null;
}

/**
 * Colunas nomeadas, nunca `*`: coluna nova no banco sai sozinha para o cliente,
 * e aqui a que sairia é texto clínico.
 */
export const SPECIALIST_NOTE_COLUMNS =
  "id, student_id, specialist_id, body, created_at, updated_at" as const;

/** O limite do `CHECK` da tabela, para a tela avisar antes de o banco recusar. */
export const NOTE_MAX_LENGTH = 2000;
