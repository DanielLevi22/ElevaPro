"use client";

import { Plus, Upload } from "lucide-react";
import { Button } from "@/shared/components/ui/Button";
import { PageHeader } from "@/shared/components/ui/PageHeader";

interface DietsHeaderProps {
  onCreateClick: () => void;
  onImportClick: () => void;
}

export function DietsHeader({ onCreateClick, onImportClick }: DietsHeaderProps) {
  return (
    <PageHeader
      gradient
      title="Dietas e Nutrição"
      description="Gerencie os planos alimentares dos seus alunos"
      actions={
        <>
          <Button variant="secondary" onClick={onImportClick}>
            <Upload className="w-3.5 h-3.5" />
            Importar Dieta
          </Button>
          <Button onClick={onCreateClick}>
            <Plus className="w-3.5 h-3.5" />
            Criar Plano
          </Button>
        </>
      }
    />
  );
}
