"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/shared/components/ui/Button";
import { useStudents } from "@/shared/hooks/useStudents";
import { formatDate } from "@/shared/utils/formatDate";
import { AssessmentModal } from "./AssessmentModal";
import { EditStudentModal } from "./EditStudentModal";

/**
 * Abas do detalhe do aluno. "Treinos" não aparece: a rota
 * /dashboard/students/[id]/workouts não existe — os treinos foram unificados em
 * /dashboard/workouts, que ainda não aceita filtro por aluno.
 */
const TABS = [
  { segment: "", label: "Visão Geral" },
  { segment: "nutrition", label: "Nutrição" },
  { segment: "assessments", label: "Avaliações" },
  { segment: "anamnesis", label: "Anamnese" },
  { segment: "metrics", label: "Métricas" },
  { segment: "muscle-map", label: "Mapa Muscular" },
  { segment: "body-scan", label: "Análise Corporal" },
  { segment: "activities", label: "Atividades" },
  { segment: "ai-coach", label: "AI Coach" },
];

const STATUS_LABEL: Record<string, string> = {
  active: "Ativo",
  invited: "Pendente",
  inactive: "Inativo",
};

const STATUS_STYLE: Record<string, string> = {
  active: "bg-success/10 text-success border-success/20",
  invited: "bg-warning/10 text-warning border-warning/20",
  inactive: "bg-muted text-muted-foreground border-border",
};

function formatMemberSince(linkCreatedAt: string | null): string {
  if (!linkCreatedAt) return "";
  return ` · membro desde ${formatDate(linkCreatedAt, "monthYear")}`;
}

export function StudentDetailShell({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const studentId = params.id as string;
  const { data: students = [], isLoading } = useStudents();
  // Os modais usam o próprio studentId como gatilho de abertura: null = fechado.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [assessingId, setAssessingId] = useState<string | null>(null);

  const student = students.find((s) => s.id === studentId);
  const base = `/dashboard/students/${studentId}`;

  if (isLoading) {
    return <p className="p-8 text-center text-muted-foreground">Carregando...</p>;
  }

  if (!student) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-foreground mb-2">Aluno não encontrado</h3>
        <button
          type="button"
          onClick={() => router.push("/dashboard/students")}
          className="text-primary-text hover:underline"
        >
          Voltar para lista de alunos
        </button>
      </div>
    );
  }

  const name = student.full_name ?? "Aluno sem nome";

  return (
    <div className="space-y-5">
      <Link
        href="/dashboard/students"
        aria-label="Voltar para lista de alunos"
        className="w-8.5 h-8.5 flex items-center justify-center rounded-[10px] bg-overlay-08 border border-border text-foreground transition-colors hover:bg-overlay-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <ArrowLeft className="w-4 h-4" />
      </Link>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <span className="w-14 h-14 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary-text font-bold text-xl">
            {name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h1 className="font-display text-xl font-extrabold text-foreground truncate">
                {name}
              </h1>
              <span
                className={`shrink-0 px-2 py-0.5 rounded-full border text-[10px] font-bold ${STATUS_STYLE[student.account_status]}`}
              >
                {STATUS_LABEL[student.account_status]}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground truncate">
              {student.email}
              {formatMemberSince(student.link_created_at)}
            </p>
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          <Button variant="secondary" onClick={() => setEditingId(studentId)}>
            Editar Perfil
          </Button>
          <Button onClick={() => setAssessingId(studentId)}>Nova Avaliação</Button>
        </div>
      </div>

      <nav className="flex gap-1.5 overflow-x-auto custom-scrollbar border-b border-border pb-px">
        {TABS.map((tab) => {
          const href = tab.segment ? `${base}/${tab.segment}` : base;
          const isActive = pathname === href;
          return (
            <Link
              key={tab.segment || "overview"}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={`shrink-0 px-3.5 py-2.5 text-[12.5px] font-bold whitespace-nowrap border-b-2 -mb-px transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring ${
                isActive
                  ? "border-primary text-primary-text"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {children}

      <EditStudentModal studentId={editingId} onClose={() => setEditingId(null)} />
      <AssessmentModal studentId={assessingId} onClose={() => setAssessingId(null)} />
    </div>
  );
}
