import { createWorkoutsService, type SessaoComSeries } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useQuery } from '@tanstack/react-query';
import { avisandoSeFalhar } from '@/lib/registro';

const servicoDeTreinos = createWorkoutsService(supabase);

/**
 * A última vez que o aluno fez este treino, série a série.
 *
 * Alimenta três lugares da sessão: o "Último: 12 ago · volume 4,0 t" do
 * pré-início, o selo "+2,5 kg" do cartão em execução e as evoluções do resumo.
 * Falhar aqui não impede o treino — só some a comparação.
 *
 * Velha na hora (`staleTime: 0`): a próxima sessão tem de comparar com a que
 * acabou de ser gravada. E sem invalidar ao gravar, de propósito — o resumo
 * ainda está na tela, e comparar a sessão com ela mesma zeraria as evoluções.
 *
 * @example
 * const anterior = useUltimaSessaoDoTreino(treino.id, aluno.id);
 */
export function useUltimaSessaoDoTreino(treinoId: string, alunoId: string): SessaoComSeries | null {
  const { data } = useQuery({
    queryKey: ['ultimaSessaoDoTreino', treinoId, alunoId],
    queryFn: () =>
      avisandoSeFalhar('sessao.lerAnterior', () =>
        servicoDeTreinos.fetchUltimaSessaoDoTreino(treinoId, alunoId)
      ),
    staleTime: 0,
  });
  return data ?? null;
}
