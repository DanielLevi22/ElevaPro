import { supabase } from '@elevapro/supabase';
import { useEffect, useState } from 'react';

/**
 * Peso padrão. Só vale enquanto nenhuma das duas origens responde — e é por
 * isso que ele nunca deve ser silencioso: quando este número aparece para
 * todo mundo, é sinal de que a leitura quebrou.
 */
const PESO_PADRAO_KG = 70;

/**
 * Peso do aluno para o cálculo de gasto calórico.
 *
 * Duas origens, nesta ordem: a avaliação física mais recente e, na falta dela,
 * o peso declarado na anamnese — que vale mais que um padrão inventado, porque
 * foi o próprio aluno que informou.
 *
 * Até a correção de 2026-08, isto lia `profiles.weight` e caía em
 * `physical_assessments.weight`, **as duas inexistentes**. As consultas
 * falhavam com 42703, o erro era engolido, e toda sessão de cardio calculava
 * caloria com 70 kg, para qualquer pessoa.
 *
 * @example
 * const pesoKg = usePesoDoAluno(user?.id);
 */
export function usePesoDoAluno(studentId: string | undefined): number {
  const [pesoKg, setPesoKg] = useState(PESO_PADRAO_KG);

  useEffect(() => {
    if (!studentId) return;

    async function buscarPeso(id: string) {
      try {
        const { data: avaliacao, error } = await supabase
          .from('physical_assessments')
          .select('weight_kg')
          .eq('student_id', id)
          .not('weight_kg', 'is', null)
          .order('assessed_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        if (avaliacao?.weight_kg) {
          setPesoKg(Number(avaliacao.weight_kg));
          return;
        }

        // O erro precisa ser lido: o PostgREST devolve `{ data: null, error }`
        // em vez de lançar, e sem isto a RLS negando a anamnese chega aqui
        // idêntica a um aluno que nunca a preencheu — os dois caem no padrão
        // de 70 kg em silêncio.
        const { data: anamnese, error: erroDaAnamnese } = await supabase
          .from('student_anamnesis')
          .select('responses')
          .eq('student_id', id)
          .maybeSingle();

        if (erroDaAnamnese) throw erroDaAnamnese;

        const declarado = (anamnese?.responses as Record<string, { value?: unknown }> | null)
          ?.weight?.value;

        if (typeof declarado === 'number' && declarado > 0) setPesoKg(declarado);
      } catch {
        // Sem o objeto de erro: `responses` da anamnese é dado sensível de
        // saúde, e o erro do PostgREST pode carregar a linha inteira.
        console.log('[usePesoDoAluno] falha ao ler o peso; usando o padrão');
      }
    }

    buscarPeso(studentId);
  }, [studentId]);

  return pesoKg;
}
