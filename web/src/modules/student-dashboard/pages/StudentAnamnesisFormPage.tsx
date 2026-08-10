"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { AnamnesisQuestion } from "@/modules/students/data/anamnesisQuestions";
import { GENERAL_ANAMNESIS } from "@/modules/students/data/anamnesisQuestions";
import type { AnamnesisResponseValue } from "@/modules/students/hooks/useStudentAnamnesis";
import { useStudentAnamnesis } from "@/modules/students/hooks/useStudentAnamnesis";
import { useAnamnesisForm } from "../hooks/useAnamnesisForm";
import { useCurrentStudentId } from "../hooks/useStudentDashboardData";

function isVisible(
  question: AnamnesisQuestion,
  responses: Record<string, AnamnesisResponseValue>,
): boolean {
  if (!question.condition) return true;
  return responses[question.condition.questionId] === question.condition.expectedValue;
}

function QuestionField({
  question,
  value,
  onChange,
}: {
  question: AnamnesisQuestion;
  value: AnamnesisResponseValue | undefined;
  onChange: (v: AnamnesisResponseValue) => void;
}) {
  const inputBase =
    "bg-surface border border-overlay-10 rounded-xl text-foreground text-sm px-4 py-3 w-full focus:outline-none focus:border-overlay-15 placeholder:text-muted-foreground";

  if (question.type === "text") {
    return (
      <textarea
        className={`${inputBase} resize-none min-h-[80px]`}
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Sua resposta..."
      />
    );
  }

  if (question.type === "number") {
    return (
      <input
        type="number"
        className={inputBase}
        value={(value as number) ?? ""}
        onChange={(e) => onChange(Number(e.target.value))}
        placeholder="0"
      />
    );
  }

  if (question.type === "date") {
    return (
      <input
        type="date"
        className={inputBase}
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  if (question.type === "boolean") {
    return (
      <div className="flex gap-3">
        {([true, false] as const).map((opt) => (
          <button
            key={String(opt)}
            type="button"
            onClick={() => onChange(opt)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-colors ${
              value === opt
                ? "bg-foreground text-background border-foreground"
                : "bg-surface text-muted-foreground border-overlay-10 hover:border-overlay-15"
            }`}
          >
            {opt ? "Sim" : "Não"}
          </button>
        ))}
      </div>
    );
  }

  if (question.type === "single_choice" && question.options) {
    return (
      <div className="flex flex-wrap gap-2">
        {question.options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
              value === opt
                ? "bg-foreground text-background border-foreground"
                : "bg-surface text-muted-foreground border-overlay-10 hover:border-overlay-15"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    );
  }

  if (question.type === "multiple_choice" && question.options) {
    const selected = (value as string[]) ?? [];
    const toggle = (opt: string) =>
      onChange(selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt]);
    return (
      <div className="flex flex-wrap gap-2">
        {question.options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
              selected.includes(opt)
                ? "bg-foreground text-background border-foreground"
                : "bg-surface text-muted-foreground border-overlay-10 hover:border-overlay-15"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    );
  }

  return null;
}

function normalizeResponses(raw: Record<string, unknown>): Record<string, AnamnesisResponseValue> {
  return Object.fromEntries(
    Object.entries(raw).map(([k, v]) => {
      if (v !== null && typeof v === "object" && !Array.isArray(v) && "value" in v) {
        return [k, (v as { value: AnamnesisResponseValue }).value];
      }
      return [k, v as AnamnesisResponseValue];
    }),
  );
}

export function StudentAnamnesisFormPage() {
  const router = useRouter();
  const studentId = useCurrentStudentId();
  const { data: existing, isLoading } = useStudentAnamnesis(studentId);
  const { mutateAsync: save, isPending } = useAnamnesisForm();

  const [step, setStep] = useState(0);
  const [responses, setResponses] = useState<Record<string, AnamnesisResponseValue>>({});
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    if (existing?.responses) {
      setResponses(normalizeResponses(existing.responses as Record<string, unknown>));
    }
  }, [existing]);

  const section = GENERAL_ANAMNESIS[step];
  const isLastStep = step === GENERAL_ANAMNESIS.length - 1;
  const progressPct = Math.round(((step + 1) / GENERAL_ANAMNESIS.length) * 100);

  const handleNext = async () => {
    if (!studentId) return;
    await save({ studentId, responses, completed: isLastStep });
    if (isLastStep) {
      setIsDone(true);
    } else {
      setStep((s) => s + 1);
    }
  };

  if (isLoading) {
    return (
      <div className="h-64 bg-surface/40 border border-overlay-08 rounded-2xl animate-pulse" />
    );
  }

  if (isDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-6">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-emerald-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-black text-foreground uppercase tracking-tight">
            Anamnese concluída!
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Suas respostas foram salvas com sucesso.
          </p>
        </div>
        <button
          onClick={() => router.push("/dashboard/student")}
          className="px-6 py-2.5 bg-foreground text-background font-bold text-sm rounded-xl hover:bg-foreground/90 transition-colors"
        >
          Voltar ao início
        </button>
      </div>
    );
  }

  const visibleQuestions = section.questions.filter((q) => isVisible(q, responses));

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-black text-foreground uppercase tracking-tight">Anamnese</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {existing?.completed_at ? "Editar suas respostas" : "Preencha as informações abaixo"}
        </p>
      </div>

      {/* Progress */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-xs text-muted-foreground font-medium">
          <span>{section.title}</span>
          <span>
            {step + 1} / {GENERAL_ANAMNESIS.length}
          </span>
        </div>
        <div className="h-1.5 bg-surface-highlight rounded-full overflow-hidden">
          <div
            className="h-full bg-foreground rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Questions */}
      <div className="bg-surface/40 border border-overlay-08 rounded-2xl p-6 flex flex-col gap-6">
        {visibleQuestions.map((question) => (
          <div key={question.id} className="flex flex-col gap-2">
            <label className="text-sm font-medium text-muted-foreground">
              {question.text}
              {question.required && <span className="text-muted-foreground ml-1">*</span>}
            </label>
            <QuestionField
              question={question}
              value={responses[question.id]}
              onChange={(v) => setResponses((prev) => ({ ...prev, [question.id]: v }))}
            />
          </div>
        ))}
      </div>

      {/* Step dots */}
      <div className="flex gap-1.5 justify-center">
        {GENERAL_ANAMNESIS.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setStep(i)}
            className={`w-2 h-2 rounded-full transition-colors ${
              i === step
                ? "bg-foreground"
                : i < step
                  ? "bg-muted-foreground"
                  : "bg-surface-highlight"
            }`}
          />
        ))}
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => (step > 0 ? setStep((s) => s - 1) : router.back())}
          className="px-5 py-2.5 bg-surface text-muted-foreground font-bold text-sm rounded-xl border border-overlay-10 hover:border-overlay-15 transition-colors"
        >
          {step === 0 ? "Cancelar" : "Anterior"}
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={isPending}
          className="flex-1 py-2.5 bg-foreground text-background font-bold text-sm rounded-xl hover:bg-foreground/90 transition-colors disabled:opacity-50"
        >
          {isPending ? "Salvando..." : isLastStep ? "Concluir" : "Próximo"}
        </button>
      </div>
    </div>
  );
}
