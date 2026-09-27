import { Redirect, useLocalSearchParams } from 'expo-router';
import { ROUTES } from '@/navigation/types';

/** O plano de dieta do aluno, visto pelo especialista, na tela nova (#337). */
export default function StudentDietPlanRoute() {
  const { planId } = useLocalSearchParams<{ planId: string }>();
  return <Redirect href={ROUTES.NUTRITION.PLAN(planId)} />;
}
