import type { ReactNode, CSSProperties } from "react";

/**
 * @startingPoint section="Core" subtitle="Status pill with tinted dot" viewport="700x120"
 */
export interface BadgeProps {
  tone?: "success" | "warning" | "danger" | "neutral" | "primary" | "secondary";
  dot?: boolean;
  children?: ReactNode;
  style?: CSSProperties;
}

export function Badge(props: BadgeProps): JSX.Element;
