import { isImmersiveRoute } from '../immersiveRoutes';

describe('isImmersiveRoute', () => {
  it.each([
    '/workouts/details/abc-123',
    '/workouts/execute/abc-123',
    '/workouts/abc-123',
    '/students/aluno-1/workouts/details/abc-123',
  ])('esconde a navegação em %s', (pathname) => {
    expect(isImmersiveRoute(pathname)).toBe(true);
  });

  it.each([
    '/workouts',
    '/workouts/create',
    '/workouts/create-periodization',
    '/workouts/select-exercises',
    '/workouts/periodizations/abc-123',
    '/workouts/cardio/abc-123',
    '/students/aluno-1/workouts',
    '/nutrition',
    '/',
  ])('mantém a navegação em %s', (pathname) => {
    expect(isImmersiveRoute(pathname)).toBe(false);
  });

  it('não confunde rota fixa com id de treino', () => {
    // `/workouts/create` e `/workouts/<id>` têm a mesma forma; só a lista de
    // segmentos reservados separa as duas.
    expect(isImmersiveRoute('/workouts/create')).toBe(false);
    expect(isImmersiveRoute('/workouts/created')).toBe(true);
  });
});
