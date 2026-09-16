import { useAuthStore } from '@/auth';
import { PeriodReportScreen } from '@/modules/progress';

export default function PeriodReportRoute() {
  const { user } = useAuthStore();
  if (!user?.id) return null;
  // O nome que já aparece no app, e o único identificador que vai ao PDF (#312 §5).
  // Sem nome preenchido a folha sai sem ele: "Aluno" seria errado para o
  // Praticante, que não tem especialista nenhum (ADR-0028).
  return (
    <PeriodReportScreen studentId={user.id} studentName={user.user_metadata?.full_name ?? null} />
  );
}
