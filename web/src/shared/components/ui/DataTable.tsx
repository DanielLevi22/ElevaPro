"use client";

import Link from "next/link";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  /**
   * Classe de largura JA com o prefixo responsivo, ex.: "md:w-24".
   *
   * Precisa vir pronta porque o Tailwind so gera o que aparece literalmente no
   * codigo — montar `${breakpoint}:${width}` em runtime produz classe que nao
   * existe no CSS. Sem largura, a coluna ocupa o espaco restante.
   */
  width?: string;
  /** Empilha no mobile em vez de sumir. Colunas secundarias somem. */
  keepOnMobile?: boolean;
  render: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Navegacao da linha inteira. Use isto ou onRowClick, nao os dois. */
  rowHref?: (row: T) => string;
  onRowClick?: (row: T) => void;
  /** Rotulo acessivel da area navegavel, que abrange varias colunas. */
  rowLabel?: (row: T) => string;
  /** Acao a direita, fora da area navegavel — botao dentro de link e invalido. */
  rowAction?: (row: T) => React.ReactNode;
  isLoading?: boolean;
  skeletonRows?: number;
  emptyState?: React.ReactNode;
  /** Ponto em que as linhas deixam de ser cartoes empilhados e viram tabela. */
  breakpoint?: "md" | "lg";
}

/** Literais, nao interpolacao: o Tailwind precisa ver cada classe no fonte. */
const BREAKPOINT = {
  md: {
    header: "hidden md:flex",
    row: "md:flex-row md:items-center md:gap-3",
    hide: "hidden md:block",
  },
  lg: {
    header: "hidden lg:flex",
    row: "lg:flex-row lg:items-center lg:gap-3",
    hide: "hidden lg:block",
  },
} as const;

const SHELL = "bg-surface border border-border rounded-2xl overflow-hidden";
const HEADER =
  "items-center gap-3 px-4 py-2.5 border-b border-border text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground";

function DataTableSkeleton({ columnCount, rows }: { columnCount: number; rows: number }) {
  return (
    <div className={SHELL} aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={`skeleton-${index}`}
          className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0"
        >
          <span className="flex-1 min-w-0 space-y-1.5">
            <span className="block h-3 w-2/5 rounded bg-overlay-10 animate-pulse" />
            <span className="block h-2.5 w-1/4 rounded bg-overlay-05 animate-pulse" />
          </span>
          {Array.from({ length: Math.max(0, columnCount - 1) }, (_, cell) => (
            <span
              key={`skeleton-${index}-${cell}`}
              className="hidden md:block w-24 h-3 rounded bg-overlay-05 animate-pulse"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Tabela do design system: casca, cabecalho, divisorias, hover, foco, esqueleto
 * e vazio num lugar so. As telas descrevem colunas; nenhuma repete a estrutura.
 *
 * @example
 * <DataTable
 *   columns={[
 *     { key: "name", header: "Nome", render: (s) => s.full_name },
 *     { key: "status", header: "Status", width: "md:w-24", render: (s) => <StatusBadge>{s.status}</StatusBadge> },
 *   ]}
 *   rows={students}
 *   rowKey={(s) => s.id}
 *   rowHref={(s) => `/dashboard/students/${s.id}`}
 * />
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  rowHref,
  onRowClick,
  rowLabel,
  rowAction,
  isLoading,
  skeletonRows = 6,
  emptyState,
  breakpoint = "md",
}: DataTableProps<T>) {
  const bp = BREAKPOINT[breakpoint];

  if (isLoading) {
    return <DataTableSkeleton columnCount={columns.length} rows={skeletonRows} />;
  }

  if (rows.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  const widthClass = (width?: string) => width ?? "flex-1 min-w-0";
  const navigable = `flex flex-col ${bp.row} gap-1.5 flex-1 min-w-0 text-left rounded-sm focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring`;

  return (
    <div className={SHELL}>
      <div className={`${bp.header} ${HEADER}`}>
        {columns.map((column) => (
          <span key={column.key} className={widthClass(column.width)}>
            {column.header}
          </span>
        ))}
        {rowAction && <span className="w-8" />}
      </div>

      <ul>
        {rows.map((row) => {
          const cells = columns.map((column, index) => (
            <span
              key={column.key}
              className={
                index === 0
                  ? widthClass(column.width)
                  : `${widthClass(column.width)} text-[11.5px] text-muted-foreground ${column.keepOnMobile ? "" : bp.hide}`
              }
            >
              {column.render(row)}
            </span>
          ));

          return (
            <li key={rowKey(row)} className="border-b border-border last:border-b-0">
              <div className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-overlay-05">
                {rowHref ? (
                  <Link href={rowHref(row)} aria-label={rowLabel?.(row)} className={navigable}>
                    {cells}
                  </Link>
                ) : onRowClick ? (
                  <button
                    type="button"
                    onClick={() => onRowClick(row)}
                    aria-label={rowLabel?.(row)}
                    className={navigable}
                  >
                    {cells}
                  </button>
                ) : (
                  <div className={navigable}>{cells}</div>
                )}

                {rowAction && <span className="shrink-0">{rowAction(row)}</span>}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
