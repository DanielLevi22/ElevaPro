"use client";

import { Button } from "@/shared/components/ui/Button";

interface DietsEmptyStateProps {
  hasFilter: boolean;
  onCreateClick: () => void;
}

export function DietsEmptyState({ hasFilter, onCreateClick }: DietsEmptyStateProps) {
  return (
    <div className="text-center py-16">
      <div className="w-24 h-24 bg-surface rounded-full flex items-center justify-center mx-auto mb-6">
        <svg
          aria-hidden="true"
          className="w-12 h-12 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">Nenhum plano encontrado</h3>
      <p className="text-muted-foreground mb-6">
        {hasFilter
          ? "Este aluno ainda não possui planos alimentares cadastrados."
          : "Você ainda não possui planos alimentares cadastrados para seus alunos."}
      </p>
      <Button size="lg" onClick={onCreateClick}>
        Criar Primeiro Plano
      </Button>
    </div>
  );
}
