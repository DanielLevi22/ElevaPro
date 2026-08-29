"use client";

import type { AdaptiveQuestion, PersonaTrack, UnlockCard } from "@elevapro/shared";
import {
  achatarRespostas,
  getPrecisionScore,
  getQuestionPrecisionDelta,
  getTrackQuestions,
  PERSONA_OPTIONS,
  UNLOCK_CARDS,
} from "@elevapro/shared";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Dumbbell,
  Flame,
  type LucideIcon,
  RotateCcw,
  Shield,
  Sprout,
  Trophy,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { AnamnesisResponseValue } from "@/modules/students/hooks/useStudentAnamnesis";
import { useStudentAnamnesis } from "@/modules/students/hooks/useStudentAnamnesis";
import { useAnamnesisForm, useSavePersonaTrack } from "../hooks/useAnamnesisForm";
import { useCurrentStudentId, useStudentPersonaTrack } from "../hooks/useStudentDashboardData";

// ─── Icon maps ──────────────────────────────────────────────────────────────────

const TRACK_ICONS: Record<PersonaTrack, LucideIcon> = {
  beginner: Sprout,
  returning: RotateCcw,
  intermediate: Dumbbell,
  advanced: Trophy,
};

const TRACK_COLORS: Record<PersonaTrack, string> = {
  beginner: "text-emerald-400",
  returning: "text-amber-400",
  intermediate: "text-blue-400",
  advanced: "text-violet-400",
};

const UNLOCK_ICONS: Record<string, LucideIcon> = {
  height: Flame,
  gym_type: Dumbbell,
  injuries: Shield,
  commitment: Zap,
};

// ─── Question Field ─────────────────────────────────────────────────────────────

