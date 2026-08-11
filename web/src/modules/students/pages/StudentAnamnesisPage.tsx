"use client";

import { useParams } from "next/navigation";
import { getPrecisionScore, getTrackQuestions } from "@/modules/students/data/anamnesisAdaptive";
import { useStudents } from "@/shared/hooks/useStudents";
import type { AnamnesisQuestion, AnamnesisSection } from "../data/anamnesisQuestions";
import { GENERAL_ANAMNESIS } from "../data/anamnesisQuestions";
import type { AnamnesisResponseValue } from "../hooks/useStudentAnamnesis";
import { useStudentAnamnesis } from "../hooks/useStudentAnamnesis";
import { useStudentProfile } from "../hooks/useStudentProfile";

// ─── Adaptive question sections (for specialist read view) ────────────────────

const ADAPTIVE_SECTIONS: { title: string; ids: string[] }[] = [
  { title: "Perfil & Objetivo", ids: ["main_goal", "gender", "weight", "height"] },
  { title: "Disponibilidade", ids: ["training_days", "training_duration", "gym_type"] },
  { title: "Saúde", ids: ["injuries", "medical_conditions", "sleep_hours", "stress_level"] },
  { title: "Alimentação", ids: ["dietary_restrictions", "diet_quality", "food_preferences"] },
  { title: "Comprometimento", ids: ["commitment", "session_time_preference"] },
  {
    title: "Histórico de Treino",
    ids: [
      "training_time",
      "modalities",
      "had_professional_help",
      "negative_experiences",
      "biggest_difficulty",
    ],
  },
  {
    title: "Técnica de Movimentos",
    ids: ["squat_level", "bench_press_level", "deadlift_level", "supplements", "nutritionist"],
  },
  {
    title: "Perfil Avançado",
    ids: [
      "intend_to_compete",
      "goal_deadline",
      "trained_sport_specific",
      "physical_job",
      "squat_rm",
      "expectations_text",
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function formatValue(value: AnamnesisResponseValue, type?: string): string {
  if (value === null || value === undefined || value === "") return "Não respondido";
  if (type === "boolean" || typeof value === "boolean") return value ? "Sim" : "Não";
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "Nenhum";
  if (type === "date" && typeof value === "string") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime()))
      return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  }
  return String(value);
}

function isAdaptiveFormat(responses: Record<string, AnamnesisResponseValue>): boolean {
  const adaptiveKeys = ["main_goal", "weight", "height", "training_days", "gym_type"];
  return adaptiveKeys.some((k) => k in responses);
}

// ─── Adaptive view ────────────────────────────────────────────────────────────

