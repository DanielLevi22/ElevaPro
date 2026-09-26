import { Text } from 'react-native';
import { cn } from '@/lib/utils';
import { Vidro } from './Vidro';

/**
 * O número em fila do kit do especialista: valor grande na cor da grandeza e o
 * rótulo em caixa alta embaixo — "24 Alunos ativos", "87% Aderência", "Ativo Status".
 *
 * Não é o `BlocoDeMetrica`: o kit do especialista tira o ícone e pinta o
 * próprio número, para três deles caberem lado a lado.
 *
 * @example <StatTile value="87%" label="Aderência" tone="info" size="lg" />
 */
export type StatTone = 'positive' | 'brand' | 'info' | 'warning' | 'danger' | 'neutral';

interface StatTileProps {
  value: string;
  label: string;
  tone?: StatTone;
  /** `lg` é o 26 do painel; `md`, o 21 das telas do aluno. */
  size?: 'md' | 'lg';
}

/** Classe literal por tom: o Tailwind só gera o que aparece escrito no fonte. */
const VALUE_COLOR: Record<StatTone, string> = {
  positive: 'text-texto-saude-passos',
  brand: 'text-primary-text',
  info: 'text-texto-cardio-ritmo',
  warning: 'text-texto-macro-gordura',
  danger: 'text-texto-perigo',
  neutral: 'text-foreground',
};

const VALUE_SIZE = { md: 'text-[1.3125rem]', lg: 'text-[1.625rem]' } as const;

export function StatTile({ value, label, tone = 'neutral', size = 'md' }: StatTileProps) {
  return (
    <Vidro classeExterna="flex-1" className="px-3 py-[0.8125rem]">
      <Text
        numberOfLines={1}
        className={cn('font-display-black tracking-tight', VALUE_SIZE[size], VALUE_COLOR[tone])}
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
