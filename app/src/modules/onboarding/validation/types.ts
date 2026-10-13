import type { SEX_OPTIONS } from './constants';

export type BiologicalSexAnswer = (typeof SEX_OPTIONS)[number]['value'];

/** O que a pessoa digitou em O4, como texto: o campo ainda pode estar pela metade. */
export interface AboutYouInput {
  age: string;
  height: string;
  weight: string;
  sex: BiologicalSexAnswer | null;
}

/**
 * Os números lidos, no formato que a anamnese grava. `type`, e não `interface`,
 * para caber em `Record<string, unknown>`, que é o que a gravação recebe.
 */
export type AboutYouAnswers = {
  age: number;
  height: number;
  weight: number;
  gender: BiologicalSexAnswer;
};

export type AboutYouField = 'age' | 'height' | 'weight';

/** Quem monta só treino responde só a idade em O4: o corpo não entra no plano dele. */
export type AboutYouFields = 'full' | 'ageOnly';

/**
 * O que O4 faz com a digitação.
 *
 * `minor` é resultado, e não erro de campo: a idade está certa, e a resposta é
 * orientar, não pedir para corrigir.
 */
export type AboutYouResult =
  | { status: 'ready'; answers: AboutYouAnswers | Pick<AboutYouAnswers, 'age'> }
  | { status: 'incomplete' }
  | { status: 'invalid'; errors: Partial<Record<AboutYouField, string>> }
  | { status: 'minor' };
