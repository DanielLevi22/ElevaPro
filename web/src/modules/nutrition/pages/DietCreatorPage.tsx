"use client";

import { ChevronLeft, Clock, Flame, Pencil, RefreshCw, Utensils } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { HealthDataConsentModal } from "@/modules/nutrition/components/HealthDataConsentModal";
import { MacroRing } from "@/modules/nutrition/components/MacroRing";
import { DatePicker } from "@/shared/components/ui/DatePicker";
import { useAuthUser } from "@/shared/hooks/useAuthUser";
import { useHealthDataConsent } from "@/shared/hooks/useHealthDataConsent";
import { useCreateDietPlanWithStrategy } from "@/shared/hooks/useNutrition";
import { useStudents } from "@/shared/hooks/useStudents";
import {
  calculateDietStrategy,
  DIET_STRATEGIES,
  type DietStrategyType,
} from "@/shared/utils/dietStrategies";

const DAYS_NAME = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const STRATEGY_ICON: Record<DietStrategyType, React.ComponentType<{ className?: string }>> = {
  standard: Utensils,
  carb_cycling: RefreshCw,
  ketogenic: Flame,
  intermittent_fasting: Clock,
  manual: Pencil,
};

const INPUT_CLASS =
  "w-full px-3.5 py-3 rounded-xl border border-border bg-background text-[13px] text-foreground placeholder:text-muted-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
      {children}
    </h2>
  );
}

