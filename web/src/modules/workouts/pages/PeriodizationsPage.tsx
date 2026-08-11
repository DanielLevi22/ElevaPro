"use client";

import type { Periodization } from "@elevapro/shared";
import { Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/shared/components/ui/Button";
import { FilterBar, type FilterTab } from "@/shared/components/ui/FilterBar";
import { PageHeader } from "@/shared/components/ui/PageHeader";
import { CreatePeriodizationModal } from "../components/CreatePeriodizationModal";
import { PeriodizationsTable } from "../components/PeriodizationsTable";
import { WelcomeBanner } from "../components/WelcomeBanner";

type PeriodizationStatus = "planned" | "active" | "completed";

const STATUS_TABS: FilterTab<PeriodizationStatus | "all">[] = [
  { value: "all", label: "Todas" },
  { value: "active", label: "Ativas" },
  { value: "planned", label: "Planejadas" },
  { value: "completed", label: "Concluídas" },
];

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
      <PageHeader
        title="Periodizações"
        description={
          isMember ? "Seus ciclos de treino" : "Planeje ciclos de treino completos para seus alunos"
        }
        actions={
          <>
            {isMember && (
              <Button asChild variant="secondary">
                <Link href="/dashboard/student/coach">
                  <Sparkles className="w-3.5 h-3.5" />
                  Criar com Coach IA
                </Link>
              </Button>
            )}
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="w-3.5 h-3.5" />
              Nova Periodização
            </Button>
          </>
        }
      />

      <WelcomeBanner currentStep={1} />

      <FilterBar
        query={search}
        onQueryChange={setSearch}
        searchPlaceholder={isMember ? "Buscar por nome..." : "Buscar por nome ou aluno..."}
        searchLabel="Buscar periodização"
        tabs={STATUS_TABS}
        activeTab={filterStatus}
        onTabChange={setFilterStatus}
      />

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
                    <Button asChild variant="secondary">
                      <Link href="/dashboard/student/coach">
                        <Sparkles className="w-3.5 h-3.5" />
                        Criar com Coach IA
                      </Link>
                    </Button>
                  )}
                  <Button onClick={() => setModalOpen(true)}>Nova Periodização</Button>
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
