import type { AdaptiveQuestion } from "@elevapro/shared";
import { CheckCircle2 } from "lucide-react";
import type { AnamnesisResponseValue } from "@/modules/students/hooks/useStudentAnamnesis";

/**
 * O campo de resposta de uma pergunta da anamnese adaptativa, no formato que o
 * tipo da pergunta pede: texto, número com unidade, sim/não, escolha única ou
 * múltipla.
 *
 * @example
 * <QuestionField question={q} value={answers[q.id]} onChange={(v) => answer(q.id, v)} />
 */
export function QuestionField({
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
