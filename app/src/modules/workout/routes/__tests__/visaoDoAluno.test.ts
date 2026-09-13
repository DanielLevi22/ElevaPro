import { comModo, ehVisaoDoAluno, modoDaRota, primeiroValor } from '../visaoDoAluno';

describe('ehVisaoDoAluno', () => {
  it('o aluno vê as telas de aluno em qualquer modo', () => {
    expect(ehVisaoDoAluno('student', undefined)).toBe(true);
  });

  // O membro monta o próprio plano: fora do modo de treinar, ele é o autor e
  // precisa editar. Mandá-lo para a visão do aluno tirava dele a edição.
  it('o membro só vê como aluno quando abre o plano para treinar', () => {
    expect(ehVisaoDoAluno('member', 'execute')).toBe(true);
    expect(ehVisaoDoAluno('member', undefined)).toBe(false);
  });

  it('o especialista nunca cai na visão do aluno por esta porta', () => {
    expect(ehVisaoDoAluno('specialist', 'execute')).toBe(false);
    expect(ehVisaoDoAluno(null, undefined)).toBe(false);
  });
});

describe('comModo', () => {
  it('sem modo, a rota segue como texto', () => {
    expect(comModo('/(tabs)/workouts/abc', undefined)).toBe('/(tabs)/workouts/abc');
  });

  it('com modo, ele viaja como parâmetro', () => {
    expect(comModo('/(tabs)/workouts/abc', 'execute')).toEqual({
      pathname: '/(tabs)/workouts/abc',
      params: { mode: 'execute' },
    });
  });
});

describe('parâmetros da rota', () => {
  it('pega o primeiro quando o parâmetro vem repetido', () => {
    expect(primeiroValor(['a', 'b'])).toBe('a');
    expect(primeiroValor(undefined)).toBeUndefined();
  });

  it('só reconhece o modo que o fluxo usa', () => {
    expect(modoDaRota('execute')).toBe('execute');
    expect(modoDaRota(['execute'])).toBe('execute');
    expect(modoDaRota('qualquer')).toBeUndefined();
  });
});
