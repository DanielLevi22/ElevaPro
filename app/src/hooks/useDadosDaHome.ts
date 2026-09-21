import {
  type AccountType,
  type Briefing,
  type BriefingSignal,
  contarExercicios,
  createAdherenceService,
  createAuthService,
  createBriefingService,
  type ProfileSummary,
} from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useAuthStore } from '@/auth';
import { showPushBanner } from '@/components/ui/pushBanner';
import { useDailyActivity } from '@/hooks/useDailyActivity';
import { useHealthData } from '@/hooks/useHealthData';
import { useAssessmentStore } from '@/modules/assessment';
import type {
  DadosDaHomeDoAluno,
  DadosDoPainelDoEspecialista,
  TreinoSugerido,
} from '@/modules/dashboard';
import {
  shouldShowRiskBanner,
  toSeenRiskSignal,
  useRiskBannerSeenStore,
} from '@/modules/dashboard';
import { useGamificationStore } from '@/modules/gamification';
import { useStudentStore } from '@/modules/students';
import { useWorkoutStore, type Workout } from '@/modules/workout';
import { getLocalDateISOString } from '@/utils/dateUtils';

/**
 * Os dados da tela inicial, juntados de cada módulo que os tem.
 *
 * Mora fora de `modules/` porque é composição: lê gamificação, treinos, alunos,
 * avaliação e saúde, e módulo não importa módulo. Cada tela do `dashboard`
 * recebe o recorte dela pronto, pelo contrato em `modules/dashboard/types.ts`.
 *
 * O perfil vem do serviço compartilhado, com só nome e avatar: a versão
 * anterior fazia `select('*')` e trazia email, papel e status sem uso.
 *
 * @example
 * const { accountType, aluno, especialista } = useDadosDaHome();
 */
export interface DadosDaHome {
  accountType: AccountType | null;
  isMasquerading: boolean;
  aluno: DadosDaHomeDoAluno;
  especialista: DadosDoPainelDoEspecialista;
}

const servicoDeAuth = createAuthService(supabase);
const briefingService = createBriefingService(supabase);
const adherenceService = createAdherenceService(supabase);

export function useDadosDaHome(): DadosDaHome {
  const { user, accountType, isMasquerading } = useAuthStore();
  const ehEspecialista = accountType === 'specialist';
  const fontes = useFontesDaHome(ehEspecialista ? undefined : user?.id);
  const { perfil, briefing, averageAdherence, recarregar } = useCarregamentoDaHome(
    user?.id,
    ehEspecialista,
    fontes
  );

  const treinoSugerido = useMemo(
    () => (ehEspecialista ? null : sugerirTreino(fontes.treinos.workouts)),
    [ehEspecialista, fontes.treinos.workouts]
  );

  return {
    accountType,
    isMasquerading,
    aluno: montarAluno(fontes, perfil, treinoSugerido, recarregar),
    especialista: {
      perfil,
      alunos: fontes.alunos.students,
      treinos: fontes.treinos.workouts,
      briefing,
      averageAdherence,
      carregando: estaCarregando(fontes),
      recarregar,
    },
  };
}

/** Cada módulo que a tela inicial lê, pela porta pública dele. */
function useFontesDaHome(studentId: string | undefined) {
  return {
    activity: useDailyActivity(studentId),
    gamificacao: useGamificationStore(),
    saude: useHealthData(),
    alunos: useStudentStore(),
    treinos: useWorkoutStore(),
    avaliacao: useAssessmentStore(),
  };
}

type FontesDaHome = ReturnType<typeof useFontesDaHome>;

/**
 * Busca o que o papel precisa, e de novo a cada foco.
 *
 * O foco dispara também na montagem, então basta ele. E a meta do dia muda em
 * outras telas: quem registra refeição volta aqui esperando o anel novo.
 */
