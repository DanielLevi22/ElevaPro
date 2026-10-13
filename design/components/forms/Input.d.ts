import type { ReactNode, InputHTMLAttributes } from "react";

/**
 * @startingPoint section="Forms" subtitle="Text input with label and error state" viewport="700x140"
 */
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: ReactNode;
}

export function Input(props: InputProps): JSX.Element;
