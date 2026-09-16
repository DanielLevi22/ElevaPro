import type { ReactNode } from 'react';
import { Text } from 'react-native';
import { Vidro } from '@/components/ui/Vidro';
import { CardTitle } from './CardTitle';

/**
 * O cartão de gráfico das telas de métricas: vidro com padding 16, 12 abaixo do
 * anterior, título e nota do kit.
 *
 * @example <ChartCard title="Macros" note="Média diária dos dias com registro"><Donut … /></ChartCard>
 */
interface ChartCardProps {
  title: string;
  note?: string;
  trailing?: ReactNode;
  children: ReactNode;
}

export function ChartCard({ title, note, trailing, children }: ChartCardProps) {
  return (
    <Vidro classeExterna="mt-3" className="p-4">
      <CardTitle note={note} trailing={trailing}>
        {title}
      </CardTitle>
      {children}
    </Vidro>
  );
}

/**
 * O cartão do que ainda não tem dado: diz o que falta e de onde o número vem, em
 * vez de mostrar um gráfico vazio que leria como zero.
 *
 * @example <EmptyCard>Nenhuma série com carga neste período.</EmptyCard>
 */
export function EmptyCard({ children }: { children: string }) {
  return (
    <Vidro classeExterna="mt-3" className="items-center p-6">
      <Text className="text-center text-[0.8125rem] text-muted-foreground">{children}</Text>
    </Vidro>
  );
}
