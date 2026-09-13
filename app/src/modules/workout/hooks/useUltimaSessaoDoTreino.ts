import { createWorkoutsService, type SessaoComSeries } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useEffect, useState } from 'react';

const servicoDeTreinos = createWorkoutsService(supabase);

/**
 * A última vez que o aluno fez este treino, série a série.
 *
 * Alimenta três lugares da sessão: o "Último: 12 ago · volume 4,0 t" do
 * pré-início, o selo "+2,5 kg" do cartão em execução e as evoluções do resumo.
 * Falhar aqui não impede o treino — só some a comparação.
 *
 * @example
 * const anterior = useUltimaSessaoDoTreino(treino.id, aluno.id);
 */
export function useUltimaSessaoDoTreino(treinoId: string, alunoId: string): SessaoComSeries | null {
  const [anterior, setAnterior] = useState<SessaoComSeries | null>(null);

  useEffect(() => {
    let ativo = true;
    servicoDeTreinos
      .fetchUltimaSessaoDoTreino(treinoId, alunoId)
      .then((sessao) => {
        if (ativo) setAnterior(sessao);
      })
      .catch(() => {
        console.log('[useUltimaSessaoDoTreino] sem a sessão anterior; segue sem comparação');
      });
    return () => {
      ativo = false;
    };
  }, [treinoId, alunoId]);

  return anterior;
}
