interface PageHeaderProps {
  title: string;
  /** Sobrelinha em caixa alta acima do titulo, ex.: "Gestão". */
  eyebrow?: string;
  description?: string;
  /** Botoes a direita. */
  actions?: React.ReactNode;
  /** Titulo em gradiente da marca — reservado ao dashboard e a listagem de dietas. */
  gradient?: boolean;
}

/**
 * Cabecalho de pagina do design system: sobrelinha, titulo, descricao e acoes.
 *
 * @example
 * <PageHeader eyebrow="Gestão" title="Alunos" actions={<Button>Novo Aluno</Button>} />
 */
export function PageHeader({
  title,
  eyebrow,
  description,
  actions,
  gradient = false,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
            {eyebrow}
          </p>
        )}
        <h1
          className={
            gradient
              ? "font-display text-3xl font-extrabold bg-linear-to-r from-primary via-secondary to-accent bg-clip-text text-transparent"
              : "font-display text-3xl font-extrabold text-foreground"
          }
        >
          {title}
        </h1>
        {description && <p className="mt-1.5 text-[13px] text-muted-foreground">{description}</p>}
      </div>

      {actions && <div className="flex gap-2 shrink-0 flex-wrap">{actions}</div>}
    </div>
  );
}
