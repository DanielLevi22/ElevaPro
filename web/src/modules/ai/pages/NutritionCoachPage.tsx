"use client";

import { useParams } from "next/navigation";
import { useStudents } from "@/shared/hooks/useStudents";
import { NutritionCoachChat } from "../components/NutritionCoachChat";

export function NutritionCoachPage() {
  const params = useParams();
  const studentId = params.id as string;
  const { data: students = [] } = useStudents();
  const student = students.find((s) => s.id === studentId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2 text-primary">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <title>Coach de nutrição</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
            />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Coach de Nutrição</h2>
          {student?.full_name && (
            <p className="text-sm text-muted-foreground">
              Montando o plano alimentar de {student.full_name}
            </p>
          )}
        </div>
      </div>

      <NutritionCoachChat studentId={studentId} />
    </div>
  );
}
