import type { ReactNode, MouseEventHandler, CSSProperties } from "react";

/**
 * @startingPoint section="Core" subtitle="Pill button — primary/secondary/outline/ghost/destructive" viewport="700x160"
 */
export interface ButtonProps {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  disabled?: boolean;
  isLoading?: boolean;
  icon?: ReactNode;
  children?: ReactNode;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  style?: CSSProperties;
}

export function Button(props: ButtonProps): JSX.Element;
