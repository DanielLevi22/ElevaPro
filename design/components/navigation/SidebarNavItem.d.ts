import type { ReactNode } from "react";

/**
 * @startingPoint section="Navigation" subtitle="Sidebar link with animated active state" viewport="700x140"
 */
export interface SidebarNavItemProps {
  icon: ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

export function SidebarNavItem(props: SidebarNavItemProps): JSX.Element;
