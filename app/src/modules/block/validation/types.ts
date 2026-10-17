/** Como a pessoa digitou: "77,6" e "82". A cintura é opcional. */
export interface MeasuresInput {
  weight: string;
  waist: string;
}

export type MeasuresResult =
  | { status: 'ready'; weightKg: number; waistCm: number | null }
  | { status: 'incomplete'; hint: string }
  | { status: 'invalid'; errors: Partial<Record<keyof MeasuresInput, string>>; hint: string };
