import { TRAINING_METHODS, type TrainingMethod, type TrainingMethodGroup } from '@elevapro/shared';
import { Badge } from '@/components/ui/Badge';

const BY_ID = new Map(TRAINING_METHODS.map((m) => [m.id, m]));

/**
 * Tom do Badge por grupo de técnica — o mesmo agrupamento do web, que pinta com
 * classes próprias (`METHOD_GROUP_TONE`): o Badge do app só aceita estes tons.
 */
const GROUP_TONE: Record<TrainingMethodGroup, 'primary' | 'secondary' | 'warning' | 'neutral'> = {
  structure: 'primary',
  execution: 'secondary',
  pairing: 'neutral',
  scheme: 'warning',
  timed: 'neutral',
};

/** As técnicas do catálogo pelos ids, na ordem; id desconhecido some. */
export function methodsByIds(ids: readonly string[]): TrainingMethod[] {
  return ids.flatMap((id) => BY_ID.get(id) ?? []);
}

/**
 * A etiqueta de uma técnica, na cor do grupo dela.
 *
 * @example <MethodTag method={method} />
 */
export function MethodTag({ method }: { method: TrainingMethod }) {
  return (
    <Badge tone={GROUP_TONE[method.group]} dot={false}>
      {method.label}
    </Badge>
  );
}
