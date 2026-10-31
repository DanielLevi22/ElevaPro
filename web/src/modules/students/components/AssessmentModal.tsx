"use client";

import {
  type AssessmentDraft,
  type AssessmentNumberField,
  assessmentDraft,
  bodyMassIndex,
  CIRCUMFERENCE_FIELDS,
  type PhysicalAssessment,
  parseAssessmentDraft,
  SKINFOLD_FIELDS,
} from "@elevapro/shared";
import { useState } from "react";
import { Button } from "@/shared/components/ui/Button";
import { Dialog } from "@/shared/components/ui/Dialog";
import { FormField } from "@/shared/components/ui/FormField";
import { Input } from "@/shared/components/ui/Input";
import { useCorrectAssessment } from "../hooks/useCorrectAssessment";
import { useCreateAssessment } from "../hooks/useCreateAssessment";

interface AssessmentModalProps {
  studentId: string | null;
  onClose: () => void;
  assessment?: PhysicalAssessment | null;
}

type Tab = "composition" | "circumferences" | "skinfolds";

// As listas vivem em `@elevapro/shared`: antes cada plataforma tinha a sua, e
// elas já discordavam sobre lateralidade — o web pedia "antebraço" e o mobile
// exibia "antebraço D/E".

function numericField(
  // `readonly` porque as listas vêm de `as const` no shared — o que impede
  // qualquer tela de reordenar ou mutar a ficha por acidente.
  fields: ReadonlyArray<{ readonly key: AssessmentNumberField; readonly label: string }>,
  values: AssessmentDraft,
  onChange: (key: AssessmentNumberField, val: string) => void,
  unit = "cm",
) {
  return fields.map(({ key, label }) => (
    <FormField key={key} label={`${label} (${unit})`} htmlFor={`assess-${key}`} optional>
      <Input
        id={`assess-${key}`}
        type="number"
        step="0.1"
        placeholder="—"
        value={values[key] ?? ""}
        onChange={(e) => onChange(key, e.target.value)}
      />
    </FormField>
  ));
}

/** Abre ficha nova ou uma retificação, descartando rascunhos ao fechar. Ex.: <AssessmentModal studentId={id} onClose={close} />. */
export function AssessmentModal(props: AssessmentModalProps) {
  if (!props.studentId) return null;
  return <AssessmentForm key={props.assessment?.id ?? props.studentId} {...props} />;
}

function AssessmentForm({ studentId, onClose, assessment }: AssessmentModalProps) {
  const [tab, setTab] = useState<Tab>("composition");
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState(() => assessmentDraft(assessment ?? null));
  const setField = (key: keyof AssessmentDraft, value: string) =>
    setDraft((prev) => ({ ...prev, [key]: value }));
  const bmi = bodyMassIndex({
    weight_kg: Number(draft.weight_kg) || null,
    height_cm: Number(draft.height_cm) || null,
  });

  const createAssessment = useCreateAssessment();
  const correctAssessment = useCorrectAssessment();
  const isPending = createAssessment.isPending || correctAssessment.isPending;

  const handleClose = () => {
    if (isPending) return;
    setError(null);
    setTab("composition");
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || isPending) return;
    setError(null);

    // A Escala (peso e altura) é exigida pelo `parseAssessmentDraft`: barrar
    // aqui diz o motivo enquanto a ficha ainda está aberta, em vez do 422 da rota.
    const parsed = parseAssessmentDraft(draft);
    if (!parsed.ok) {
      setError(parsed.message);
      setTab("composition");
      return;
    }

    try {
      if (assessment) await correctAssessment.mutateAsync({ assessment, changes: parsed.values });
      else await createAssessment.mutateAsync({ studentId, ...parsed.values });
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar avaliação");
    }
  };

  const TAB_LABELS: Record<Tab, string> = {
    composition: "Composição",
    circumferences: "Circunferências",
    skinfolds: "Dobras",
  };

  return (
    <Dialog
      open={!!studentId}
      onClose={handleClose}
      title={assessment ? "Corrigir Avaliação Física" : "Nova Avaliação Física"}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {assessment && (
          <p className="text-sm text-muted-foreground">
            A correção atualiza esta avaliação nos gráficos. A versão anterior fica disponível no
            histórico de correções.
          </p>
        )}
        {/* Tabs */}
        <div className="flex border-b border-white/10">
          {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === t
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        {/* Tab: Composição Corporal */}
        {tab === "composition" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Peso (kg)" htmlFor="assess-weight">
                <Input
                  id="assess-weight"
                  type="number"
                  step="0.1"
                  placeholder="75.0"
                  value={draft.weight_kg}
                  onChange={(e) => setField("weight_kg", e.target.value)}
                />
              </FormField>
              <FormField label="Altura (cm)" htmlFor="assess-height">
                <Input
                  id="assess-height"
                  type="number"
                  placeholder="175"
                  value={draft.height_cm}
                  onChange={(e) => setField("height_cm", e.target.value)}
                />
              </FormField>
            </div>

            {bmi !== null && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 text-sm text-muted-foreground">
                IMC calculado automaticamente:{" "}
                <span className="font-semibold text-foreground">{bmi.toFixed(1)}</span>
              </div>
            )}

            <FormField label="Observações" htmlFor="assess-notes" optional>
              <textarea
                id="assess-notes"
                placeholder="Observações, contexto da avaliação..."
                value={draft.notes}
                onChange={(e) => setField("notes", e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              />
            </FormField>
          </div>
        )}

        {/* Tab: Circunferências */}
        {tab === "circumferences" && (
          <div className="grid grid-cols-2 gap-3">
            {numericField(CIRCUMFERENCE_FIELDS, draft, setField)}
          </div>
        )}

        {/* Tab: Dobras Cutâneas */}
        {tab === "skinfolds" && (
          <div className="grid grid-cols-2 gap-3">
            {numericField(SKINFOLD_FIELDS, draft, setField, "mm")}
            <p className="col-span-2 text-xs text-muted-foreground mt-1">
              Valores em milímetros (mm)
            </p>
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3"
          >
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-1">
          <Button
            type="button"
            variant="ghost"
            fullWidth
            onClick={handleClose}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button type="submit" fullWidth isLoading={isPending}>
            {isPending ? "Salvando..." : assessment ? "Salvar correção" : "Salvar Avaliação"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
