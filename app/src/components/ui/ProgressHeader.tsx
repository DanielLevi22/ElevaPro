import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { cn } from '@/lib/utils';

/**
 * O cabeçalho das telas de métricas, nos dois tamanhos do kit.
 *
 *     hub: sobretítulo 12,5 / 600; título 27 / 700
 *     nutrição em números: o mesmo, com o título em 24, que o nome é mais longo
 *     página empilhada: sobretítulo 12 / 700, maiúsculas .04em; título 21 / 700
 *
 * @example
 * <ProgressHeader size="page" eyebrow="Por exercício" title="Evolução de cargas"
 *   leading={<BotaoRedondo icone="chevron-left" … />} />
 */
interface ProgressHeaderProps {
  eyebrow: string;
  title: string;
  size: 'segment' | 'nutrition' | 'page';
  leading?: ReactNode;
  trailing?: ReactNode;
}

const TITLE_SIZE = {
  segment: 'mt-px text-[1.6875rem]',
  nutrition: 'mt-px text-[1.5rem]',
  page: 'mt-0.5 text-[1.3125rem]',
} as const;

export function ProgressHeader({ eyebrow, title, size, leading, trailing }: ProgressHeaderProps) {
  const page = size === 'page';
  return (
    <View className="flex-row items-center gap-3 pt-1.5">
      {leading}
      <View className="min-w-0 flex-1">
        <Text
          className={cn(
            'text-hero-secondary',
            page
              ? 'text-[0.75rem] font-bold uppercase tracking-[0.04em]'
              : 'text-[0.78125rem] font-semibold'
          )}
        >
          {eyebrow}
        </Text>
        <Text
          accessibilityRole="header"
          className={cn('font-bold tracking-tight text-hero', TITLE_SIZE[size])}
        >
          {title}
        </Text>
      </View>
      {trailing}
    </View>
  );
}
