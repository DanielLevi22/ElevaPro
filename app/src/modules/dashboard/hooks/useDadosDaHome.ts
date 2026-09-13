import { supabase } from '@elevapro/supabase';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/auth';
import { useHealthData } from '@/hooks/useHealthData';
import { useGamificationStore } from '@/modules/gamification/store/gamificationStore';
import { useStudentStore } from '@/modules/students';
import { useWorkoutStore } from '@/modules/workout';
import { getLocalDateISOString } from '@/utils/dateUtils';

/**
 * Os dados da tela inicial, e quando recarregá-los.
 *
 * Sai da tela porque é orquestração: quatro fontes, duas combinações diferentes
 * conforme o papel, e o recarregamento no foco. A tela fica com a composição.
 *
 * @example
 * const { perfil, treinoSugerido, carregando, recarregar } = useDadosDaHome();
 */

// Colunas de `profiles` são nuláveis no banco, não `undefined`: o perfil nasce
// no signup com quase tudo em branco.
export interface PerfilDaHome {
  id?: string;
  full_name?: string | null;
  avatar_url?: string | null;
  [key: string]: unknown;
}

export interface TreinoSugerido {
  id: string;
  title: string;
  muscle_group?: string | null;
  duration_minutes?: number;
}

export function useDadosDaHome() {
  const { user, accountType } = useAuthStore();
  const gamificacao = useGamificationStore();
  const saude = useHealthData();
  const { students, fetchStudents, isLoading: carregandoAlunos } = useStudentStore();
  const { workouts, fetchWorkouts, isLoading: carregandoTreinos } = useWorkoutStore();

  const [perfil, setPerfil] = useState<PerfilDaHome | null>(null);
  const [treinoSugerido, setTreinoSugerido] = useState<TreinoSugerido | null>(null);

  const recarregar = useCallback(async () => {
    if (!user?.id) return;

    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    setPerfil(data);

    if (accountType === 'specialist') {
      await Promise.all([fetchStudents(user.id), fetchWorkouts(user.id)]);
      return;
    }
    await Promise.all([
      gamificacao.fetchDailyData(getLocalDateISOString()),
      fetchWorkouts(user.id),
      saude.refetch(),
    ]);
  }, [
    user?.id,
    accountType,
    fetchStudents,
    fetchWorkouts,
    gamificacao.fetchDailyData,
    saude.refetch,
  ]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  // Recarrega ao voltar para a aba: a meta do dia muda em outras telas — quem
  // registra refeição na nutrição volta aqui esperando o anel já atualizado.
  useFocusEffect(
    useCallback(() => {
      recarregar();
    }, [recarregar])
  );

  useEffect(() => {
    if (accountType !== 'specialist' && workouts.length > 0) {
      setTreinoSugerido(workouts[0]);
    }
  }, [workouts, accountType]);

  return {
    perfil,
    treinoSugerido,
    saude,
    gamificacao,
    students,
    workouts,
    accountType,
    carregando: gamificacao.isLoading || carregandoAlunos || carregandoTreinos,
    recarregar,
  };
}
