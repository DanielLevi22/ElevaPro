import { createWorkoutsService, type ResumoDaPeriodizacao } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import { avisandoSeFalhar } from '@/lib/registro';

const servicoDeTreinos = createWorkoutsService(supabase);

/**
 * As periodizações do aluno para a lista de periodizações, buscadas a cada foco.
 *
 * A cada foco porque o especialista ativa, conclui e cria periodizações pelo
 * web: o aluno volta à aba e a lista precisa já estar como ele deixou. O
 * primeiro foco não busca de novo — a montagem acabou de buscar.
 *
 * @example
 * const { resumos, carregando, falhou } = useResumosDasPeriodizacoes(aluno.id);
 */
export function useResumosDasPeriodizacoes(alunoId: string): {
  resumos: ResumoDaPeriodizacao[];
  carregando: boolean;
  falhou: boolean;
} {
  const consulta = useQuery({
    queryKey: ['resumosDasPeriodizacoes', alunoId],
    queryFn: () =>
      avisandoSeFalhar('periodizacoes.listar', () =>
        servicoDeTreinos.fetchStudentPeriodizationSummaries(alunoId)
      ),
  });
  useBuscaNoFoco(consulta.refetch);

  return {
    resumos: consulta.data ?? [],
    carregando: consulta.isPending,
    falhou: consulta.isError,
  };
}

function useBuscaNoFoco(buscar: () => unknown): void {
  const primeiroFoco = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (primeiroFoco.current) {
        primeiroFoco.current = false;
        return;
      }
      buscar();
    }, [buscar])
  );
}
