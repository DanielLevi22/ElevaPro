import { act, renderHook } from '@testing-library/react-native';
import { useCadastroDeAluno } from '../useCadastroDeAluno';

describe('useCadastroDeAluno', () => {
  it('começa na etapa de dados, sem serviço selecionado', () => {
    const { result } = renderHook(() =>
      useCadastroDeAluno({ servicosOferecidos: ['personal_training'] })
    );

    expect(result.current.etapa).toBe('dados');
    expect(result.current.serviceTypes).toEqual([]);
  });

  it('alterna um serviço oferecido pelo especialista', () => {
    const { result } = renderHook(() =>
      useCadastroDeAluno({ servicosOferecidos: ['personal_training', 'nutrition_consulting'] })
    );

    act(() => result.current.alternarServico('personal_training'));
    expect(result.current.serviceTypes).toEqual(['personal_training']);

    act(() => result.current.alternarServico('nutrition_consulting'));
    expect(result.current.serviceTypes).toEqual(['personal_training', 'nutrition_consulting']);

    act(() => result.current.alternarServico('personal_training'));
    expect(result.current.serviceTypes).toEqual(['nutrition_consulting']);
  });

  // Art. 6°, III (necessidade): o seletor só pode marcar o que o próprio
  // especialista presta — a issue #332 pede a mesma trava do lado do BFF,
  // esta é a que impede o dado inválido de nem sair do formulário.
  it('ignora um serviço que o especialista não presta', () => {
    const { result } = renderHook(() =>
      useCadastroDeAluno({ servicosOferecidos: ['personal_training'] })
    );

    act(() => result.current.alternarServico('nutrition_consulting'));

    expect(result.current.serviceTypes).toEqual([]);
  });

  it('impede avançar sem nome, e-mail ou nenhum serviço selecionado', () => {
    const { result } = renderHook(() =>
      useCadastroDeAluno({ servicosOferecidos: ['personal_training'] })
    );

    expect(result.current.impedimento).toBe('Preencha nome, e-mail e o tipo de acompanhamento.');

    act(() => result.current.setFullName('Marina Alves'));
    act(() => result.current.setEmail('marina@exemplo.com'));
    expect(result.current.impedimento).toBe('Preencha nome, e-mail e o tipo de acompanhamento.');

    act(() => result.current.alternarServico('personal_training'));
    expect(result.current.impedimento).toBeNull();
  });

  it('conclui o convite e guarda o id do aluno criado', () => {
    const { result } = renderHook(() =>
      useCadastroDeAluno({ servicosOferecidos: ['personal_training'] })
    );

    act(() => result.current.concluirConvite('aluno-9'));

    expect(result.current.etapa).toBe('convite');
    expect(result.current.studentId).toBe('aluno-9');
  });
});
