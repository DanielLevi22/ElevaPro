"use client";

import { motion } from "framer-motion";
import { ChevronDown, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ThemeToggle } from "@/shared/components/ui/ThemeToggle";

export interface SidebarNavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

interface DashboardSidebarProps {
  navItems: SidebarNavItem[];
  contextChips: React.ReactNode;
  userEmail: string;
  /** Linha abaixo do nome do usuário; o admin não tem plano. */
  accountLabel?: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onLogout: () => void;
}

const EXPANDED_WIDTH = "w-70";
const COLLAPSED_WIDTH = "w-22";

function BrandMark() {
  return (
    <div className="w-7.5 h-7.5 shrink-0 rounded-[9px] bg-primary text-primary-foreground flex items-center justify-center font-display font-black text-sm">
      E
    </div>
  );
}

function CollapseButton({ isCollapsed, onClick }: { isCollapsed: boolean; onClick: () => void }) {
  const label = isCollapsed ? "Expandir menu lateral" : "Recolher menu lateral";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="w-6.5 h-6.5 shrink-0 flex items-center justify-center rounded-lg bg-overlay-08 border border-overlay-08 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {isCollapsed ? (
        <PanelLeftOpen className="w-3.5 h-3.5" />
      ) : (
        <PanelLeftClose className="w-3.5 h-3.5" />
      )}
    </button>
  );
}

function CloseDrawerButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Fechar menu"
      className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg bg-overlay-08 border border-overlay-08 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <X className="w-4 h-4" />
    </button>
  );
}

/** Barra do topo no celular: lá a sidebar não cabe fixa e vira gaveta. */
function MobileTopBar({ onOpen }: { onOpen: () => void }) {
  return (
    <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 px-4 h-14 glass-panel border-b">
      <button
        type="button"
        onClick={onOpen}
        aria-label="Abrir menu"
        className="w-9 h-9 flex items-center justify-center rounded-lg text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <Menu className="w-5 h-5" />
      </button>
      <BrandMark />
      <span className="font-display font-black italic uppercase text-base leading-none text-foreground">
        Eleva<span className="text-primary-text"> Pro</span>
      </span>
    </header>
  );
}

/** Esc fecha a gaveta, como em qualquer diálogo. */
function useCloseOnEscape(isOpen: boolean, close: () => void) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, close]);
}

function NavBadge({ label, isCollapsed }: { label: string; isCollapsed: boolean }) {
  if (isCollapsed) {
    return (
      <span
        aria-hidden="true"
        className="absolute top-1 right-1 w-1.75 h-1.75 rounded-full bg-primary"
      />
    );
  }
  return (
    <span className="absolute right-4 top-1/2 -translate-y-1/2 z-10 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-extrabold">
      {label}
    </span>
  );
}

/**
 * Menu lateral do dashboard e do admin. No desktop fica fixo e pode ser recolhido; abaixo de
 * `lg` vira gaveta aberta pela barra do topo, porque fixo ele cobria o conteúdo.
 *
 * @example <DashboardSidebar navItems={items} isCollapsed={false} ... />
 */
