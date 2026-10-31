import { MAIN_GOALS, TRAINING_PLACES as PLACES } from '@elevapro/shared';
import { GOAL_OPTIONS, TRAINING_PLACES } from '../choices';

/*
 * O onboarding e a reavaliação (B2) gravam o valor, e a geração do plano e a
 * meta da dieta comparam com ele. Um valor que mudasse aqui sem mudar lá
 * gravaria uma resposta que ninguém reconhece.
 */
describe('as escolhas do onboarding', () => {
  it('os objetivos gravam os valores que a meta e a geração conhecem', () => {
    for (const option of GOAL_OPTIONS) expect(MAIN_GOALS).toContain(option.value);
  });

  it('os locais gravam os valores do catálogo da anamnese', () => {
    const known: readonly string[] = Object.values(PLACES);
    for (const option of TRAINING_PLACES) expect(known).toContain(option.value);
  });
});
