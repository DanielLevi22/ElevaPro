"use client";

import { Search } from "lucide-react";

export interface FilterTab<T extends string> {
  value: T;
  label: string;
}

interface FilterBarProps<T extends string> {
  query: string;
  onQueryChange: (value: string) => void;
  searchPlaceholder?: string;
  /** Rotulo acessivel do campo de busca — o placeholder some ao digitar. */
  searchLabel?: string;
  /** Selects extras entre a busca e as pilhas. */
  children?: React.ReactNode;
  tabs?: FilterTab<T>[];
  activeTab?: T;
  onTabChange?: (value: T) => void;
  tabsLabel?: string;
}

/** Compartilhado com os selects que as telas passam via children. */
export const FILTER_SELECT_CLASS =
  "bg-surface border border-border rounded-[10px] px-3 py-2.5 text-[13px] text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring";

/**
 * Barra de filtros do design system: busca, selects opcionais e pilhas de
 * status.
 *
 * @example
 * <FilterBar
 *   query={query}
 *   onQueryChange={setQuery}
 *   tabs={[{ value: "all", label: "Todas" }, { value: "active", label: "Ativas" }]}
 *   activeTab={status}
 *   onTabChange={setStatus}
 * />
 */
export function FilterBar<T extends string>({
  query,
  onQueryChange,
  searchPlaceholder = "Buscar...",
  searchLabel = "Buscar",
  children,
  tabs,
  activeTab,
  onTabChange,
  tabsLabel = "Filtrar por status",
}: FilterBarProps<T>) {
  return (
    <div className="flex flex-col lg:flex-row gap-2.5">
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.75 h-3.75 text-muted-foreground pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchLabel}
          className="w-full py-2.5 pl-9 pr-3 rounded-[10px] border border-border bg-surface text-[13px] text-foreground placeholder:text-muted-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
        />
      </div>

      {children}

      {tabs && tabs.length > 0 && (
        <div className="flex gap-1.5" role="group" aria-label={tabsLabel}>
          {tabs.map((tab) => {
            const isSelected = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => onTabChange?.(tab.value)}
                aria-pressed={isSelected}
                className={`px-3.5 py-2.5 rounded-[10px] text-[12.5px] font-bold border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                  isSelected
                    ? "bg-primary text-primary-foreground border-transparent"
                    : "bg-surface text-muted-foreground border-border hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
