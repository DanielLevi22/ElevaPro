import { Text, View } from 'react-native';
import { Chip } from '@/components/ui/Chip';
import { Vidro } from '@/components/ui/Vidro';
import { cn } from '@/lib/utils';

interface DietSummaryCardProps {
  name: string;
  subtitle: string;
  status: string;
  highlighted: boolean;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}

/** Resumo visual comum à leitura e à revisão, sem ações de edição.
 * @example <DietSummaryCard name="Plano alimentar" subtitle="Meta diária" status="Ativo" highlighted protein={120} carbs={200} fat={60} />
 */
export function DietSummaryCard({
  name,
  subtitle,
  status,
  highlighted,
  protein,
  carbs,
  fat,
}: DietSummaryCardProps) {
  return (
    <Vidro classeExterna="mt-[1.125rem]" className="p-4">
      <View className="flex-row items-start justify-between gap-2">
        <Text className="min-w-0 flex-1 font-display-black text-[1.1875rem] tracking-tight text-foreground">
          {name}
        </Text>
        <Chip tom={highlighted ? 'destaque' : 'neutro'}>{status}</Chip>
      </View>
      <Text className="mt-1 text-[0.78125rem] text-muted-foreground">{subtitle}</Text>
      <View className="mt-3.5 flex-row gap-2">
        <MacroTile
          value={protein}
          label="Proteína"
          className="text-primary-text dark:text-primary"
        />
        <MacroTile value={carbs} label="Carbo" className="text-foreground dark:text-secondary" />
        <MacroTile value={fat} label="Gordura" className="text-foreground dark:text-accent" />
      </View>
    </Vidro>
  );
}

function MacroTile({
  value,
  label,
  className,
}: {
  value: number | null;
  label: string;
  className: string;
}) {
  return (
    <View className="min-w-0 flex-1 rounded-[0.875rem] bg-glass-strong px-[0.6875rem] py-2.5">
      <Text selectable className={cn('font-display-black text-base tracking-tight', className)}>
        {value === null ? '—' : `${Math.round(value)} g`}
      </Text>
      <Text className="text-[0.59375rem] font-bold uppercase tracking-wider text-placeholder">
        {label}
      </Text>
    </View>
  );
}
