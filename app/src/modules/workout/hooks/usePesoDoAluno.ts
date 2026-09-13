import { createWorkoutsService } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { skipToken, useQuery } from '@tanstack/react-query';
import { avisandoSeFalhar } from '@/lib/registro';

const servicoDeTreinos = createWorkoutsService(supabase);

/**
 * Peso padrão. Só vale enquanto nenhuma das duas origens responde — e é por
 * isso que ele nunca deve ser silencioso: quando este número aparece para
 * todo mundo, é sinal de que a leitura quebrou.
 */
const PESO_PADRAO_KG = 70;

/**
 * Peso do aluno para o cálculo de gasto calórico.
 *
 * A consulta mora no `shared` (`fetchPesoParaGasto`): a avaliação física mais
 * recente e, na falta dela, o peso declarado na anamnese. O padrão é decidido
 * aqui, e não lá, para um número inventado não se passar por medido. A falha
 * vai ao log sem o erro: `responses` da anamnese é dado sensível de saúde, e o
 * erro do PostgREST pode carregar a linha inteira.
 *
 * @example
 * const pesoKg = usePesoDoAluno(user?.id);
 */
export function usePesoDoAluno(studentId: string | undefined): number {
  const { data } = useQuery({
    queryKey: ['pesoDoAluno', studentId],
    queryFn: studentId
      ? () => avisandoSeFalhar('peso.ler', () => servicoDeTreinos.fetchPesoParaGasto(studentId))
      : skipToken,
  });
  return data ?? PESO_PADRAO_KG;
}
