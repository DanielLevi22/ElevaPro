"use client";

import type { Periodization } from "@elevapro/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CreatePeriodizationModal } from "../components/CreatePeriodizationModal";
import { PeriodizationsTable } from "../components/PeriodizationsTable";
import { WelcomeBanner } from "../components/WelcomeBanner";

type PeriodizationStatus = "planned" | "active" | "completed";

interface Props {
  periodizations: Periodization[];
  isMember: boolean;
  memberStudentId?: string;
}

export default function PeriodizationsPage({ periodizations, isMember, memberStudentId }: Props) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<PeriodizationStatus | "all">("all");

  const filtered = periodizations.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (!isMember && (p.student?.full_name ?? "").toLowerCase().includes(search.toLowerCase()));
    const matchStatus = filterStatus === "all" || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-foreground">Periodizações</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            {isMember
              ? "Seus ciclos de treino"
              : "Planeje ciclos de treino completos para seus alunos"}
          </p>
        </div>
        <div className="flex gap-2 self-start md:self-auto flex-wrap">
          {isMember && (
            <Link
              href="/dashboard/student/coach"
              className="px-5 py-2.5 bg-overlay-05 border border-overlay-10 text-muted-foreground font-medium rounded-lg hover:bg-overlay-10 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              Criar com Coach IA
            </Link>
          )}
          <button
            onClick={() => setModalOpen(true)}
            className="px-5 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Nova Periodização
          </button>
        </div>
      </div>

      <WelcomeBanner currentStep={1} />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isMember ? "Buscar por nome..." : "Buscar por nome ou aluno..."}
            className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-[10px] text-[13px] text-foreground placeholder:text-muted-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <div className="flex gap-2">
          {(["all", "active", "planned", "completed"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              type="button"
              aria-pressed={filterStatus === s}
              className={`px-4 py-2.5 rounded-[10px] text-[12.5px] font-bold border transition-colors ${
                filterStatus === s
                  ? "bg-primary text-primary-foreground border-transparent"
                  : "bg-surface border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {s === "all" && "Todas"}
              {s === "active" && "Ativas"}
              {s === "planned" && "Planejadas"}
              {s === "completed" && "Concluídas"}
            </button>
          ))}
        </div>
      </div>

      {/* Empty */}
      {filtered.length === 0 && (
        <div className="bg-surface border border-overlay-10 rounded-2xl p-8 md:p-12">
          {search || filterStatus !== "all" ? (
            <p className="text-center text-sm text-muted-foreground">
              Nenhuma periodização encontrada. Tente outros filtros.
            </p>
          ) : (
            <>
              {/* Flow steps */}
              <div className="flex items-center justify-center gap-3 flex-wrap mb-8">
                {[
                  { n: 1, label: "Periodização", desc: "Ciclo macro" },
                  { n: 2, label: "Fase", desc: "Bloco temático" },
                  { n: 3, label: "Treino", desc: "Ficha A, B, C..." },
                  { n: 4, label: "Exercícios", desc: "Séries e reps" },
                ].map((step, i, arr) => (
                  <div key={step.n} className="flex items-center gap-3">
                    <div className="flex flex-col items-center text-center w-20">
                      <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-2">
                        <span className="text-sm font-black text-primary">{step.n}</span>
                      </div>
                      <p className="text-xs font-semibold text-foreground">{step.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{step.desc}</p>
                    </div>
                    {i < arr.length - 1 && (
                      <svg
                        className="w-4 h-4 text-muted-foreground/30 mb-5 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    )}
                  </div>
                ))}
              </div>

              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  {isMember ? "Crie seu primeiro ciclo de treino" : "Nenhuma periodização criada"}
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  {isMember
                    ? "Comece criando uma periodização e adicione fases, treinos e exercícios."
                    : "Crie a primeira periodização para um aluno seguindo o fluxo acima."}
                </p>
                <div className="flex gap-3 justify-center flex-wrap">
                  {isMember && (
                    <Link
                      href="/dashboard/student/coach"
                      className="px-5 py-2.5 bg-overlay-05 border border-overlay-10 text-muted-foreground font-medium rounded-lg hover:bg-overlay-10 transition-colors flex items-center gap-2"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                        />
                      </svg>
                      Criar com Coach IA
                    </Link>
                  )}
                  <button
                    onClick={() => setModalOpen(true)}
                    className="px-5 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Nova Periodização
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {filtered.length > 0 && <PeriodizationsTable periodizations={filtered} isMember={isMember} />}

      <CreatePeriodizationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => router.refresh()}
        memberStudentId={memberStudentId}
      />
    </div>
  );
}
