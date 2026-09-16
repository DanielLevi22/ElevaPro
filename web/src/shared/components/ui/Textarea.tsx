"use client";

import { tv } from "tailwind-variants";
import { cn } from "@/shared/utils/cn";

const textarea = tv({
  base: "w-full resize-y rounded-lg border bg-white/5 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50",
  variants: {
    error: {
      true: "border-red-500/70 focus:ring-red-500",
      false: "border-white/10",
    },
  },
  defaultVariants: {
    error: false,
  },
});

/**
 * Campo de texto longo, no mesmo traço do `Input`.
 *
 * Nasceu com a nota do especialista (#312), que era o décimo `<textarea>` cru do
 * dashboard — cada um com a própria borda e o próprio foco.
 *
 * @example <Textarea value={draft} onChange={…} rows={4} placeholder="…" />
 */
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export function Textarea({ className, error = false, ...props }: TextareaProps) {
  return (
    <textarea className={cn(textarea({ error }), className)} aria-invalid={error} {...props} />
  );
}
