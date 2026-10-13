import {
  type AccountType,
  createAuthService,
  createGamificationService,
  createProgressService,
  nomeCurto,
} from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useQuery } from '@tanstack/react-query';
import { avisandoSeFalhar } from '@/lib/registro';

const auth = createAuthService(supabase);
const gamification = createGamificationService(supabase);
const progress = createProgressService(supabase);

/** O que o perfil do aluno mostra além do nome: os números e quem acompanha. */
export interface StudentOverview {
  workoutsDone: number;
  achievements: number;
  currentStreakDays: number;
  longestStreakDays: number;
  /** A periodização ativa: o "Meu plano" do Praticante. */
  planName: string | null;
  /** O nome curto do especialista: o "Meu especialista" do Aluno. */
  specialistName: string | null;
}

export interface ProfileOverview {
  fullName: string | null;
  accountType: AccountType | null;
  student: StudentOverview | null;
}

const STUDENT_TYPES: AccountType[] = ['student', 'member'];

/**
 * O perfil (09 · Perfil): o nome e o papel de todo mundo, e para o aluno os
 * números e quem acompanha. As leituras são independentes e vão juntas.
 *
 * @example const { data: perfil } = useProfileOverview(user.id);
 */
export function useProfileOverview(userId: string | null) {
  return useQuery<ProfileOverview>({
    queryKey: ['profile-overview', userId],
    enabled: Boolean(userId),
    queryFn: () => avisandoSeFalhar('account.overview', () => loadOverview(userId as string)),
  });
}

async function loadOverview(userId: string): Promise<ProfileOverview> {
  const profile = await auth.getProfile(userId);
  const accountType = profile?.account_type ?? null;
  const student =
    accountType && STUDENT_TYPES.includes(accountType) ? await loadStudent(userId) : null;
  return { fullName: profile?.full_name ?? null, accountType, student };
}

async function loadStudent(userId: string): Promise<StudentOverview> {
  const [history, achievements, streak, context] = await Promise.all([
    progress.listActivityHistory(userId),
    gamification.getAchievements(userId),
    gamification.getStreak(userId),
    progress.getPeriodContext(userId),
  ]);
  return {
    workoutsDone: history.sessions.filter((session) => !session.cardio).length,
    achievements: achievements.length,
    currentStreakDays: streak?.current_streak ?? 0,
    longestStreakDays: streak?.longest_streak ?? 0,
    planName: context.periodization,
    specialistName: context.specialist ? nomeCurto(context.specialist) : null,
  };
}
