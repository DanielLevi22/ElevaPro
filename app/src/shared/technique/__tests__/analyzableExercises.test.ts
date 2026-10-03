import { ROUTES } from '@/navigation/types';
import { techniqueRouteFor } from '../analyzableExercises';

/**
 * Quais exercícios do treino levam à Análise de Técnica (#361).
 *
 * O critério do agachamento — quadril abaixo da linha do joelho, filmado de
 * lado — só vale para agachamento bilateral. Oferecer a análise num búlgaro
 * daria "faltou" a uma repetição correta, e o app prefere calar a chutar.
 */
describe('techniqueRouteFor', () => {
  it.each([
    'Agachamento',
    'Agachamento livre',
    'Agachamento com barra',
    'agachamento goblet',
    'Agachamento Sumô',
    'AGACHAMENTO NO SMITH',
    'Back Squat',
  ])('leva "%s" à análise do agachamento', (name) => {
    expect(techniqueRouteFor(name)).toBe(ROUTES.TECHNIQUE.SQUAT);
  });

  it.each([
    'Agachamento búlgaro',
    'Agachamento bulgaro',
    'Agachamento hack',
    'Agachamento pistol',
    'Agachamento unilateral',
    'Afundo',
    'Bulgarian split squat',
    'Supino reto',
    '',
    null,
    undefined,
  ])('não oferece análise para %p', (name) => {
    expect(techniqueRouteFor(name)).toBeNull();
  });
});
