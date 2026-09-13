import { type CicloDoAluno, createWorkoutsService } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

const servicoDeTreinos = createWorkoutsService(supabase);

/**
 * Os ciclos do aluno para a lista de periodizações, buscados a cada foco.
 *
 * A cada foco porque o especialista ativa, conclui e cria ciclos pelo web: o
 * aluno volta à aba e a lista precisa já estar como ele deixou.
 *
 * @example
 * const { ciclos, carregando, falhou } = useCiclosDoAluno(aluno.id);
 */
export function useCiclosDoAluno(alunoId: string): {
  ciclos: CicloDoAluno[];
  carregando: boolean;
  falhou: boolean;
} {
  const [ciclos, setCiclos] = useState<CicloDoAluno[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [falhou, setFalhou] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      servicoDeTreinos
        .fetchStudentCycles(alunoId)
        .then((lista) => {
          if (!ativo) return;
          setCiclos(lista);
          setFalhou(false);
        })
        .catch(() => {
          if (ativo) setFalhou(true);
        })
        .finally(() => {
          if (ativo) setCarregando(false);
        });
      return () => {
        ativo = false;
      };
    }, [alunoId])
  );

  return { ciclos, carregando, falhou };
}
