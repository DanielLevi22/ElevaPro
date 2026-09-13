import { isImmersiveRoute } from '../immersiveRoutes';

describe('isImmersiveRoute', () => {
  describe('fora da visão do aluno — as telas antigas de quem monta o plano', () => {
    it.each([
      '/workouts/details/abc-123',
      '/workouts/abc-123',
      '/students/aluno-1/workouts/details/abc-123',
    ])('esconde a navegação em %s', (pathname) => {
      expect(isImmersiveRoute(pathname)).toBe(true);
    });
  });

  // O kit desenha detalhe, sessão e resumo com a tab bar. Escondê-la deixava a
  // faixa vazia embaixo e as proporções diferentes do desenho.
  describe('na visão do aluno — as telas do kit', () => {
    it.each([
      '/workouts/details/abc-123',
      '/workouts/abc-123',
      '/workouts/execute/abc-123',
    ])('mantém a navegação em %s', (pathname) => {
      expect(isImmersiveRoute(pathname, true)).toBe(false);
    });

    it('esconde na ficha do aluno, que é sempre do especialista', () => {
      expect(isImmersiveRoute('/students/aluno-1/workouts/details/abc-123', true)).toBe(true);
    });
  });

  it('mantém a navegação na sessão de treino para qualquer papel', () => {
    expect(isImmersiveRoute('/workouts/execute/abc-123', false)).toBe(false);
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
