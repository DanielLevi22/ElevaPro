import { type ActiveBlock, createBlockService } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useQuery } from '@tanstack/react-query';
import { avisandoSeFalhar } from '@/lib/registro';

const blocks = createBlockService(supabase);

/**
 * O bloco ativo do próprio Praticante (#376), ou nulo para quem não tem — o
 * Aluno, cujo plano é do especialista. Mora fora dos módulos porque a sessão
 * de treino (descarga) e a tela inicial (fim do bloco) leem o mesmo bloco.
 *
 * Sem `studentId` não busca: quem chama desliga assim.
 *
 * @example const block = useActiveBlock(user.id);
 */
export function useActiveBlock(studentId: string | null): ActiveBlock | null {
  const { data } = useQuery({
    queryKey: ['active-block', studentId],
    enabled: Boolean(studentId),
    queryFn: () =>
      avisandoSeFalhar('block.read_active', () => blocks.activeBlock(studentId as string)),
  });
  return data ?? null;
}
