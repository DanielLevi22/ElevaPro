import { BeforeAfterRow } from '@/components/ui/BeforeAfterRow';
import { FlowLabel } from '@/components/ui/FlowFrame';
import { Vidro } from '@/components/ui/Vidro';
import { formatKcal, formatKcalDelta } from '../services/formatCalories';

/**
 * A meta diária antes → depois, com o rótulo da seção: a proposta da semana e
 * o ajuste já aprovado mostram a mesma linha.
 *
 * @example <TargetChange label="Proposta" before={2150} after={2000} />
 */
export function TargetChange({
  label,
  before,
  after,
}: {
  label: string;
  before: number;
  after: number;
}) {
  return (
    <>
      <FlowLabel right="o cardápio é refeito na nova meta">{label}</FlowLabel>
      <Vidro className="px-3.5 py-0.5">
        <BeforeAfterRow
          first
          icon="locate-outline"
          title="Meta diária"
          before={formatKcal(before)}
          after={formatKcal(after)}
          badge={formatKcalDelta(after - before)}
        />
      </Vidro>
    </>
  );
}
