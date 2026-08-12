export type StatusTone = "success" | "warning" | "info" | "danger" | "neutral";

const TONE: Record<StatusTone, string> = {
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  info: "bg-secondary/10 text-secondary border-secondary/20",
  danger: "bg-destructive/10 text-destructive border-destructive/20",
  neutral: "bg-muted text-muted-foreground border-border",
};

interface StatusBadgeProps {
  children: React.ReactNode;
  tone?: StatusTone;
}

/**
 * Pilula de status. Os tons sao semanticos, nao cores: trocar o visual de
 * "ativo" em todo o produto e mudar uma linha aqui.
 *
 * @example
 * <StatusBadge tone="success">Ativo</StatusBadge>
 */
export function StatusBadge({ children, tone = "neutral" }: StatusBadgeProps) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-bold whitespace-nowrap ${TONE[tone]}`}
    >
      {children}
    </span>
  );
}
