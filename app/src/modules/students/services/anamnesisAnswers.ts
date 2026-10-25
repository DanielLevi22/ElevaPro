import type { AnamnesisSection } from '@elevapro/shared/data/anamnesisQuestions';

export interface AnsweredQuestion {
  id: string;
  question: string;
  /** `null` quando o aluno não respondeu: a tela escreve o vazio no tom apagado. */
  answer: string | null;
}

export interface AnsweredSection {
  id: string;
  title: string;
  questions: AnsweredQuestion[];
}

/**
 * As seções da anamnese com a resposta do aluno já em texto, para o especialista ler.
 *
 * Pergunta condicional cuja condição não bateu sai da lista, como no questionário:
 * mostrar "Não respondido" nela acusaria o aluno de pular o que nunca lhe foi perguntado.
 *
 * @example
 * answeredSections(GENERAL_ANAMNESIS, { smoker: false })
 * // [{ id: 'habits', title: 'Hábitos', questions: [{ id: 'smoker', question: 'Fuma?', answer: 'Não' }] }, …]
 */
export function answeredSections(
  sections: AnamnesisSection[],
  responses: Record<string, unknown>
): AnsweredSection[] {
  return sections.map((section) => ({
    id: section.id,
    title: section.title,
    questions: section.questions
      .filter(
        (q) => !q.condition || responses[q.condition.questionId] === q.condition.expectedValue
      )
      .map((q) => ({ id: q.id, question: q.text, answer: answerLabel(responses[q.id]) })),
  }));
}

/**
 * A resposta crua em texto de leitura.
 *
 * @example answerLabel(['Joelho', 'Ombro']) // 'Joelho, Ombro'
 */
export function answerLabel(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : null;
  return String(value);
}
