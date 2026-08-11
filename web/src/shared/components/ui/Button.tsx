"use client";

import { Slot } from "@radix-ui/react-slot";
import { tv, type VariantProps } from "tailwind-variants";
import { cn } from "@/lib/utils";

const button = tv({
  base: "inline-flex items-center justify-center gap-2 whitespace-nowrap font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50",
  variants: {
    variant: {
      // primary-text e nao primary: o lime puro como rotulo sobre fundo claro
      // nao alcanca contraste AA.
      primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
      secondary: "bg-surface text-foreground border border-border hover:bg-overlay-05",
      ghost: "bg-transparent text-muted-foreground hover:bg-overlay-05 hover:text-foreground",
      destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      outline: "bg-transparent text-foreground border border-border hover:bg-overlay-05",
    },
    size: {
      sm: "h-8 px-3 text-xs rounded-lg",
      md: "h-10 px-4 text-[13px] rounded-[10px]",
      lg: "h-12 px-6 text-sm rounded-xl",
      icon: "h-10 w-10 rounded-[10px]",
    },
    /** Pilula, como nas acoes rapidas e nos CTAs da landing. */
    pill: {
      true: "rounded-full",
    },
    fullWidth: {
      true: "w-full",
    },
  },
  defaultVariants: {
    variant: "primary",
    size: "md",
  },
});

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {
  asChild?: boolean;
  isLoading?: boolean;
}

/**
 * Botao do design system.
 *
 * @example
 * <Button variant="secondary" size="sm">Importar</Button>
 * <Button isLoading disabled>Salvando...</Button>
 */
export function Button({
  className,
  variant,
  size,
  pill,
  fullWidth,
  asChild = false,
  isLoading = false,
  disabled,
  children,
  type,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  const classes = cn(button({ variant, size, pill, fullWidth }), className);

  const spinner = (
    <svg
      className="animate-spin h-4 w-4 shrink-0"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  // Slot aceita um unico filho, entao o spinner nao entra no modo asChild.
  if (asChild) {
    return (
      <Comp className={classes} {...props}>
        {children}
      </Comp>
    );
  }

  return (
    <Comp
      // Sem type explicito o botao vira submit e envia o formulario que o contem.
      type={type ?? "button"}
      className={classes}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? spinner : null}
      {children}
    </Comp>
  );
}
