import { TRAINING_METHODS } from "@elevapro/shared";
import { cn } from "@/shared/utils/cn";
import { METHOD_GROUP_TONE } from "./methodTone";

const BY_ID = new Map(TRAINING_METHODS.map((m) => [m.id, m]));

interface MethodBadgeProps {
  /** Identificador do catálogo (`rest_pause`). */
  method: string;
  className?: string;
}

/**
 * A etiqueta colorida de uma técnica, com a cor do grupo dela.
 *
 * @example <MethodBadge method="rest_pause" />
 */
export function MethodBadge({ method, className }: MethodBadgeProps) {
  const found = BY_ID.get(method);
  if (!found) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap",
        METHOD_GROUP_TONE[found.group],
        className,
      )}
    >
      {found.label}
    </span>
  );
}
