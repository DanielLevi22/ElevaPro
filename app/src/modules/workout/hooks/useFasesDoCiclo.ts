import {
  createAuthService,
  nomeCurto,
  type Periodization,
  type TrainingPlan,
} from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useEffect, useState } from 'react';
import { useWorkoutStore } from '../store/workoutStore';

/**
 * O ciclo do aluno e as fases dele, para a tela de fases.
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
 * const { periodizacao, fases, naoEncontrado } = useFasesDoCiclo(id, aluno.id);
 */
interface FasesDoCiclo {
  periodizacao: Periodization | null;
  fases: TrainingPlan[];
  especialista: string | null;
  /** Só depois de a busca voltar: antes dela, ausência é carregamento. */
  naoEncontrado: boolean;
}

const servicoDeAuth = createAuthService(supabase);

export function useFasesDoCiclo(periodizacaoId: string, alunoId: string): FasesDoCiclo {
  const loja = useWorkoutStore();
  const periodizacao = loja.periodizations.find((p) => p.id === periodizacaoId) ?? null;
  const buscou = useBuscaDoCiclo(Boolean(periodizacao), periodizacaoId, alunoId);

  return {
    periodizacao,
    // A store guarda as fases da última periodização aberta: filtrar evita
    // mostrar as de outro ciclo no instante antes da busca voltar.
    fases: loja.currentPeriodizationPhases.filter((f) => f.periodization_id === periodizacaoId),
    especialista: useNomeDoEspecialista(periodizacao?.specialist_id),
    naoEncontrado: buscou && !periodizacao,
  };
}

/** Busca o ciclo se ainda não estiver na store, e as fases sempre. */
function useBuscaDoCiclo(temCiclo: boolean, periodizacaoId: string, alunoId: string): boolean {
  const { fetchPeriodizations, fetchPeriodizationPhases } = useWorkoutStore();
  const [buscou, setBuscou] = useState(temCiclo);

  useEffect(() => {
    if (temCiclo) return;
    fetchPeriodizations(alunoId).finally(() => setBuscou(true));
  }, [temCiclo, alunoId, fetchPeriodizations]);

  useEffect(() => {
    fetchPeriodizationPhases(periodizacaoId);
  }, [periodizacaoId, fetchPeriodizationPhases]);

  return buscou;
}

function useNomeDoEspecialista(especialistaId: string | null | undefined): string | null {
  const [nome, setNome] = useState<string | null>(null);

  useEffect(() => {
    if (!especialistaId) return;
    let ativo = true;
    servicoDeAuth.getProfileSummary(especialistaId).then((perfil) => {
      if (ativo) setNome(nomeCurto(perfil?.full_name));
    });
    return () => {
      ativo = false;
    };
  }, [especialistaId]);

  return nome;
}
