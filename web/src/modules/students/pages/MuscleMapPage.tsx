"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import {
  GRUPOS_MUSCULARES,
  SUBMUSCULOS,
  volumePorMalha,
} from "@/modules/students/components/muscle-map/grupos";
import { useStudents } from "@/shared/hooks/useStudents";
import { useWorkoutMetrics } from "@/shared/hooks/useWorkoutMetrics";

// Three.js requires browser APIs — disable SSR
const MuscleMapViewer = dynamic(
  () =>
    import("../components/muscle-map/MuscleMapViewer").then((m) => ({
      default: m.MuscleMapViewer,
    })),
  { ssr: false, loading: () => <CanvasSkeleton /> },
);

// ── Skeleton shown while the dynamic import loads ─────────────────────────────

function CanvasSkeleton() {
  return (
    <div className="bg-surface border border-white/10 rounded-xl h-150 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="w-12 h-12 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        <span className="text-sm">Carregando modelo 3D…</span>
      </div>
    </div>
  );
}

// ── Period selector ───────────────────────────────────────────────────────────

const PERIODS = [
  { label: "90 dias", value: 90 },
  { label: "180 dias", value: 180 },
  { label: "365 dias", value: 365 },
] as const;

// All muscle groups in display order
// A lista sai de `grupos.ts`, que é o mesmo acordo de nome que o modelo usa.
// Antes vinha das chaves do `MUSCLE_MESH_MAP`, então a lateral e a pintura
// compartilhavam a mesma fonte errada.
const ALL_GROUPS = [...GRUPOS_MUSCULARES];

// ── Full muscle group side panel ──────────────────────────────────────────────

interface MuscleGroupPanelProps {
  volumeByMuscle: { muscle: string; volume: number }[];
  selectedMuscle: string | null;
  onSelect: (muscle: string | null) => void;
}

function MuscleGroupPanel({ volumeByMuscle, selectedMuscle, onSelect }: MuscleGroupPanelProps) {
  const volumeMap = new Map(volumeByMuscle.map((m) => [m.muscle, m.volume]));

  // O volume de um grupo é o de qualquer sub-músculo dele: todos carregam o
  // mesmo número, porque o banco não distingue. Somar contaria o mesmo treino
  // três vezes no quadríceps.
  const volumeDoGrupo = (grupo: (typeof GRUPOS_MUSCULARES)[number]) =>
    volumeMap.get(SUBMUSCULOS[grupo][0]);

  const total = GRUPOS_MUSCULARES.reduce((s, g) => s + (volumeDoGrupo(g) ?? 0), 0);

  // Sort: groups with data first (descending volume), then the rest alphabetically
  const sorted = [...ALL_GROUPS].sort((a, b) => {
    const va = volumeDoGrupo(a) ?? -1;
    const vb = volumeDoGrupo(b) ?? -1;
    if (va !== vb) return vb - va;
    return a.localeCompare(b, "pt-BR");
  });

  return (
    <div className="bg-surface border border-white/10 rounded-xl p-5 flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-foreground">Grupos musculares</h3>

      <ol className="flex flex-col gap-1">
        {sorted.map((group) => {
          const volume = volumeDoGrupo(group);
          const partes = SUBMUSCULOS[group];
          const pct = volume !== undefined && total > 0 ? Math.round((volume / total) * 100) : 0;
          const hasData = volume !== undefined;
          const isSelected = selectedMuscle === group;

          return (
            <li key={group}>
              <button
                type="button"
                onClick={() => onSelect(isSelected ? null : group)}
                className={`w-full text-left rounded-lg px-3 py-2 transition-colors ${
                  isSelected
                    ? "bg-primary/15 border border-primary/30"
                    : "hover:bg-white/5 border border-transparent"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-sm font-medium ${
                      isSelected
                        ? "text-primary"
                        : hasData
                          ? "text-foreground"
                          : "text-muted-foreground"
                    }`}
                  >
                    {group}
                  </span>
                  <span className="text-xs text-muted-foreground">{hasData ? `${pct}%` : "—"}</span>
                </div>

                {hasData && (
                  <div className="w-full bg-white/5 rounded-full h-1 mt-1.5 overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
              </button>

              {/* Sub-músculos, só onde a geometria do modelo divide. Grupo que
                  não divide não mostra sub-item — o deltoide é uma malha só por
                  lado, e listar "anterior/lateral/posterior" ali prometeria uma
                  separação que não existe.

                  O percentual não se repete no sub-item de propósito: o volume
                  é do grupo, e mostrar o mesmo número três vezes sugeriria que
                  o dado distingue as cabeças. Ele não distingue — ainda. */}
              {partes.length > 1 && (
                <ul className="mt-1 ml-3 flex flex-col gap-0.5 border-white/10 border-l pl-3">
                  {partes.map((parte) => (
                    <li key={parte}>
                      <button
                        className={`w-full rounded px-2 py-1 text-left text-xs transition-colors ${
                          selectedMuscle === parte
                            ? "bg-primary/15 text-primary"
                            : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                        }`}
                        onClick={() => onSelect(selectedMuscle === parte ? null : parte)}
                        type="button"
                      >
                        {parte}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>

      {selectedMuscle && (
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors text-left"
        >
          ✕ Limpar seleção
        </button>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MuscleMapPage() {
  const params = useParams();
  const studentId = params.id as string;
  const { data: students = [] } = useStudents();
  const student = students.find((s) => s.id === studentId);

  const [days, setDays] = useState<90 | 180 | 365>(90);
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);

  const { data: metrics, isLoading } = useWorkoutMetrics(studentId, days);
  const volumeByMuscle = metrics?.volumeByMuscle ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/students/${studentId}`}
            className="p-2 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg
              aria-hidden="true"
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Mapa Muscular</h1>
            {student && <p className="text-sm text-muted-foreground mt-0.5">{student.full_name}</p>}
          </div>
        </div>

        {/* Period selector */}
        <div className="flex items-center gap-1 bg-surface border border-white/10 rounded-lg p-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setDays(p.value as 90 | 180 | 365)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                days === p.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface border border-white/10 rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Grupos treinados</p>
          <p className="text-2xl font-bold text-foreground">
            {isLoading ? "—" : volumeByMuscle.length}
          </p>
        </div>
        <div className="bg-surface border border-white/10 rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Volume total</p>
          <p className="text-2xl font-bold text-foreground">
            {isLoading ? "—" : `${(metrics?.totalVolume ?? 0).toLocaleString("pt-BR")} kg·rep`}
          </p>
        </div>
        <div className="bg-surface border border-white/10 rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Músculo + treinado</p>
          <p className="text-2xl font-bold text-primary">
            {isLoading ? "—" : (metrics?.topMuscle ?? "—")}
          </p>
        </div>
      </div>

      {/* Main layout: viewer + side panel */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6 items-start">
        <MuscleMapViewer
          volumeByMuscle={volumePorMalha(volumeByMuscle)}
          selectedMuscle={selectedMuscle}
          onMuscleSelect={setSelectedMuscle}
        />

        <MuscleGroupPanel
          volumeByMuscle={volumePorMalha(volumeByMuscle)}
          selectedMuscle={selectedMuscle}
          onSelect={setSelectedMuscle}
        />
      </div>
    </div>
  );
}
