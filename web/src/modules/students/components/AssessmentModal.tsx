"use client";

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

type Tab = "composicao" | "circunferencias" | "dobras";

const CIRCUMFERENCE_FIELDS: Array<{ key: string; label: string }> = [
  { key: "neck", label: "Pescoço" },
  { key: "shoulder", label: "Ombro" },
  { key: "chest", label: "Peito" },
  { key: "waist", label: "Cintura" },
  { key: "abdomen", label: "Abdômen" },
  { key: "hips", label: "Quadril" },
  { key: "arm_right_relaxed", label: "Braço D (relaxado)" },
  { key: "arm_left_relaxed", label: "Braço E (relaxado)" },
  { key: "arm_right_contracted", label: "Braço D (contraído)" },
  { key: "arm_left_contracted", label: "Braço E (contraído)" },
  { key: "forearm", label: "Antebraço" },
  { key: "thigh_proximal", label: "Coxa proximal" },
  { key: "thigh_distal", label: "Coxa distal" },
  { key: "calf", label: "Panturrilha" },
];

const SKINFOLD_FIELDS: Array<{ key: string; label: string }> = [
  { key: "skinfold_chest", label: "Peitoral" },
  { key: "skinfold_abdominal", label: "Abdominal" },
  { key: "skinfold_thigh", label: "Coxa" },
  { key: "skinfold_triceps", label: "Tríceps" },
  { key: "skinfold_suprailiac", label: "Suprailíaca" },
  { key: "skinfold_subscapular", label: "Subescapular" },
  { key: "skinfold_midaxillary", label: "Axilar média" },
];

function numericField(
  fields: Array<{ key: string; label: string }>,
  values: Record<string, string>,
  onChange: (key: string, val: string) => void,
) {
  return fields.map(({ key, label }) => (
    <FormField key={key} label={`${label} (cm)`} htmlFor={`assess-${key}`} optional>
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
  const [tab, setTab] = useState<Tab>("composicao");
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
    setTab("composicao");
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) return;
    setError(null);

    const toNum = (v: string) => (v !== "" ? Number(v) : null);

    try {
      await createAssessment.mutateAsync({
        studentId,
        weight: toNum(weight),
        height: toNum(height),
        notes: notes || null,
        neck: toNum(circumferences.neck ?? ""),
        shoulder: toNum(circumferences.shoulder ?? ""),
        chest: toNum(circumferences.chest ?? ""),
        waist: toNum(circumferences.waist ?? ""),
        abdomen: toNum(circumferences.abdomen ?? ""),
        hips: toNum(circumferences.hips ?? ""),
        arm_right_relaxed: toNum(circumferences.arm_right_relaxed ?? ""),
        arm_left_relaxed: toNum(circumferences.arm_left_relaxed ?? ""),
        arm_right_contracted: toNum(circumferences.arm_right_contracted ?? ""),
        arm_left_contracted: toNum(circumferences.arm_left_contracted ?? ""),
        forearm_right: toNum(circumferences.forearm ?? ""),
        forearm_left: null,
        thigh_proximal_right: toNum(circumferences.thigh_proximal ?? ""),
        thigh_proximal_left: null,
        thigh_medial_right: toNum(circumferences.thigh_distal ?? ""),
        thigh_medial_left: null,
        calf_right: toNum(circumferences.calf ?? ""),
        calf_left: null,
        skinfold_chest: toNum(skinfolds.skinfold_chest ?? ""),
        skinfold_abdominal: toNum(skinfolds.skinfold_abdominal ?? ""),
        skinfold_thigh: toNum(skinfolds.skinfold_thigh ?? ""),
        skinfold_triceps: toNum(skinfolds.skinfold_triceps ?? ""),
        skinfold_suprailiac: toNum(skinfolds.skinfold_suprailiac ?? ""),
        skinfold_subscapular: toNum(skinfolds.skinfold_subscapular ?? ""),
        skinfold_midaxillary: toNum(skinfolds.skinfold_midaxillary ?? ""),
      });
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar avaliação");
    }
  };

  const TAB_LABELS: Record<Tab, string> = {
    composicao: "Composição",
    circunferencias: "Circunferências",
    dobras: "Dobras",
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
        {tab === "composicao" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Peso (kg)" htmlFor="assess-weight" optional>
                <Input
                  id="assess-weight"
                  type="number"
                  step="0.1"
                  placeholder="75.0"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                />
              </FormField>
              <FormField label="Altura (cm)" htmlFor="assess-height" optional>
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
        {tab === "circunferencias" && (
          <div className="grid grid-cols-2 gap-3">
            {numericField(CIRCUMFERENCE_FIELDS, circumferences, (key, val) =>
              setCircumferences((prev) => ({ ...prev, [key]: val })),
            )}
          </div>
        )}

        {/* Tab: Dobras Cutâneas */}
        {tab === "dobras" && (
          <div className="grid grid-cols-2 gap-3">
            {numericField(
              SKINFOLD_FIELDS.map((f) => ({ ...f, key: f.key })),
              skinfolds,
              (key, val) => setSkinfolds((prev) => ({ ...prev, [key]: val })),
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
