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
 * O especialista entra só como nome curto: a RLS deixa o aluno ler o perfil de
 * quem o acompanha, e a tela não precisa de mais que "Daniel L.".
 *
 * @example
 * const { periodizacao, fases, especialista } = useFasesDoCiclo(id, aluno.id);
 */
interface FasesDoCiclo {
  periodizacao: Periodization | null;
  fases: TrainingPlan[];
  especialista: string | null;
  carregando: boolean;
}

const servicoDeAuth = createAuthService(supabase);

export function useFasesDoCiclo(periodizacaoId: string, alunoId: string): FasesDoCiclo {
  const {
    periodizations,
    fetchPeriodizations,
    currentPeriodizationPhases,
    fetchPeriodizationPhases,
    isLoading,
  } = useWorkoutStore();
  const periodizacao = periodizations.find((p) => p.id === periodizacaoId) ?? null;
  const especialista = useNomeDoEspecialista(periodizacao?.specialist_id);

  useEffect(() => {
    if (!periodizacao) fetchPeriodizations(alunoId);
  }, [periodizacao, alunoId, fetchPeriodizations]);

  useEffect(() => {
    fetchPeriodizationPhases(periodizacaoId);
  }, [periodizacaoId, fetchPeriodizationPhases]);

  return {
    periodizacao,
    // A store guarda as fases da última periodização aberta: filtrar evita
    // mostrar as de outro ciclo no instante antes da busca voltar.
    fases: currentPeriodizationPhases.filter((fase) => fase.periodization_id === periodizacaoId),
    especialista,
    carregando: isLoading,
  };
}

function useNomeDoEspecialista(especialistaId: string | undefined): string | null {
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
