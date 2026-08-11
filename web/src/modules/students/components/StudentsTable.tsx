"use client";

import type { Student } from "@elevapro/shared";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

interface StudentsTableProps {
  students: Student[];
}

const STATUS_STYLE: Record<Student["account_status"], string> = {
  active: "bg-success/10 text-success border-success/20",
  invited: "bg-warning/10 text-warning border-warning/20",
  inactive: "bg-muted text-muted-foreground border-border",
};

const STATUS_LABEL: Record<Student["account_status"], string> = {
  active: "Ativo",
  invited: "Pendente",
  inactive: "Inativo",
};

function Avatar({ name }: { name: string }) {
  return (
    <span className="w-8 h-8 shrink-0 rounded-full bg-surface-highlight border border-overlay-08 flex items-center justify-center text-xs font-bold text-muted-foreground">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

export function StudentsTable({ students }: StudentsTableProps) {
  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden">
      <div className="hidden md:flex items-center gap-3 px-4 py-2.5 border-b border-border text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
        <span className="w-8" />
        <span className="flex-1">Nome</span>
        <span className="w-24">Status</span>
        <span className="w-6" />
      </div>

      <ul>
        {students.map((student) => {
          const name = student.full_name ?? "Aluno sem nome";
          return (
            <li key={student.id} className="border-b border-border last:border-b-0">
              <Link
                href={`/dashboard/students/${student.id}`}
                className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-overlay-05 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
              >
                <Avatar name={name} />
                <span className="flex-1 min-w-0">
                  <span className="block text-[12.5px] font-bold text-foreground truncate">
                    {name}
                  </span>
                  <span className="block text-[11px] text-muted-foreground truncate">
                    {student.email}
                  </span>
                </span>
                <span className="md:w-24">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-bold ${STATUS_STYLE[student.account_status]}`}
                  >
                    {STATUS_LABEL[student.account_status]}
                  </span>
                </span>
                <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
