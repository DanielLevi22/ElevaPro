import { renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { SpecialistProgressProvider, useProgressNavigation } from '../ProgressNavigation';

function specialistWrapper({ children }: { children: ReactNode }) {
  return (
    <SpecialistProgressProvider studentId="aluno-1" studentName="Ana Rocha" onBack={jest.fn()}>
      {children}
    </SpecialistProgressProvider>
  );
}

describe('useProgressNavigation', () => {
  it('sem provedor, é o aluno olhando o próprio progresso, na aba dele', () => {
    const { result } = renderHook(() => useProgressNavigation());
    expect(result.current.viewer).toBe('self');
    expect(result.current.routes.loads).toBe('/(tabs)/progress/loads');
    expect(result.current.onBack).toBeNull();
  });

  it('com o especialista, navega dentro da pilha de Alunos, para o aluno certo', () => {
    const { result } = renderHook(() => useProgressNavigation(), { wrapper: specialistWrapper });
    expect(result.current.viewer).toBe('specialist');
    expect(result.current.routes.loads).toEqual({
      pathname: '/(tabs)/students/[id]/progress/loads',
      params: { id: 'aluno-1' },
    });
  });

  // Art. 18, III da LGPD: corrigir a medida declarada e o feedback da sessão é
  // direito do titular sobre o que ELE declarou. Terceiro editando a declaração
  // alheia não é correção, é falsificação (docs/LGPD_COMPLIANCE.md, §
  // workout_sessions). O especialista abre o mesmo fluxo do aluno, então o
  // caminho para esses formulários precisa não existir do lado dele.
  it('o especialista não alcança a correção do que o aluno declarou', () => {
    const { result } = renderHook(() => useProgressNavigation(), { wrapper: specialistWrapper });
    const { measurementForm, sessionHistory } = result.current.routes;

    if (measurementForm !== null || sessionHistory !== null) {
      throw new Error(
        'CORREÇÃO POR TERCEIRO: o especialista ganhou rota para editar a declaração do aluno'
      );
    }
  });
});