function AdaptiveSectionCard({
  title,
  ids,
  allQuestions,
  responses,
}: {
  title: string;
  ids: string[];
  allQuestions: ReturnType<typeof getTrackQuestions>;
  responses: Record<string, AnamnesisResponseValue>;
}) {
  const questionMap = Object.fromEntries(allQuestions.map((q) => [q.id, q]));
  const entries = ids
    .map((id) => ({ id, question: questionMap[id], value: responses[id] }))
    .filter(
      ({ question, value }) => question && value !== undefined && value !== "" && value !== null,
    );

  if (entries.length === 0) return null;

  return (
    <div className="bg-surface border border-white/10 rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-white/10 bg-white/[0.02]">
        <h3 className="font-semibold text-foreground text-sm">{title}</h3>
      </div>
      <div className="divide-y divide-white/5">
        {entries.map(({ id, question, value }) => (
          <div key={id} className="px-5 py-3 flex justify-between gap-4">
            <p className="text-sm text-muted-foreground flex-1">{question?.text}</p>
            <p className="text-sm font-medium text-foreground text-right max-w-[55%]">
              {formatValue(value, question?.type)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── General view (legacy format) ─────────────────────────────────────────────

function formatGeneral(question: AnamnesisQuestion, value: AnamnesisResponseValue): string {
  if (value === null || value === undefined || value === "") return "Não respondido";
  if (question.type === "boolean") return value ? "Sim" : "Não";
  if (question.type === "multiple_choice" && Array.isArray(value))
    return value.length > 0 ? value.join(", ") : "Nenhum";
  if (question.type === "date" && typeof value === "string") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime()))
      return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  }
  return String(value);
}

function GeneralSectionCard({
  section,
  responses,
}: {
  section: AnamnesisSection;
  responses: Record<string, AnamnesisResponseValue>;
}) {
  const visible = section.questions.filter((q) => {
    if (!q.condition) return true;
    return responses[q.condition.questionId] === q.condition.expectedValue;
  });
  if (visible.length === 0) return null;
  return (
    <div className="bg-surface border border-white/10 rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-white/10 bg-white/[0.02]">
        <h3 className="font-semibold text-foreground text-sm">{section.title}</h3>
      </div>
      <div className="divide-y divide-white/5">
        {visible.map((q) => {
          const raw = responses[q.id];
          const answered = raw !== null && raw !== undefined && raw !== "";
          return (
            <div key={q.id} className="px-5 py-3 flex justify-between gap-4">
              <p className="text-sm text-muted-foreground flex-1">{q.text}</p>
              <p
                className={`text-sm font-medium text-right max-w-[55%] ${answered ? "text-foreground" : "text-white/20"}`}
              >
                {answered ? formatGeneral(q, raw) : "Não respondido"}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StudentAnamnesisPage() {
  const params = useParams();
  const studentId = params.id as string;

  const { data: students = [] } = useStudents();
  const student = students.find((s) => s.id === studentId);
  const { data: anamnesis, isLoading, isError } = useStudentAnamnesis(studentId);
  const { data: profile } = useStudentProfile(studentId);

  const responses = normalizeResponses((anamnesis?.responses ?? {}) as Record<string, unknown>);
  const adaptive = isAdaptiveFormat(responses);

  const trackForScore = (profile?.persona_track ?? "beginner") as Parameters<
    typeof getTrackQuestions
  >[0];
  const allQuestions = getTrackQuestions("advanced");
  const scoreQuestions = getTrackQuestions(trackForScore);
  const precision = getPrecisionScore(scoreQuestions, responses);
  const barColor = precision >= 80 ? "#10b981" : precision >= 60 ? "#f59e0b" : "#818cf8";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Anamnese</h1>
            {student && <p className="text-sm text-muted-foreground">{student.full_name}</p>}
          </div>
        </div>

        {anamnesis?.completed_at && (
          <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400">
            Concluída em{" "}
            {new Date(anamnesis.completed_at).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
        )}
      </div>

      {/* Precision score (adaptive only) */}
      {!isLoading && !isError && anamnesis && adaptive && (
        <div className="bg-surface border border-white/10 rounded-2xl p-5">
          <div className="flex justify-between items-center mb-2">
            <div>
              <p className="text-sm font-semibold text-foreground">Precisão do perfil</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Trilha:{" "}
                <span className="capitalize">{profile?.persona_track ?? "não definida"}</span>
              </p>
            </div>
            <span className="text-2xl font-black text-foreground">{precision}%</span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${precision}%`, backgroundColor: barColor }}
            />
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-surface border border-white/10 rounded-2xl animate-pulse h-40"
            />
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="text-center py-12 text-muted-foreground">Erro ao carregar anamnese.</div>
      )}

      {/* Empty */}
      {!isLoading && !isError && !anamnesis && (
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-foreground mb-1">Anamnese não preenchida</h3>
          <p className="text-sm text-muted-foreground">
            Este aluno ainda não respondeu o questionário de anamnese.
          </p>
        </div>
      )}

      {/* Adaptive content */}
      {!isLoading && !isError && anamnesis && adaptive && (
        <div className="flex flex-col gap-4">
          {ADAPTIVE_SECTIONS.map((section) => (
            <AdaptiveSectionCard
              key={section.title}
              title={section.title}
              ids={section.ids}
              allQuestions={allQuestions}
              responses={responses}
            />
          ))}
        </div>
      )}

      {/* General (legacy) content */}
      {!isLoading && !isError && anamnesis && !adaptive && (
        <div className="flex flex-col gap-4">
          {GENERAL_ANAMNESIS.map((section) => (
            <GeneralSectionCard key={section.id} section={section} responses={responses} />
          ))}
        </div>
      )}
    </div>
  );
}
