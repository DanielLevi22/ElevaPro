"use client";

import type { Student } from "@elevapro/shared";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CreateStudentModal } from "../components/CreateStudentModal";
import { StudentsTable } from "../components/StudentsTable";
import { TransferRequestsList } from "../components/TransferRequestsList";

interface StudentsClientProps {
  initialStudents: Student[];
}

export function StudentsClient({ initialStudents }: StudentsClientProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const filtered = initialStudents.filter(
    (s) =>
      (s.full_name ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleStudentCreated = () => {
    setIsCreateModalOpen(false);
    router.refresh(); // revalidates Server Component data
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
            Gestão
          </p>
          <h1 className="font-display text-2xl font-extrabold text-foreground">Alunos</h1>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2.5 bg-primary text-primary-foreground text-[13px] font-bold rounded-[10px] hover:bg-primary-hover transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo Aluno
        </button>
      </div>

      <CreateStudentModal isOpen={isCreateModalOpen} onClose={handleStudentCreated} />

      <TransferRequestsList />

      {/* Search */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg
            className="h-5 w-5 text-muted-foreground"
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
        <input
          type="text"
          placeholder="Buscar por nome ou email..."
          className="block w-full pl-10 pr-3 py-2.5 border border-border rounded-[10px] leading-5 bg-surface text-foreground placeholder-muted-foreground text-[13px] outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring transition-colors"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filtered.length > 0 ? (
        <StudentsTable students={filtered} />
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">Nenhum aluno encontrado</h3>
          <p className="text-muted-foreground">
            {searchTerm
              ? "Tente buscar com outros termos."
              : "Comece adicionando seu primeiro aluno."}
          </p>
        </div>
      )}
    </div>
  );
}
