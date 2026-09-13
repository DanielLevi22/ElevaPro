import { createWorkoutsService } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useEffect, useState } from 'react';

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
 * aqui, e não lá, para um número inventado não se passar por medido.
 *
 * @example
 * const pesoKg = usePesoDoAluno(user?.id);
 */
export function usePesoDoAluno(studentId: string | undefined): number {
  const [pesoKg, setPesoKg] = useState(PESO_PADRAO_KG);

  useEffect(() => {
    if (!studentId) return;
    let ativo = true;
    servicoDeTreinos
      .fetchPesoParaGasto(studentId)
      .then((peso) => {
        if (ativo && peso !== null) setPesoKg(peso);
      })
      .catch(() => {
        // Sem o objeto de erro: `responses` da anamnese é dado sensível de
        // saúde, e o erro do PostgREST pode carregar a linha inteira.
        console.log('[usePesoDoAluno] falha ao ler o peso; usando o padrão');
      });
    return () => {
      ativo = false;
    };
  }, [studentId]);

  return pesoKg;
}
