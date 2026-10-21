"use client";

import type { Workout } from "@elevapro/shared";
import { useAuthUser } from "@/shared/hooks/useAuthUser";
import { usePeriodization } from "@/shared/hooks/usePeriodizations";
import { useStudents } from "@/shared/hooks/useStudents";
import { useTrainingPlan } from "@/shared/hooks/useTrainingPlans";
import { exportWorkoutToPDF } from "@/shared/utils/exportWorkoutPDF";

/**
 * Exporta o treino em PDF com o cabeçalho do protocolo: o aluno sai da
 * periodização da fase (ou do próprio treino, no do Praticante) e a vigência
 * das datas da fase.
 *
 * @example const exportPdf = useWorkoutPdf(workout); <Button onClick={exportPdf}>Exportar PDF</Button>
 */
export function useWorkoutPdf(workout: Workout | null | undefined): () => void {
  const { data: phase } = useTrainingPlan(workout?.training_plan_id ?? "");
  const { data: periodization } = usePeriodization(phase?.periodization_id ?? "");
  const { data: students = [] } = useStudents();
  const { data: currentUser } = useAuthUser();

  return () => {
    if (!workout) return;
    const studentId = periodization?.student_id ?? workout.student_id;
    exportWorkoutToPDF({
      workout: { title: workout.title, exercises: workout.exercises ?? [] },
      studentName: students.find((s) => s.id === studentId)?.full_name ?? "Aluno",
      professionalName: currentUser?.fullName ?? "Profissional",
      validity: phase ? { start: phase.start_date, end: phase.end_date } : null,
    });
  };
}
