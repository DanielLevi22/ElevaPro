import type { Periodization, TrainingPlan } from '@elevapro/shared';
import { useEffect, useState } from 'react';
import { useWorkoutStore } from '../store/workoutStore';
import { useNomeDoEspecialista } from './useNomeDoEspecialista';

/**
 * A periodização do aluno e as fases dele, para a tela de fases.
 *
 * O aluno chega aqui pela lista de periodizações, que já carregou a dele; por
 * link direto a lista está vazia, e o hook a busca. As fases vêm do serviço
 * compartilhado, com a contagem de treinos de cada uma.
 *
 * O especialista entra só como nome curto. A política `profiles_read_own_and_linked`
 * (migration 0016) deixa o aluno ler o perfil de quem o acompanha, por
 * `private.is_my_specialist`, e a tela não precisa de mais que "Daniel L.".
 *
 * @example
 * const { periodizacao, fases, naoEncontrado } = useFasesDaPeriodizacao(id, aluno.id);
 */
interface FasesDaPeriodizacao {
  periodizacao: Periodization | null;
  fases: TrainingPlan[];
  especialista: string | null;
  /** Só depois de a busca voltar: antes dela, ausência é carregamento. */
  naoEncontrado: boolean;
}

export function useFasesDaPeriodizacao(
  periodizacaoId: string,
  alunoId: string
): FasesDaPeriodizacao {
  const loja = useWorkoutStore();
  const periodizacao = loja.periodizations.find((p) => p.id === periodizacaoId) ?? null;
  const buscou = useBuscaDaPeriodizacao(Boolean(periodizacao), periodizacaoId, alunoId);

  return {
    periodizacao,
    // A store guarda as fases da última periodização aberta: filtrar evita
    // mostrar as de outra periodização no instante antes da busca voltar.
    fases: loja.currentPeriodizationPhases.filter((f) => f.periodization_id === periodizacaoId),
    especialista: useNomeDoEspecialista(periodizacao?.specialist_id),
    naoEncontrado: buscou && !periodizacao,
  };
}

/** Busca a periodização se ainda não estiver na store, e as fases sempre. */
function useBuscaDaPeriodizacao(
  temPeriodizacao: boolean,
  periodizacaoId: string,
  alunoId: string
): boolean {
  const { fetchPeriodizations, fetchPeriodizationPhases } = useWorkoutStore();
  const [buscou, setBuscou] = useState(temPeriodizacao);

  useEffect(() => {
    if (temPeriodizacao) return;
    fetchPeriodizations(alunoId).finally(() => setBuscou(true));
  }, [temPeriodizacao, alunoId, fetchPeriodizations]);

  useEffect(() => {
    fetchPeriodizationPhases(periodizacaoId);
  }, [periodizacaoId, fetchPeriodizationPhases]);

  return buscou;
}
