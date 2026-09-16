"use client";

import type { Student } from "@elevapro/shared";
import { useParams } from "next/navigation";
import { useStudents } from "@/shared/hooks/useStudents";
import { formatDate } from "@/shared/utils/formatDate";
import { SpecialistNotes } from "../components/SpecialistNotes";

const SERVICE_LABEL: Record<string, string> = {
  personal_training: "Personal Training",
  nutrition_consulting: "Consultoria Nutricional",
};

const LINK_LABEL: Record<string, string> = {
  active: "Ativo",
  pending: "Pendente",
  inactive: "Encerrado",
};

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-[15px] font-bold text-foreground">{value}</p>
    </div>
  );
}

/** Aba "Visão Geral". Cabeçalho, ações e abas ficam em StudentDetailShell. */
export default function StudentDetailsPage() {
  const params = useParams();
  const studentId = params.id as string;
  const { data: students = [] } = useStudents();

  const student = students.find((s: Student) => s.id === studentId);
  if (!student) return null;

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <InfoCard label="Membro desde" value={formatDate(student.link_created_at, "monthYear")} />
        <InfoCard
          label="Serviço"
          value={SERVICE_LABEL[student.service_type] ?? student.service_type}
        />
        <InfoCard label="Vínculo" value={LINK_LABEL[student.link_status] ?? student.link_status} />
        <InfoCard label="E-mail" value={student.email} />
      </div>
      <SpecialistNotes studentId={student.id} studentName={student.full_name} />
    </>
  );
}
