"use client";

import { CIRCUMFERENCE_FIELDS, SKINFOLD_FIELDS } from "@elevapro/shared";
import { useState } from "react";
import { Button } from "@/shared/components/ui/Button";
import { Dialog } from "@/shared/components/ui/Dialog";
import { FormField } from "@/shared/components/ui/FormField";
import { Input } from "@/shared/components/ui/Input";
import { useCreateAssessment } from "../hooks/useCreateAssessment";

interface AssessmentModalProps {
  studentId: string | null;
  onClose: () => void;
}

type Tab = "composition" | "circumferences" | "skinfolds";

// As listas vivem em `@elevapro/shared`: antes cada plataforma tinha a sua, e
// elas já discordavam sobre lateralidade — o web pedia "antebraço" e o mobile
// exibia "antebraço D/E".

function numericField(
  // `readonly` porque as listas vêm de `as const` no shared — o que impede
  // qualquer tela de reordenar ou mutar a ficha por acidente.
  fields: ReadonlyArray<{ readonly key: string; readonly label: string }>,
  values: Record<string, string>,
  onChange: (key: string, val: string) => void,
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

export function AssessmentModal({ studentId, onClose }: AssessmentModalProps) {
  const [tab, setTab] = useState<Tab>("composition");
  const [error, setError] = useState<string | null>(null);

  // Composição corporal
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [notes, setNotes] = useState("");

  // Circunferências e dobras como objetos
  const [circumferences, setCircumferences] = useState<Record<string, string>>({});
  const [skinfolds, setSkinfolds] = useState<Record<string, string>>({});

  const createAssessment = useCreateAssessment();

  const handleClose = () => {
    setError(null);
    setTab("composition");
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) return;
    setError(null);

    const toNum = (v: string) => (v !== "" ? Number(v) : null);

    // Altura e peso não são medidas entre outras: são a Escala que calibra o
    // body scan do aluno. Avaliação sem os dois não serve de fonte, e a rota
    // recusa com 422 desde a `0037` — barrar aqui é dizer isso enquanto o
    // especialista ainda está com a ficha aberta, em vez de depois de salvar.
    if (toNum(weight) === null || toNum(height) === null) {
      setError("Peso e altura são obrigatórios: são eles que dão escala à análise do aluno.");
      setTab("composition");
      return;
    }

    try {
      await createAssessment.mutateAsync({
        studentId,
        weight_kg: toNum(weight),
        height_cm: toNum(height),
        notes: notes || null,
        ...Object.fromEntries(
          CIRCUMFERENCE_FIELDS.map(({ key }) => [key, toNum(circumferences[key] ?? "")]),
        ),
        ...Object.fromEntries(SKINFOLD_FIELDS.map(({ key }) => [key, toNum(skinfolds[key] ?? "")])),
      });
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
    <Dialog open={!!studentId} onClose={handleClose} title="Nova Avaliação Física" maxWidth="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
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
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                />
              </FormField>
              <FormField label="Altura (cm)" htmlFor="assess-height">
                <Input
                  id="assess-height"
                  type="number"
                  placeholder="175"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                />
              </FormField>
            </div>

            {weight && height && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 text-sm text-muted-foreground">
                IMC calculado automaticamente:{" "}
                <span className="font-semibold text-foreground">
                  {(Number(weight) / (Number(height) / 100) ** 2).toFixed(1)}
                </span>
              </div>
            )}

            <FormField label="Observações" htmlFor="assess-notes" optional>
              <textarea
                id="assess-notes"
                placeholder="Observações, contexto da avaliação..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              />
            </FormField>
          </div>
        )}

        {/* Tab: Circunferências */}
        {tab === "circumferences" && (
          <div className="grid grid-cols-2 gap-3">
            {numericField(CIRCUMFERENCE_FIELDS, circumferences, (key, val) =>
              setCircumferences((prev) => ({ ...prev, [key]: val })),
            )}
          </div>
        )}

        {/* Tab: Dobras Cutâneas */}
        {tab === "skinfolds" && (
          <div className="grid grid-cols-2 gap-3">
            {numericField(
              SKINFOLD_FIELDS,
              skinfolds,
              (key, val) => setSkinfolds((prev) => ({ ...prev, [key]: val })),
              "mm",
            )}
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
          <Button type="button" variant="ghost" fullWidth onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit" fullWidth isLoading={createAssessment.isPending}>
            {createAssessment.isPending ? "Salvando..." : "Salvar Avaliação"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