export function DietCreatorPage() {
  const router = useRouter();
  const { data: authUser } = useAuthUser();
  const isMember = authUser?.accountType === "member";

  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [selectedStrategy, setSelectedStrategy] = useState<DietStrategyType>("standard");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(
    new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split("T")[0],
  );
  const [targetCalories, setTargetCalories] = useState(2000);
  const [protein, setProtein] = useState(150);
  const [carbs, setCarbs] = useState(200);
  const [fat, setFat] = useState(60);
  const [showConsentModal, setShowConsentModal] = useState(false);

  const { data: consent } = useHealthDataConsent();
  const hasConsent = !!consent && !consent.revoked_at;

  const { data: students = [] } = useStudents();
  const createMutation = useCreateDietPlanWithStrategy();

  const strategyDetails = useMemo(
    () => calculateDietStrategy(selectedStrategy, targetCalories),
    [selectedStrategy, targetCalories],
  );

  useEffect(() => {
    setProtein(strategyDetails.averageMacros.protein);
    setCarbs(strategyDetails.averageMacros.carbs);
    setFat(strategyDetails.averageMacros.fat);
  }, [strategyDetails]);

  // Member cria plano para si mesmo — não existe seleção de aluno nesse caso.
  useEffect(() => {
    if (isMember && authUser) setStudentId(authUser.id);
  }, [isMember, authUser]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!studentId || !name) return;

    if (isMember && !hasConsent) {
      setShowConsentModal(true);
      return;
    }

    await submitPlan();
  };

  async function submitPlan() {
    try {
      const newPlan = await createMutation.mutateAsync({
        plan: {
          name,
          student_id: studentId,
          plan_type: selectedStrategy === "carb_cycling" ? "cyclic" : "unique",
          start_date: startDate,
          end_date: endDate,
          target_calories: targetCalories,
          target_protein: protein,
          target_carbs: carbs,
          target_fat: fat,
        },
        strategyData: strategyDetails,
      });
      toast.success("Plano nutricional criado com sucesso!");
      router.push(`/dashboard/diets/${newPlan.id}`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Erro ao criar plano nutricional";
      console.error("Error creating diet plan:", error);
      toast.error(msg);
    }
  }

  return (
    <div className="w-full">
      {showConsentModal && (
        <HealthDataConsentModal
          onAccept={() => {
            setShowConsentModal(false);
            submitPlan();
          }}
          onDecline={() => setShowConsentModal(false)}
        />
      )}

      <div className="mb-6">
        <button
          type="button"
          onClick={() => router.push("/dashboard/diets")}
          className="flex items-center gap-1.5 mb-2 text-[12.5px] font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded-sm"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Voltar para Dietas
        </button>
        <h1 className="font-display text-2xl font-extrabold text-foreground">
          Novo Plano Nutricional
        </h1>
      </div>

      <form onSubmit={handleSubmit}>
        <section className="py-5.5 border-b border-border space-y-4">
          <SectionTitle>Identificação</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="block mb-2 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                Nome do Plano
              </span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ex: Cutting Fase 2"
                className={INPUT_CLASS}
                required
              />
            </label>

            {!isMember && (
              <label className="block">
                <span className="block mb-2 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                  Aluno
                </span>
                <select
                  value={studentId}
                  onChange={(event) => setStudentId(event.target.value)}
                  className={INPUT_CLASS}
                  required
                >
                  <option value="">Selecione um aluno</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.full_name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        </section>

        <section className="py-5.5 border-b border-border">
          <SectionTitle>Estratégia da Dieta</SectionTitle>
          <p className="mt-1 mb-3.5 text-[11.5px] text-muted-foreground">
            {DIET_STRATEGIES[selectedStrategy].description}
          </p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(DIET_STRATEGIES) as DietStrategyType[]).map((strategy) => {
              const isSelected = selectedStrategy === strategy;
              const Icon = STRATEGY_ICON[strategy];
              return (
                <button
                  key={strategy}
                  type="button"
                  onClick={() => setSelectedStrategy(strategy)}
                  aria-pressed={isSelected}
                  className={`flex items-center gap-1.75 px-3.5 py-2 rounded-full text-[12.5px] font-bold border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                    isSelected
                      ? "bg-primary/10 border-primary/50 text-primary-text"
                      : "bg-background border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-3.25 h-3.25" />
                  {DIET_STRATEGIES[strategy].label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="py-5.5 border-b border-border">
          <SectionTitle>Metas Diárias</SectionTitle>
          <div className="mt-4 flex items-baseline gap-1.5">
            <span className="font-display text-3xl font-extrabold text-foreground">
              {targetCalories}
            </span>
            <span className="text-xs text-muted-foreground">kcal por dia</span>
          </div>
          <input
            type="range"
            min="1200"
            max="5000"
            step="50"
            value={targetCalories}
            onChange={(event) => setTargetCalories(Number(event.target.value))}
            aria-label="Meta calórica diária"
            className="w-full mt-3 h-1 bg-overlay-10 rounded-full appearance-none cursor-pointer accent-primary"
          />

          <div className="grid grid-cols-3 gap-2 mt-5 p-2 rounded-2xl bg-surface border border-border">
            <MacroRing
              label="Proteína"
              value={protein}
              max={300}
              color="hsl(var(--success))"
              unit="g"
            />
            <MacroRing
              label="Carbos"
              value={carbs}
              max={600}
              color="hsl(var(--secondary))"
              unit="g"
            />
            <MacroRing label="Gordura" value={fat} max={150} color="hsl(var(--warning))" unit="g" />
          </div>
        </section>

        <section className="py-5.5 border-b border-border space-y-4">
          <SectionTitle>Vigência</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DatePicker label="Início" value={startDate} onChange={setStartDate} />
            <DatePicker label="Fim" value={endDate} onChange={setEndDate} />
          </div>
          <p className="text-[11.5px] text-muted-foreground">
            Depois de criar o plano, você escolhe os alimentos de cada refeição.
          </p>
        </section>

        <section className="py-5.5 border-b border-border">
          <SectionTitle>Previsão semanal</SectionTitle>
          <ul className="mt-3.5 space-y-1.5">
            {strategyDetails.weeklySchedule.map((day) => (
              <li
                key={day.dayOfWeek}
                className="flex justify-between items-center gap-3 p-3 rounded-xl bg-surface border border-border"
              >
                <span className="flex items-center gap-3 min-w-0">
                  <span className="w-7 h-7 shrink-0 rounded-lg bg-primary/10 text-primary-text flex items-center justify-center text-[9px] font-extrabold">
                    {DAYS_NAME[day.dayOfWeek]}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-bold text-foreground truncate">
                      {day.label}
                    </span>
                    <span className="block text-[10px] text-muted-foreground truncate">
                      {day.description}
                    </span>
                  </span>
                </span>
                <span className="text-right shrink-0">
                  <span className="block text-xs font-bold text-foreground">
                    {day.macros.calories}
                  </span>
                  <span className="block text-[10px] text-muted-foreground">
                    P{day.macros.protein}g · C{day.macros.carbs}g
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <div className="flex justify-end gap-2 pt-6">
          <button
            type="button"
            onClick={() => router.push("/dashboard/diets")}
            className="px-4 py-2.5 rounded-[10px] border border-border bg-surface text-[13px] font-bold text-foreground transition-colors hover:bg-overlay-05"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="px-4 py-2.5 rounded-[10px] bg-primary text-primary-foreground text-[13px] font-bold transition-colors hover:bg-primary-hover disabled:opacity-60"
          >
            {createMutation.isPending ? "Criando..." : "Criar Plano"}
          </button>
        </div>
      </form>
    </div>
  );
}
