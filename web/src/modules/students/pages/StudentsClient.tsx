"use client";

import type { Student } from "@elevapro/shared";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/shared/components/ui/Button";
import { FilterBar } from "@/shared/components/ui/FilterBar";
import { PageHeader } from "@/shared/components/ui/PageHeader";
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
      <PageHeader
        eyebrow="Gestão"
        title="Alunos"
        actions={
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-3.5 h-3.5" />
            Novo Aluno
          </Button>
        }
      />

      <CreateStudentModal isOpen={isCreateModalOpen} onClose={handleStudentCreated} />

      <TransferRequestsList />

      <FilterBar
        query={searchTerm}
        onQueryChange={setSearchTerm}
        searchPlaceholder="Buscar por nome ou email..."
        searchLabel="Buscar aluno por nome ou email"
      />

      {filtered.length > 0 ? (
        <StudentsTable students={filtered} />
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              aria-hidden="true"
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
