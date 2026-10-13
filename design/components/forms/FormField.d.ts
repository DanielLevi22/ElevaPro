import type { ReactNode } from "react";

/**
 * @startingPoint section="Forms" subtitle="Label/hint wrapper for any form control" viewport="700x140"
 */
export interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  children?: ReactNode;
}

export function FormField(props: FormFieldProps): JSX.Element;
