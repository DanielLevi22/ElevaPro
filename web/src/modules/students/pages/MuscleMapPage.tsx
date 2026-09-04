"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  GRUPOS_MUSCULARES,
  grupoDaMalha,
  rotuloDaMalha,
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

  // Acordeão: com onze grupos e até três sub-músculos cada, a lista aberta
  // passava de trinta linhas e o corpo perdia a lateral inteira de altura.
  const [aberto, setAberto] = useState<string | null>(null);

  // A seleção manda no acordeão, venha ela de onde vier. Sem isto, clicar num
  // músculo **no boneco** selecionava certo e a lateral não mostrava nada: o
  // item ficava marcado dentro de um grupo fechado, e de fora parecia que o
  // clique não tinha funcionado.
  useEffect(() => {
    if (!selectedMuscle) return;
    setAberto(
      SUBMUSCULOS[selectedMuscle as keyof typeof SUBMUSCULOS]
        ? selectedMuscle
        : grupoDaMalha(selectedMuscle),
    );
  }, [selectedMuscle]);

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
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur-md">
      <h3 className="font-bold text-[10px] text-white/40 uppercase tracking-widest">
        Grupos musculares
      </h3>

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
                onClick={() => {
                  onSelect(isSelected ? null : group);
                  // Só o fechar fica aqui; o abrir é o efeito acima, que serve
                  // ao clique na lateral e ao clique no boneco de uma vez.
                  if (isSelected) setAberto(null);
                }}
                className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                  isSelected
                    ? "border-primary/40 bg-primary/20"
                    : "border-transparent hover:bg-white/5"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`font-medium text-sm ${
                      isSelected ? "text-primary" : hasData ? "text-white" : "text-white/45"
                    }`}
                  >
                    {group}
                  </span>
                  <div className="flex items-center gap-2">
                    {/* Sem volume, nada: o traço que ficava aqui não dizia
                        mais que a ausência do número, e encostado na seta
                        parecia parte do controle de abrir. */}
                    {hasData && <span className="text-white/50 text-xs">{pct}%</span>}
                    {partes.length > 1 && (
                      <span
                        className={`text-[10px] text-white/35 transition-transform ${
                          aberto === group ? "rotate-90" : ""
                        }`}
                      >
                        ▶
                      </span>
                    )}
                  </div>
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

              {/* Sub-músculos do grupo aberto.

                  O percentual não se repete no sub-item de propósito: o volume
                  é do grupo, e mostrar o mesmo número em três linhas sugeriria
                  que o dado distingue as cabeças. Ele não distingue — ainda. */}
              {partes.length > 1 && aberto === group && (
                <ul className="mt-1 ml-3 flex flex-col gap-0.5 border-white/10 border-l pl-3">
                  {partes.map((parte) => (
                    <li key={parte}>
                      <button
                        className={`w-full rounded px-2 py-1 text-left text-xs transition-colors ${
                          selectedMuscle === parte
                            ? "bg-primary/20 text-primary"
                            : "text-white/45 hover:bg-white/5 hover:text-white"
                        }`}
                        onClick={() => onSelect(selectedMuscle === parte ? null : parte)}
                        type="button"
                      >
                        {rotuloDaMalha(parte)}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>

      {/*
        O volume é do grupo, e a tela precisa dizer isso.
        `exercises.muscle_group` tem nove valores grossos: `pernas` é um só para
        quadríceps, isquiotibiais e panturrilha, e `ombro` é um só para as três
        cabeças do deltoide. Sem este aviso, um personal que vê os três
        deltoides da mesma cor conclui que o aluno treinou os três por igual —
        e a tela terá dito isso sem ser verdade. Some quando o catálogo de
        exercícios ganhar valores finos.
      */}
      <p className="border-border border-t pt-3 text-[11px] text-muted-foreground leading-relaxed">
        A cor mostra o volume do <strong className="text-foreground">grupo</strong>. As divisões
        abaixo de cada um são anatômicas — o registro de treino ainda não separa uma cabeça da
        outra.
      </p>

      {selectedMuscle && (
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="text-left text-white/40 text-xs transition-colors hover:text-white"
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

  // Tela cheia cobre a navegação do dashboard; o modo normal a preserva. A
  // imersão total é boa para explorar e ruim para quem só passou para conferir
  // um número e quer voltar às outras abas do aluno — por isso é escolha, não
  // imposição.
  const [telaCheia, setTelaCheia] = useState(false);

  // O portal existe por causa do empilhamento, não por capricho: o conteúdo do
  // dashboard vive dentro de um `relative z-10`, que cria contexto próprio, e a
  // sidebar é `z-50` fora dele. Nenhum `z-index` daqui passa por cima dela —
  // filho de contexto não escapa do pai. Só saindo para o `body` a tela cheia
  // cobre mesmo a navegação.
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  // Esc sai da tela cheia. Sem isso, a única saída seria o botão, e tela cheia
  // sem tecla de fuga prende quem entrou sem querer.
  useEffect(() => {
    if (!telaCheia) return;
    const aoTeclar = (e: KeyboardEvent) => e.key === "Escape" && setTelaCheia(false);
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [telaCheia]);

  const { data: metrics, isLoading } = useWorkoutMetrics(studentId, days);
  const volumeByMuscle = useMemo(() => metrics?.volumeByMuscle ?? [], [metrics]);

  // Uma vez, e não duas vezes por render como estava. Cada chamada devolvia
  // array novo, o que invalidava o `useMemo` do viewer e mandava ele repintar
  // as 26 malhas a cada mudança de estado — inclusive ao abrir o acordeão.
  const porMalha = useMemo(() => volumePorMalha(volumeByMuscle), [volumeByMuscle]);

  const cena = (
    /*
     * A tela inteira é o ambiente, não um cartão dentro de uma página.
     *
     * O corpo ocupa a viewport e a informação **orbita** ele em vidro
     * translúcido, em vez de dividir espaço em colunas. A diferença não é
     * decorativa: numa grade, o olho lê da esquerda para a direita e o boneco
     * vira mais um bloco; assim ele é o assunto e o resto flutua por cima.
     *
     * `fixed` e não `absolute` porque a página vive dentro do layout do
     * dashboard, que tem seu próprio scroll — sem isso a cena herdaria a altura
     * do conteúdo e voltaria a ser um cartão alto.
     */
    <div
      className={
        telaCheia
          ? "fixed inset-0 z-50 overflow-hidden bg-background"
          : "relative h-[calc(100vh-13rem)] overflow-hidden rounded-2xl border border-border bg-background"
      }
    >
      {/* Brilho ambiente atrás do corpo. Dá um "lugar" ao vazio: sem ele o
          fundo é preto chapado e a cena parece um recorte. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 55% at 50% 40%, color-mix(in srgb, var(--color-primary) 10%, transparent), transparent 70%)",
        }}
      />

      <div className="absolute inset-0">
        <MuscleMapViewer
          onMuscleSelect={setSelectedMuscle}
          selectedMuscle={selectedMuscle}
          volumeByMuscle={porMalha}
        />
      </div>

      {/* ── Cabeçalho flutuante ─────────────────────────────────────────── */}
      <div className="pointer-events-none absolute top-0 right-0 left-0 flex items-start justify-between gap-4 p-6">
        <div className="pointer-events-auto flex items-center gap-3">
          <Link
            className="rounded-full border border-border bg-surface/70 p-2.5 text-muted-foreground backdrop-blur-md transition-colors hover:text-foreground"
            href={`/dashboard/students/${studentId}`}
          >
            <svg
              aria-hidden="true"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M15 19l-7-7 7-7"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          </Link>
          <div>
            <p className="font-bold text-[10px] text-primary uppercase tracking-[0.2em]">
              Mapa Muscular
            </p>
            {student && (
              <h1 className="font-bold text-foreground text-xl leading-tight">
                {student.full_name}
              </h1>
            )}
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <button
            aria-label={telaCheia ? "Sair da tela cheia" : "Ver em tela cheia"}
            className="rounded-full border border-border bg-surface/70 p-2.5 text-muted-foreground backdrop-blur-md transition-colors hover:text-foreground"
            onClick={() => setTelaCheia((v) => !v)}
            title={telaCheia ? "Sair da tela cheia (Esc)" : "Ver em tela cheia"}
            type="button"
          >
            <svg
              aria-hidden="true"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d={
                  telaCheia
                    ? "M9 9L4 4m0 0v5m0-5h5m6 6l5 5m0 0v-5m0 5h-5"
                    : "M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5"
                }
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          </button>

          <div className="flex items-center gap-1 rounded-full border border-border bg-surface/70 p-1 backdrop-blur-md">
            {PERIODS.map((p) => (
              <button
                className={`rounded-full px-3.5 py-1.5 font-medium text-xs transition-colors ${
                  days === p.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                key={p.value}
                onClick={() => setDays(p.value as 90 | 180 | 365)}
                type="button"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Números, embaixo à esquerda ─────────────────────────────────── */}
      <div className="pointer-events-none absolute bottom-6 left-6 flex gap-6 rounded-2xl border border-border bg-surface/70 px-6 py-4 backdrop-blur-md">
        {[
          { rotulo: "Grupos treinados", valor: isLoading ? "—" : String(volumeByMuscle.length) },
          {
            rotulo: "Volume total",
            valor: isLoading
              ? "—"
              : `${(metrics?.totalVolume ?? 0).toLocaleString("pt-BR")} kg·rep`,
          },
          { rotulo: "Músculo + treinado", valor: isLoading ? "—" : (metrics?.topMuscle ?? "—") },
        ].map((n) => (
          <div key={n.rotulo}>
            <p className="mb-1 font-bold text-[10px] text-muted-foreground uppercase tracking-widest">
              {n.rotulo}
            </p>
            <p className="font-bold text-foreground text-lg">{n.valor}</p>
          </div>
        ))}
      </div>

      {/* ── Lista muscular, à direita ───────────────────────────────────── */}
      <div className="absolute top-24 right-6 bottom-6 w-[268px] overflow-y-auto">
        <MuscleGroupPanel
          onSelect={setSelectedMuscle}
          selectedMuscle={selectedMuscle}
          volumeByMuscle={porMalha}
        />
      </div>

      <p className="pointer-events-none absolute right-6 bottom-2 text-[10px] text-muted-foreground/60">
        {telaCheia
          ? "arraste para girar · scroll para aproximar · Esc para sair"
          : "arraste para girar · scroll para aproximar"}
      </p>
    </div>
  );

  // Em tela cheia a cena sai para o `body`; no modo normal ela fica no fluxo da
  // página, com a navegação do dashboard visível em volta.
  if (!telaCheia) return cena;
  return montado ? createPortal(cena, document.body) : null;
}
