import { act, renderHook } from '@testing-library/react-native';
import { useStudentRegistration } from '../useStudentRegistration';

describe('useStudentRegistration', () => {
  it('começa na etapa de dados, sem serviço selecionado', async () => {
    const { result } = await renderHook(() =>
      useStudentRegistration({ offeredServices: ['personal_training'] })
    );

    expect(result.current.step).toBe('data');
    expect(result.current.serviceTypes).toEqual([]);
  });

  it('alterna um serviço oferecido pelo especialista', async () => {
    const { result } = await renderHook(() =>
      useStudentRegistration({ offeredServices: ['personal_training', 'nutrition_consulting'] })
    );

    await act(() => result.current.toggleService('personal_training'));
    expect(result.current.serviceTypes).toEqual(['personal_training']);

    await act(() => result.current.toggleService('nutrition_consulting'));
    expect(result.current.serviceTypes).toEqual(['personal_training', 'nutrition_consulting']);

    await act(() => result.current.toggleService('personal_training'));
    expect(result.current.serviceTypes).toEqual(['nutrition_consulting']);
  });

  // Art. 6°, III (necessidade): o seletor só pode marcar o que o próprio
  // especialista presta — a issue #332 pede a mesma trava do lado do BFF,
  // esta é a que impede o dado inválido de nem sair do formulário.
  it('ignora um serviço que o especialista não presta', async () => {
    const { result } = await renderHook(() =>
      useStudentRegistration({ offeredServices: ['personal_training'] })
    );

    await act(() => result.current.toggleService('nutrition_consulting'));

    expect(result.current.serviceTypes).toEqual([]);
  });

  it('impede avançar sem nome, e-mail ou nenhum serviço selecionado', async () => {
    const { result } = await renderHook(() =>
      useStudentRegistration({ offeredServices: ['personal_training'] })
    );

    expect(result.current.blockingReason).toBe('Preencha nome, e-mail e o tipo de acompanhamento.');

    await act(() => result.current.setFullName('Marina Alves'));
    await act(() => result.current.setEmail('marina@exemplo.com'));
    expect(result.current.blockingReason).toBe('Preencha nome, e-mail e o tipo de acompanhamento.');

    await act(() => result.current.toggleService('personal_training'));
    expect(result.current.blockingReason).toBeNull();
  });

  it('conclui o convite e guarda o id do aluno criado', async () => {
    const { result } = await renderHook(() =>
      useStudentRegistration({ offeredServices: ['personal_training'] })
    );

    await act(() => result.current.completeInvite('aluno-9'));

    expect(result.current.step).toBe('invite');
    expect(result.current.studentId).toBe('aluno-9');
  });

  it('troca a seleção inteira, descartando serviço que o especialista não presta', async () => {
    const { result } = await renderHook(() =>
      useStudentRegistration({ offeredServices: ['personal_training'] })
    );

    await act(() => result.current.selectServices(['personal_training', 'nutrition_consulting']));
    expect(result.current.serviceTypes).toEqual(['personal_training']);
  });
});
