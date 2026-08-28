"use client";

import type { DietMeal } from "@elevapro/shared";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useAuthStore } from "@/modules/auth";
import { DaySelector } from "@/modules/nutrition/components/DaySelector";
import { DietDetailsHeader } from "@/modules/nutrition/components/DietDetailsHeader";
import { DietDetailsSkeleton } from "@/modules/nutrition/components/DietDetailsSkeleton";
import { NutritionFlowBanner } from "@/modules/nutrition/components/NutritionFlowBanner";
import { DayOptionsModal, MealEditor } from "@/nutrition";
import { useAuthUser } from "@/shared/hooks/useAuthUser";
import {
  useClearDay,
  useCopyDay,
  useDietMeals,
  useDietPlan,
  usePasteDay,
} from "@/shared/hooks/useNutrition";
import { useStudents } from "@/shared/hooks/useStudents";
import { exportDietToPDF } from "@/shared/utils/exportDietPDF";

const DAYS_OF_WEEK = [
  { id: 0, label: "Domingo", short: "Dom" },
  { id: 1, label: "Segunda", short: "Seg" },
  { id: 2, label: "Terça", short: "Ter" },
  { id: 3, label: "Quarta", short: "Qua" },
  { id: 4, label: "Quinta", short: "Qui" },
  { id: 5, label: "Sexta", short: "Sex" },
  { id: 6, label: "Sábado", short: "Sáb" },
];

export default function DietDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const accountType = useAuthStore((s) => s.accountType);
  const isMember = accountType === "member";

  const { data: dietPlan, isLoading } = useDietPlan(id);
  const { data: meals = [] } = useDietMeals(id);
  const { data: students = [] } = useStudents();

  const [selectedDay, setSelectedDay] = useState(1); // Default to Monday
  const [isDayOptionsOpen, setIsDayOptionsOpen] = useState(false);
  const [copiedDay, setCopiedDay] = useState<{ meals: DietMeal[]; dayOfWeek: number } | null>(null);

  const copyDayMutation = useCopyDay();
  const pasteDayMutation = usePasteDay();
  const clearDayMutation = useClearDay();

  const handleCopyDay = async () => {
    try {
      const result = await copyDayMutation.mutateAsync({
        dietPlanId: id,
        dayOfWeek: selectedDay,
      });
      setCopiedDay(result);
      setIsDayOptionsOpen(false);
      toast.success("Dia copiado!");
    } catch (error) {
      console.error("Error copying day:", error);
      toast.error("Erro ao copiar dia.");
    }
  };

  const handlePasteDay = async () => {
    if (!copiedDay) return;
    try {
      await pasteDayMutation.mutateAsync({
        dietPlanId: id,
        targetDay: selectedDay,
        copiedMeals: copiedDay.meals || [],
      });
      setIsDayOptionsOpen(false);
      toast.success("Dia colado com sucesso!");
    } catch (error) {
      console.error("Error pasting day:", error);
      toast.error("Erro ao colar dia.");
    }
  };

  const handleClearDay = async () => {
    try {
      await clearDayMutation.mutateAsync({
        dietPlanId: id,
        dayOfWeek: selectedDay,
      });
      setIsDayOptionsOpen(false);
      toast.success("Dia limpo!");
    } catch (error) {
      console.error("Error clearing day:", error);
      toast.error("Erro ao limpar dia.");
    }
  };

  const { data: currentUser } = useAuthUser();

  const handleExportPDF = async () => {
    if (!dietPlan) return;
    try {
      const studentName = isMember
        ? (currentUser?.fullName ?? "Membro")
        : (students.find((s) => s.id === dietPlan.student_id)?.full_name ?? "Aluno");
      const professionalName = currentUser?.fullName || "Profissional";
      await exportDietToPDF(dietPlan, meals, studentName, professionalName);
    } catch (error) {
      console.error("Error exporting PDF:", error);
    }
  };

  if (isLoading) {
    return <DietDetailsSkeleton />;
  }

  if (!dietPlan) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground mb-4">Plano não encontrado</p>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-primary hover:underline"
        >
          Voltar
        </button>
      </div>
    );
  }

  const isCyclic = dietPlan.plan_type === "cyclic";
  const currentDayName = DAYS_OF_WEEK.find((d) => d.id === selectedDay)?.label || "";
  const dayMeals = meals.filter((m) => m.day_of_week === selectedDay);
  const nutritionStep = dayMeals.length === 0 ? 2 : 3;

  return (
    <div className="space-y-8">
      <DietDetailsHeader
        dietPlan={dietPlan}
        onBack={() =>
          isMember ? router.push("/dashboard/student/nutrition") : router.push("/dashboard/diets")
        }
        onExportPDF={handleExportPDF}
        onDayOptions={() => setIsDayOptionsOpen(true)}
        isCyclic={isCyclic}
      />

      <NutritionFlowBanner currentStep={nutritionStep} />

      <DaySelector
        days={DAYS_OF_WEEK}
        selectedDay={selectedDay}
        onSelectDay={setSelectedDay}
        isCyclic={isCyclic}
      />

      {/* Meal Editor */}
      <MealEditor dietPlanId={id} dayOfWeek={selectedDay} />

      {/* Day Options Modal */}
      <DayOptionsModal
        isOpen={isDayOptionsOpen}
        onClose={() => setIsDayOptionsOpen(false)}
        onCopy={handleCopyDay}
        onPaste={handlePasteDay}
        onClear={handleClearDay}
        canPaste={!!copiedDay}
        dayName={currentDayName}
        isCopying={copyDayMutation.isPending}
        isPasting={pasteDayMutation.isPending}
        isClearing={clearDayMutation.isPending}
      />
    </div>
  );
}