function QuestionField({
  question,
  value,
  onChange,
}: {
  question: AdaptiveQuestion;
  value: AnamnesisResponseValue | undefined;
  onChange: (v: AnamnesisResponseValue) => void;
}) {
  const base =
    "bg-surface-highlight/60 border border-overlay-10 rounded-xl text-foreground text-sm px-4 py-3 w-full focus:outline-none focus:border-overlay-15 placeholder:text-muted-foreground";

  if (question.type === "text") {
    return (
      <textarea
        className={`${base} resize-none min-h-20`}
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={question.placeholder ?? "Sua resposta..."}
      />
    );
  }

  if (question.type === "number") {
    return (
      <div className="relative">
        <input
          type="number"
          className={`${base} pr-16`}
          value={(value as number) ?? ""}
          onChange={(e) => onChange(Number(e.target.value))}
          placeholder={question.placeholder ?? "0"}
        />
        {question.unit && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium pointer-events-none">
            {question.unit}
          </span>
        )}
      </div>
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
            className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-all ${
              value === opt
                ? "bg-foreground text-background border-foreground scale-[1.02]"
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
      <div className="flex flex-col gap-2">
        {question.options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`w-full px-5 py-3 rounded-xl text-sm font-medium border text-left transition-all ${
              value === opt
                ? "bg-foreground text-background border-foreground"
                : "bg-surface text-muted-foreground border-overlay-10 hover:border-overlay-15 hover:bg-surface-highlight"
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
      <div className="flex flex-col gap-2">
        {question.options.map((opt) => {
          const isSelected = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={`w-full px-5 py-3 rounded-xl text-sm font-medium border text-left transition-all ${
                isSelected
                  ? "bg-foreground text-background border-foreground"
                  : "bg-surface text-muted-foreground border-overlay-10 hover:border-overlay-15 hover:bg-surface-highlight"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <span
                  className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                    isSelected ? "bg-background border-border" : "border-border"
                  }`}
                >
                  {isSelected && <CheckCircle2 className="w-3 h-3 text-foreground" />}
                </span>
                {opt}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  return null;
}

// ─── Persona Selection ──────────────────────────────────────────────────────────

function PersonaScreen({ onSelect }: { onSelect: (t: PersonaTrack) => void }) {
  return (
    <div className="flex flex-col gap-6 max-w-lg mx-auto">
      <div>
        <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-widest mb-2">
          Passo inicial
        </p>
        <h1 className="text-2xl font-black text-foreground leading-tight">
          Como você se descreveria?
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Vamos montar seu plano a partir do seu nível real.
        </p>
      </div>
      <div className="flex flex-col gap-2.5">
        {PERSONA_OPTIONS.map((opt) => {
          const Icon = TRACK_ICONS[opt.track];
          const iconColor = TRACK_COLORS[opt.track];
          return (
            <button
              key={opt.track}
              type="button"
              onClick={() => onSelect(opt.track)}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border border-overlay-08 bg-surface/50 hover:bg-surface-highlight/60 hover:border-overlay-15 transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-surface-highlight flex items-center justify-center shrink-0 group-hover:bg-surface-highlight transition-colors">
                <Icon className={`w-5 h-5 ${iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-foreground font-semibold text-sm">{opt.label}</p>
                <p className="text-muted-foreground text-xs mt-0.5">{opt.detail}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-muted-foreground transition-colors shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Unlock Screen ───────────────────────────────────────────────────────────────

function UnlockScreen({ card, onContinue }: { card: UnlockCard; onContinue: () => void }) {
  const Icon = UNLOCK_ICONS[card.afterQuestionId] ?? Zap;
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-5 max-w-sm mx-auto">
      <div className="relative">
        <div className="w-20 h-20 rounded-2xl bg-surface-highlight border border-overlay-10 flex items-center justify-center">
          <Icon className="w-9 h-9 text-foreground" strokeWidth={1.5} />
        </div>
        <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
          <CheckCircle2 className="w-3.5 h-3.5 text-foreground" strokeWidth={2.5} />
        </div>
      </div>
      <div>
        <h2 className="text-lg font-black text-foreground uppercase tracking-tight">
          {card.title}
        </h2>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{card.detail}</p>
      </div>
      <button
        type="button"
        onClick={onContinue}
        className="w-full py-3 bg-foreground text-background font-bold text-sm rounded-xl hover:bg-foreground/90 transition-colors flex items-center justify-center gap-2"
      >
        Continuar <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Completion Screen ───────────────────────────────────────────────────────────

function CompletionScreen({
  score,
  onStartCoach,
  onRetake,
}: {
  score: number;
  onStartCoach: () => void;
  onRetake: () => void;
}) {
  const tier =
    score >= 80
      ? { label: "Perfil completo", color: "text-emerald-400", ring: "border-emerald-500/40" }
      : score >= 60
        ? { label: "Bom começo", color: "text-amber-400", ring: "border-amber-500/40" }
        : { label: "Dados iniciais", color: "text-muted-foreground", ring: "border-border" };

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-6 max-w-sm mx-auto">
      <div
        className={`w-28 h-28 rounded-full border-2 ${tier.ring} flex flex-col items-center justify-center gap-0.5`}
      >
        <span className={`text-2xl font-black ${tier.color}`}>{score}%</span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
          precisão
        </span>
      </div>
      <div>
        <h2 className="text-xl font-black text-foreground uppercase tracking-tight">
          {tier.label}
        </h2>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-60 mx-auto">
          {score >= 80
            ? "Seu coach tem tudo que precisa para montar um plano personalizado."
            : score >= 60
              ? "Dados suficientes para começar. O coach pode pedir mais detalhes durante a conversa."
              : "Você pode continuar e responder mais no chat com o coach."}
        </p>
      </div>
      <div className="flex flex-col gap-2.5 w-full">
        <button
          type="button"
          onClick={onStartCoach}
          className="w-full py-3 bg-foreground text-background font-bold text-sm rounded-xl hover:bg-foreground/90 transition-colors flex items-center justify-center gap-2"
        >
          <Zap className="w-4 h-4" /> Gerar meu plano agora
        </button>
        <button
          type="button"
          onClick={onRetake}
          className="w-full py-2.5 text-muted-foreground text-xs font-medium hover:text-muted-foreground transition-colors"
        >
          Refazer anamnese
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────────

export function StudentAnamnesisJourneyPage() {
  const router = useRouter();
  const studentId = useCurrentStudentId();
  const { data: existing, isLoading: anamnesisLoading } = useStudentAnamnesis(studentId);
  const { data: savedTrack, isLoading: trackLoading } = useStudentPersonaTrack(studentId);
  const { mutateAsync: save, isPending } = useAnamnesisForm();
  const { mutateAsync: saveTrack } = useSavePersonaTrack();

  const [forceRetake, setForceRetake] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);
  const [track, setTrack] = useState<PersonaTrack | null>(null);
  const [step, setStep] = useState(0);
  const [responses, setResponses] = useState<Record<string, AnamnesisResponseValue>>({});
  const [pendingUnlock, setPendingUnlock] = useState<UnlockCard | null>(null);
  const [precisionDelta, setPrecisionDelta] = useState<number | null>(null);
  const [showWhy, setShowWhy] = useState(false);

  const isCompleted = (!forceRetake && !!existing?.completed_at) || sessionDone;

  // Restore state from DB: normalize responses, auto-set track, resume at first unanswered step
  useEffect(() => {
    if (track || !savedTrack || forceRetake) return;
    if (existing === undefined) return; // still loading

    const t = savedTrack as PersonaTrack;

    if (!existing?.responses) {
      setTrack(t);
      return;
    }

    // Terceira cópia desta lógica antes desta correção: uma aqui, uma na página
    // de formulário que ninguém renderizava, e nenhuma que os carregadores de
    // contexto da IA conhecessem — foi assim que o `[object Object]` chegou ao
    // prompt sem ninguém notar que o achatamento já existia duas vezes.
    const normalized = achatarRespostas(existing.responses as Record<string, unknown>) as Record<
      string,
      AnamnesisResponseValue
    >;
    setResponses(normalized);
    setTrack(t);

    const qs = getTrackQuestions(t);
    const firstUnanswered = qs.findIndex((q) => {
      const v = normalized[q.id];
      return v === undefined || v === "" || v === null || (Array.isArray(v) && v.length === 0);
    });
    if (firstUnanswered > 0) setStep(firstUnanswered);
  }, [existing, savedTrack, track, forceRetake]);

  if (anamnesisLoading || trackLoading) return null;

  const questions = track ? getTrackQuestions(track) : [];
  const currentQ = questions[step];
  const precision = questions.length > 0 ? getPrecisionScore(questions, responses) : 30;
  const isLastStep = step === questions.length - 1;
  const progressPct = questions.length > 0 ? Math.round(((step + 1) / questions.length) * 100) : 0;

  const TRACK_LABELS: Record<PersonaTrack, string> = {
    beginner: "Iniciante",
    returning: "Retomada",
    intermediate: "Intermediário",
    advanced: "Avançado",
  };

  const handleSelectTrack = async (t: PersonaTrack) => {
    setTrack(t);
    setStep(0);
    setShowWhy(false);
    if (studentId) {
      try {
        await saveTrack({ studentId, track: t });
      } catch {
        // column may not exist in all environments
      }
    }
  };

  const handleAnswerChange = (value: AnamnesisResponseValue) => {
    setResponses((prev) => ({ ...prev, [currentQ.id]: value }));
    const delta = getQuestionPrecisionDelta(currentQ, questions);
    setPrecisionDelta(delta);
    setTimeout(() => setPrecisionDelta(null), 1800);
  };

  const handleNext = async () => {
    if (!studentId || !track) return;
    await save({ studentId, responses, completed: isLastStep });

    const unlock = UNLOCK_CARDS.find((u) => u.afterQuestionId === currentQ.id);
    if (unlock && !isLastStep) {
      setPendingUnlock(unlock);
      return;
    }

    if (isLastStep) {
      setSessionDone(true);
    } else {
      setStep((s) => s + 1);
      setShowWhy(false);
    }
  };

  const handleUnlockContinue = () => {
    setPendingUnlock(null);
    setStep((s) => s + 1);
    setShowWhy(false);
  };

  const handleBack = () => {
    if (step > 0) {
      setStep((s) => s - 1);
      setShowWhy(false);
    } else {
      setTrack(null);
    }
  };

  const handleRetake = () => {
    setForceRetake(true);
    setSessionDone(false);
    setTrack(null);
    setStep(0);
    setResponses({});
  };

  if (isCompleted)
    return (
      <CompletionScreen
        score={precision}
        onStartCoach={() => router.push("/dashboard/student/coach")}
        onRetake={handleRetake}
      />
    );

  if (!track) return <PersonaScreen onSelect={handleSelectTrack} />;
  if (pendingUnlock) return <UnlockScreen card={pendingUnlock} onContinue={handleUnlockContinue} />;

  const barColor = precision >= 80 ? "#10b981" : precision >= 60 ? "#f59e0b" : "#818cf8";
  const TrackIcon = TRACK_ICONS[track];

  return (
    <div className="flex flex-col gap-5 max-w-lg mx-auto">
      {/* Header progress */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <TrackIcon className={`w-3.5 h-3.5 ${TRACK_COLORS[track]}`} />
            <span className="text-xs text-muted-foreground font-medium">{TRACK_LABELS[track]}</span>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            {step + 1} / {questions.length}
          </span>
        </div>
        <div className="h-1 bg-surface-highlight rounded-full overflow-hidden">
          <div
            className="h-full bg-foreground rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Question card */}
      <div className="bg-surface/40 border border-overlay-08 rounded-2xl p-6 flex flex-col gap-5">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-2">
            Pergunta {step + 1}
          </p>
          <h2 className="text-xl font-black text-foreground leading-snug">{currentQ.text}</h2>
        </div>

        <QuestionField
          question={currentQ}
          value={responses[currentQ.id]}
          onChange={handleAnswerChange}
        />

        <button
          type="button"
          onClick={() => setShowWhy((v) => !v)}
          className="text-xs text-muted-foreground hover:text-muted-foreground transition-colors flex items-center gap-1 w-fit"
        >
          Por que perguntamos?
          {showWhy ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
        {showWhy && (
          <p className="text-xs text-muted-foreground leading-relaxed -mt-3 border-l border-overlay-10 pl-3">
            {currentQ.whyWeAsk}
          </p>
        )}
      </div>

      {/* Precision meter */}
      <div className="bg-surface/40 border border-overlay-08 rounded-xl p-4 relative overflow-hidden">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-muted-foreground font-medium">Precisão do plano</span>
          <span className="text-sm font-black text-foreground">{precision}%</span>
        </div>
        <div className="h-1.5 bg-surface-highlight rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${precision}%`, backgroundColor: barColor }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">Plano genérico: 30% · Meta: 94%</p>
        {precisionDelta !== null && (
          <span className="absolute top-3 right-4 text-xs font-black text-emerald-400">
            +{precisionDelta}%
          </span>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleBack}
          className="px-5 py-3 bg-surface text-muted-foreground font-semibold text-sm rounded-xl border border-overlay-10 hover:border-overlay-15 transition-colors"
        >
          {step === 0 ? "Voltar" : "Anterior"}
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={isPending}
          className="flex-1 py-3 bg-foreground text-background font-bold text-sm rounded-xl hover:bg-foreground/90 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {isPending ? (
            "Salvando..."
          ) : isLastStep ? (
            <>
              <CheckCircle2 className="w-4 h-4" /> Concluir
            </>
          ) : (
            <>
              Próximo <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