function useCarregamentoDaHome(
  userId: string | undefined,
  ehEspecialista: boolean,
  fontes: FontesDaHome
): {
  perfil: ProfileSummary | null;
  briefing: Briefing | null;
  averageAdherence: number | null;
  recarregar: () => Promise<void>;
} {
  const [perfil, setPerfil] = useState<ProfileSummary | null>(null);
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [averageAdherence, setAverageAdherence] = useState<number | null>(null);
  const { fetchDailyData } = fontes.gamificacao;
  const { refetch: recarregarSaude } = fontes.saude;
  const { reload: reloadActivity } = fontes.activity;
  const { fetchStudents } = fontes.alunos;
  const { fetchWorkouts } = fontes.treinos;

  const recarregar = useCallback(async () => {
    if (!userId) return;
    setPerfil(await servicoDeAuth.getProfileSummary(userId));
    if (ehEspecialista) {
      const hoje = getLocalDateISOString();
      const [, , briefingResult, adherenceResult] = await Promise.all([
        fetchStudents(userId),
        fetchWorkouts(userId),
        briefingService.fetchBriefing(userId),
        adherenceService.fetchAdherence(userId, hoje),
      ]);
      setBriefing(briefingResult);
      setAverageAdherence(adherenceResult);
      notificarSinaisDeRisco(briefingResult.signals);
      return;
    }
    await Promise.all([
      fetchDailyData(getLocalDateISOString()),
      fetchWorkouts(userId),
      recarregarSaude(),
      reloadActivity(),
    ]);
  }, [
    userId,
    ehEspecialista,
    fetchStudents,
    fetchWorkouts,
    fetchDailyData,
    recarregarSaude,
    reloadActivity,
  ]);

  useFocusEffect(
    useCallback(() => {
      recarregar();
    }, [recarregar])
  );

  return { perfil, briefing, averageAdherence, recarregar };
}

/**
 * O balão de risco do especialista, um por aluno que mudou desde a última vez.
 *
 * Só `inactive`: é o único sinal com balão nesta entrega (#336) — os outros
 * três do mock não têm dado real por trás ainda. Roda a cada foco, junto do
 * resto do briefing, e marca visto na hora — sem isso o mesmo sinal reabriria
 * o balão a cada vez que o especialista voltasse ao app.
 */
function notificarSinaisDeRisco(signals: BriefingSignal[]): void {
  const { porAluno, marcarVisto } = useRiskBannerSeenStore.getState();

  for (const signal of signals) {
    if (signal.kind !== 'inactive') continue;

    const atual = toSeenRiskSignal(signal);
    if (!shouldShowRiskBanner(atual, porAluno[signal.studentId] ?? null)) continue;

    showPushBanner({
      tone: signal.tone,
      icon: 'triangle-alert',
      title: signal.studentName,
      body: signal.message,
    });
    marcarVisto(signal.studentId, atual);
  }
}

function estaCarregando({ gamificacao, alunos, treinos }: FontesDaHome): boolean {
  return gamificacao.isLoading || alunos.isLoading || treinos.isLoading;
}

function montarAluno(
  fontes: FontesDaHome,
  perfil: ProfileSummary | null,
  treinoSugerido: TreinoSugerido | null,
  recarregar: () => Promise<void>
): DadosDaHomeDoAluno {
  const { gamificacao, saude, avaliacao, activity } = fontes;
  return {
    perfil,
    treinoSugerido,
    saude,
    metaDoDia: gamificacao.dailyGoal,
    ofensiva: gamificacao.streak,
    streakDays: activity.streak.current,
    mostrarConfete: gamificacao.showConfetti,
    // Só a contagem sai daqui: a tela mostra o estado, não as respostas.
    anamnese: {
      enviada: avaliacao.isAnamnesisSubmitted,
      respostas: Object.keys(avaliacao.anamnesisResponses).length,
    },
    carregando: estaCarregando(fontes),
    recarregar,
  };
}

/**
 * O primeiro treino da lista, com o número de exercícios que houver.
 *
 * A contagem vem de `exercises_count` quando a consulta a trouxe, e do tamanho
 * da lista de exercícios quando veio a lista. Sem nenhum dos dois, o cartão
 * simplesmente não mostra a contagem — zero seria afirmar algo que não se sabe.
 */
export function sugerirTreino(treinos: Workout[]): TreinoSugerido | null {
  const [primeiro] = treinos;
  if (!primeiro) return null;
  return {
    id: primeiro.id,
    title: primeiro.title,
    muscle_group: primeiro.muscle_group,
    exercicios: contarExercicios(primeiro),
  };
}
