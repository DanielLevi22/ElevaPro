"use client";

import { tv } from "tailwind-variants";
import { cn } from "@/lib/utils";

const input = tv({
  base: "w-full rounded-lg border bg-white/5 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50",
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

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  leftIcon?: React.ReactNode;
}

export function Input({ className, error = false, leftIcon, ...props }: InputProps) {
  if (leftIcon) {
    return (
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
          {leftIcon}
        </div>
        <input
          className={cn(input({ error }), "pl-10", className)}
          aria-invalid={error}
          {...props}
        />
      </div>
    );
  }

  return (
    <input
      className={cn(input({ error }), className)}
      aria-invalid={error || undefined}
      {...props}
    />
  );
}
