import { createWorkoutsService, inicioDaSemanaISO, type SessaoConcluida } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

const servicoDeTreinos = createWorkoutsService(supabase);

/**
 * A última sessão do aluno e as desta semana, buscadas de novo a cada foco.
 *
 * Pelo serviço do `shared`, e não pela store: a store de treino ainda consulta
 * o Supabase direto nessas leituras (#292), e é a tela do especialista que a
 * usa até o lote do professor.
 *
 * @example
 * const { ultima, daSemana } = useSessoesDoAluno(aluno.id);
 */
export function useSessoesDoAluno(alunoId: string): {
  ultima: SessaoConcluida | null;
  daSemana: SessaoConcluida[];
} {
  const [ultima, setUltima] = useState<SessaoConcluida | null>(null);
  const [daSemana, setDaSemana] = useState<SessaoConcluida[]>([]);

  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      Promise.all([
        servicoDeTreinos.fetchLastWorkoutSession(alunoId),
        servicoDeTreinos.fetchCompletedSessionsSince(alunoId, inicioDaSemanaISO(new Date())),
      ]).then(([ultimaSessao, sessoes]) => {
        if (!ativo) return;
        setUltima(ultimaSessao);
        setDaSemana(sessoes);
      });
      return () => {
        ativo = false;
      };
    }, [alunoId])
  );

  return { ultima, daSemana };
}
