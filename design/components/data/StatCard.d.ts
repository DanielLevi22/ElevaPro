import type { ReactNode } from "react";

/**
 * @startingPoint section="Data" subtitle="Metric tile with trend indicator" viewport="700x160"
 */
export interface StatCardProps {
  label: string;
  value: string | number;
  trend?: "up" | "down" | "neutral";
  change?: string;
  icon?: ReactNode;
}

export function StatCard(props: StatCardProps): JSX.Element;
