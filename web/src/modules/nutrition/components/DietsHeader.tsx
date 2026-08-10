"use client";

interface DietsHeaderProps {
  onCreateClick: () => void;
  onImportClick: () => void;
}

export function DietsHeader({ onCreateClick, onImportClick }: DietsHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-extrabold bg-linear-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
          Dietas e Nutrição
        </h1>
        <p className="text-[13px] text-muted-foreground mt-1.5">
          Gerencie os planos alimentares dos seus alunos
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onImportClick}
          className="px-4 py-2.5 bg-surface border border-border text-foreground rounded-[10px] text-[13px] font-bold hover:bg-overlay-05 transition-all flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
          Importar Dieta
        </button>
        <button
          type="button"
          onClick={onCreateClick}
          className="px-4 py-2.5 bg-primary text-primary-foreground rounded-[10px] text-[13px] font-bold hover:bg-primary-hover transition-all flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Criar Plano
        </button>
      </div>
    </div>
  );
}
