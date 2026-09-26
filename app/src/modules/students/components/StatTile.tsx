import { Text } from 'react-native';
import { Vidro } from '@/components/ui/Vidro';
import { cn } from '@/lib/utils';

/**
 * O número do topo do perfil no kit: valor grande na cor da grandeza e o
 * rótulo em caixa alta embaixo — "Ativo · Status", "mai/26 · Desde".
 *
 * Não é o `BlocoDeMetrica`: o kit do especialista tira o ícone e pinta o
 * próprio número, para três deles caberem lado a lado.
 *
 * @example <StatTile value="Ativo" label="Status" tone="positive" />
 */
export type StatTone = 'positive' | 'warning' | 'neutral';

interface StatTileProps {
  value: string;
  label: string;
  tone?: StatTone;
}

/** Classe literal por tom: o Tailwind só gera o que aparece escrito no fonte. */
const VALUE_COLOR: Record<StatTone, string> = {
  positive: 'text-texto-saude-passos',
  warning: 'text-texto-macro-gordura',
  neutral: 'text-foreground',
};

export function StatTile({ value, label, tone = 'neutral' }: StatTileProps) {
  return (
    <Vidro classeExterna="flex-1" className="px-3 py-[0.8125rem]">
      <Text
        numberOfLines={1}
        className={cn('font-display-black text-[1.3125rem] tracking-tight', VALUE_COLOR[tone])}
      >
        {value}
      </Text>
      <Text
        numberOfLines={1}
        className="mt-0.5 text-[0.59375rem] font-bold uppercase tracking-wider text-placeholder"
      >
        {label}
      </Text>
    </Vidro>
  );
}
