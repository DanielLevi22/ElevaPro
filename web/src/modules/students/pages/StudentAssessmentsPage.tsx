"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { useStudents } from "@/shared/hooks/useStudents";
import { formatDate } from "@/shared/utils/formatDate";
import { AssessmentModal } from "../components/AssessmentModal";
import type { Assessment } from "../hooks/useStudentAssessments";
import { useStudentAssessments } from "../hooks/useStudentAssessments";

function StatCell({ label, value, unit }: { label: string; value: number | null; unit?: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-foreground">
        {value !== null ? `${value}${unit ?? ""}` : "—"}
      </p>
    </div>
  );
}

function AssessmentCard({
  assessment,
  index,
  previous,
}: {
  assessment: Assessment;
  index: number;
  previous: Assessment | null;
}) {
  const delta = (curr: number | null, prev: number | null) => {
    if (curr === null || prev === null) return null;
    return Number((curr - prev).toFixed(1));
  };

  const weightDelta = delta(assessment.weight, previous?.weight ?? null);

  return (
    <div className="bg-surface border border-white/10 rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent text-xs font-bold">
            {index + 1}
          </div>
          <div>
            <p className="font-semibold text-foreground">
              {formatDate(assessment.created_at, "medium")}
            </p>
            {previous && weightDelta !== null && (
              <p
                className={`text-xs mt-0.5 ${weightDelta < 0 ? "text-emerald-400" : weightDelta > 0 ? "text-orange-400" : "text-muted-foreground"}`}
              >
                {weightDelta > 0 ? "+" : ""}
                {weightDelta} kg desde avaliação anterior
              </p>
            )}
          </div>
        </div>
        {assessment.weight && assessment.height && (
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-white/5 text-muted-foreground">
            IMC {(assessment.weight / (assessment.height / 100) ** 2).toFixed(1)}
          </span>
        )}
      </div>

      {/* Composição */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1 border-t border-white/5">
        <StatCell label="Peso" value={assessment.weight} unit=" kg" />
        <StatCell label="Altura" value={assessment.height} unit=" cm" />
        <StatCell label="Cintura" value={assessment.waist} unit=" cm" />
        <StatCell label="Quadril" value={assessment.hips} unit=" cm" />
      </div>

      {/* Circunferências — só exibe se tiver algum valor */}
      {[assessment.waist, assessment.hips, assessment.chest, assessment.arm_right_relaxed].some(
        (v) => v !== null,
      ) && (
        <div className="grid grid-cols-4 gap-4 pt-3 border-t border-white/5">
          <StatCell label="Cintura" value={assessment.waist} unit=" cm" />
          <StatCell label="Quadril" value={assessment.hips} unit=" cm" />
          <StatCell label="Peito" value={assessment.chest} unit=" cm" />
          <StatCell label="Braço D" value={assessment.arm_right_relaxed} unit=" cm" />
        </div>
      )}

      {assessment.notes && (
        <p className="text-xs text-muted-foreground border-t border-white/5 pt-3">
          {assessment.notes}
        </p>
      )}
    </div>
  );
}

export default function StudentAssessmentsPage() {
  const params = useParams();
  const studentId = params.id as string;
  const [modalOpen, setModalOpen] = useState(false);

  const { data: students = [] } = useStudents();
  const student = students.find((s) => s.id === studentId);

  const { data: assessments = [], isLoading, isError } = useStudentAssessments(studentId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Avaliações Físicas</h1>
            {student && <p className="text-sm text-muted-foreground">{student.full_name}</p>}
          </div>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors text-sm"
        >
          + Nova Avaliação
        </button>
      </div>

      {/* Content */}
      {isLoading && (
        <div className="flex flex-col gap-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-surface border border-white/10 rounded-2xl p-5 animate-pulse h-36"
            />
          ))}
        </div>
      )}

      {isError && (
        <div className="text-center py-12 text-muted-foreground">Erro ao carregar avaliações.</div>
      )}

      {!isLoading && !isError && assessments.length === 0 && (
        <div className="text-center py-16 bg-surface border border-white/10 rounded-2xl">
          <div className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-7 h-7 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-foreground mb-1">Sem avaliações</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Registre a primeira avaliação física deste aluno.
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors text-sm"
          >
            Nova Avaliação
          </button>
        </div>
      )}

      {!isLoading && assessments.length > 0 && (
        <div className="flex flex-col gap-4">
          {assessments.map((a, i) => (
            <AssessmentCard
              key={a.id}
              assessment={a}
              index={i}
              previous={assessments[i + 1] ?? null}
            />
          ))}
        </div>
      )}

      <AssessmentModal
        studentId={modalOpen ? studentId : null}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
