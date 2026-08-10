"use client";

import { useState } from "react";
import type { Student } from "@/shared/hooks/useStudents";

interface StudentMultiSelectProps {
  students: Student[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export function StudentMultiSelect({
  students,
  selectedIds,
  onSelectionChange,
}: StudentMultiSelectProps) {
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredStudents = students.filter(
    (student) =>
      (student.full_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const toggleStudent = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((sid) => sid !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const selectAll = () => {
    onSelectionChange(students.map((s) => s.id));
  };

  const clearAll = () => {
    onSelectionChange([]);
  };

  const selectedStudents = students.filter((s) => selectedIds.includes(s.id));

  return (
    <div>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="w-full bg-overlay-05 border border-overlay-10 rounded-lg px-4 py-3 text-left hover:bg-overlay-10 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            {selectedIds.length === 0 ? (
              <span className="text-muted-foreground">Selecionar alunos (opcional)</span>
            ) : (
              <div>
                <p className="text-foreground font-semibold text-sm mb-1">
                  {selectedIds.length}{" "}
                  {selectedIds.length === 1 ? "aluno selecionado" : "alunos selecionados"}
                </p>
                <p className="text-muted-foreground text-xs truncate">
                  {selectedStudents.map((s) => s.full_name || "Sem nome").join(", ")}
                </p>
              </div>
            )}
          </div>
          <svg
            className="w-5 h-5 text-muted-foreground flex-shrink-0 ml-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-background/60 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />

          {/* Modal Content */}
          <div className="relative bg-surface/95 backdrop-blur-xl border border-overlay-10 rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-overlay-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-foreground">Selecionar Alunos</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-overlay-10 rounded-lg transition-colors"
                >
                  <svg
                    className="w-5 h-5 text-muted-foreground"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Search */}
              <div className="relative mb-3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar aluno..."
                  className="w-full bg-overlay-05 border border-overlay-10 rounded-lg px-4 py-2 pl-10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
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

              {/* Select All / Clear All */}
              <div className="flex gap-2">
                <button
                  onClick={selectAll}
                  className="flex-1 px-3 py-2 bg-secondary/10 border border-secondary rounded-lg text-secondary text-sm font-medium hover:bg-secondary/20 transition-colors"
                >
                  Selecionar Todos
                </button>
                <button
                  onClick={clearAll}
                  className="flex-1 px-3 py-2 bg-destructive/10 border border-destructive rounded-lg text-destructive text-sm font-medium hover:bg-destructive/20 transition-colors"
                >
                  Limpar
                </button>
              </div>
            </div>

            {/* Student List */}
            <div className="flex-1 overflow-y-auto p-4">
              {filteredStudents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <svg
                    className="w-12 h-12 text-muted-foreground mb-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  <p className="text-muted-foreground text-center">
                    {searchQuery ? "Nenhum aluno encontrado" : "Nenhum aluno cadastrado"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredStudents.map((student) => {
                    const isSelected = selectedIds.includes(student.id);
                    return (
                      <button
                        key={student.id}
                        onClick={() => toggleStudent(student.id)}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          isSelected
                            ? "bg-secondary/10 border-secondary"
                            : "bg-overlay-05 border-overlay-10 hover:border-overlay-15"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Checkbox */}
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                              isSelected
                                ? "bg-secondary border-secondary"
                                : "border-muted-foreground"
                            }`}
                          >
                            {isSelected && (
                              <svg
                                className="w-3 h-3 text-background"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                          </div>

                          {/* Student Info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground text-sm mb-0.5">
                              {student.full_name || "Sem nome"}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {student.email}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-overlay-10">
              <button
                onClick={() => setShowModal(false)}
                className="w-full px-4 py-3 bg-secondary text-secondary-foreground rounded-lg font-medium hover:scale-[1.02] hover:shadow-lg hover:shadow-secondary/50 transition-all"
              >
                Confirmar ({selectedIds.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