export function DashboardSidebar({
  navItems,
  contextChips,
  userEmail,
  accountLabel = "Plano Pro ativo",
  isCollapsed: isCollapsedOnDesktop,
  onToggleCollapse,
  onLogout,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);
  // A gaveta abre sempre expandida: recolhida, no celular, só mostraria ícones.
  const isCollapsed = isCollapsedOnDesktop && !isDrawerOpen;
  useCloseOnEscape(isDrawerOpen, closeDrawer);

  const visibleItems = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return navItems;
    return navItems.filter((item) => item.label.toLowerCase().includes(term));
  }, [navItems, query]);

  // Só o match mais longo vence: "/dashboard" casaria com toda subrota, acendendo
  // dois itens ao mesmo tempo e duplicando o layoutId do framer-motion.
  const activeHref = useMemo(() => {
    const matches = navItems
      .filter((item) => pathname === item.href || pathname?.startsWith(`${item.href}/`))
      .sort((a, b) => b.href.length - a.href.length);
    return matches[0]?.href;
  }, [navItems, pathname]);

  return (
    <>
      <MobileTopBar onOpen={() => setIsDrawerOpen(true)} />
      {isDrawerOpen && (
        <button
          type="button"
          aria-hidden="true"
          tabIndex={-1}
          onClick={closeDrawer}
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 transition-[width,translate] duration-300 lg:translate-x-0 ${isDrawerOpen ? "translate-x-0" : "-translate-x-full"} ${isCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH}`}
      >
        <div className="h-full glass-panel border-r flex flex-col overflow-hidden">
          {/* Brand + collapse */}
          <div
            className={`flex items-center border-b border-overlay-08 ${isCollapsed ? "justify-center py-7" : "justify-between px-6 pt-7 pb-5"}`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <BrandMark />
              {!isCollapsed && (
                <span className="font-display font-black italic uppercase text-lg leading-none text-foreground truncate">
                  Eleva<span className="text-primary-text"> Pro</span>
                </span>
              )}
            </div>
            {isDrawerOpen ? (
              <CloseDrawerButton onClick={closeDrawer} />
            ) : (
              !isCollapsed && <CollapseButton isCollapsed={false} onClick={onToggleCollapse} />
            )}
          </div>

          {/* Busca — filtra os itens de menu, não é busca global */}
          {!isCollapsed && (
            <div className="px-5 pt-4 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar..."
                  aria-label="Filtrar itens do menu"
                  className="w-full py-2.5 pl-8.5 pr-3 rounded-[10px] border border-overlay-08 bg-overlay-05 text-foreground text-xs placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
                />
              </div>
            </div>
          )}

          {isCollapsed ? (
            <div className="flex justify-center mt-3 mb-1">
              <CollapseButton isCollapsed onClick={onToggleCollapse} />
            </div>
          ) : (
            <p className="px-6 pt-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
              Menu
            </p>
          )}

          {!isCollapsed && contextChips}

          {/* Navigation */}
          <nav
            className={`flex-1 flex flex-col gap-1 overflow-y-auto custom-scrollbar ${isCollapsed ? "items-center px-3 py-2" : "px-4"}`}
          >
            {visibleItems.map((item) => {
              const isActive = item.href === activeHref;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={isCollapsed ? item.label : undefined}
                  onClick={closeDrawer}
                  className={`group relative flex items-center rounded-2xl transition-all duration-300 ${isCollapsed ? "w-11 h-11 justify-center" : "gap-4 px-6 py-4"}`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-nav"
                      className="absolute inset-0 bg-primary/10 border border-primary/20 rounded-2xl shadow-[0_0_20px_hsl(var(--primary)/0.05)]"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <div
                    className={`z-10 transition-transform duration-300 ${isActive ? "scale-110 text-primary-text" : "group-hover:scale-110 opacity-60 group-hover:opacity-100 group-hover:text-foreground"}`}
                  >
                    {item.icon}
                  </div>
                  {!isCollapsed && (
                    <span
                      className={`text-sm font-bold uppercase tracking-widest z-10 transition-colors duration-300 ${isActive ? "text-foreground italic" : "text-muted-foreground group-hover:text-foreground"}`}
                    >
                      {item.label}
                    </span>
                  )}
                  {item.badge && <NavBadge label={item.badge} isCollapsed={isCollapsed} />}
                </Link>
              );
            })}
            {visibleItems.length === 0 && (
              <p className="px-6 py-4 text-xs text-muted-foreground">Nenhum item encontrado.</p>
            )}
          </nav>

          {/* User */}
          <div className={isCollapsed ? "p-3" : "p-5"}>
            <div
              className={`bg-(--panel-bg) border border-overlay-08 rounded-[20px] flex items-center gap-2.5 ${isCollapsed ? "flex-col p-2" : "px-3 py-2.5"}`}
            >
              <div className="w-9 h-9 shrink-0 rounded-xl bg-surface-highlight border border-overlay-08 flex items-center justify-center font-bold text-muted-foreground">
                {userEmail.charAt(0).toUpperCase()}
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-extrabold uppercase text-foreground truncate">
                    {userEmail.split("@")[0]}
                  </p>
                  <p className="text-[9px] font-bold text-muted-foreground">{accountLabel}</p>
                </div>
              )}
              <ThemeToggle />
              <button
                type="button"
                onClick={onLogout}
                aria-label="Sair"
                title="Sair"
                className="w-9 h-9 shrink-0 flex items-center justify-center rounded-xl text-muted-foreground transition-all border border-transparent hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <LogOut className="w-4 h-4" />
              </button>
              {!isCollapsed && (
                <ChevronDown
                  className="w-3.5 h-3.5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
